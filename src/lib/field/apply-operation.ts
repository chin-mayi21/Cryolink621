import {
  AuditAction,
  IncidentSeverity,
  IncidentStatus,
  InventoryTransactionType,
  SyncOperationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkInStatusForSubmission } from "@/lib/field/check-in-status";
import {
  checkInPayloadSchema,
  deviceHeartbeatPayloadSchema,
  inventoryConsumptionPayloadSchema,
  supplyRequestPayloadSchema,
  sosPayloadSchema,
  type FieldOperationType,
} from "@/lib/field/operations";

export type ApplyContext = {
  userId: string;
  personnelId: string;
  expeditionId: string;
};

export async function applyFieldOperation(
  clientOperationId: string,
  operationType: FieldOperationType,
  payload: Record<string, unknown>,
  ctx: ApplyContext
): Promise<{ status: "applied" | "duplicate"; entityId?: string }> {
  const existing = await prisma.syncOperation.findUnique({
    where: { clientOperationId },
  });
  if (existing?.status === SyncOperationStatus.SYNCED) {
    return { status: "duplicate" };
  }

  let syncRow: Awaited<ReturnType<typeof prisma.syncOperation.upsert>> | null = null;
  try {
    syncRow = await prisma.syncOperation.upsert({
      where: { clientOperationId },
      update: {
        userId: ctx.userId,
        expeditionId: ctx.expeditionId,
        operationType,
        payload: JSON.stringify(payload),
        status: SyncOperationStatus.SYNCING,
        errorMessage: null,
      },
      create: {
        clientOperationId,
        userId: ctx.userId,
        expeditionId: ctx.expeditionId,
        operationType,
        payload: JSON.stringify(payload),
        status: SyncOperationStatus.SYNCING,
      },
    });
  } catch (err) {
    const duplicate = await prisma.syncOperation.findUnique({
      where: { clientOperationId },
    });
    if (!duplicate) throw err;
    if (duplicate.status === SyncOperationStatus.SYNCED) {
      return { status: "duplicate" };
    }
    syncRow = duplicate;
  }

  try {
    const entityId = await executeOperation(operationType, payload, ctx);
    await prisma.syncOperation.update({
      where: { id: syncRow.id },
      data: { status: SyncOperationStatus.SYNCED, syncedAt: new Date(), errorMessage: null },
    });
    return { status: "applied", entityId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await prisma.syncOperation.update({
      where: { id: syncRow.id },
      data: { status: SyncOperationStatus.FAILED, errorMessage: message },
    });
    throw err;
  }
}

async function executeOperation(
  operationType: FieldOperationType,
  payload: Record<string, unknown>,
  ctx: ApplyContext
): Promise<string | undefined> {
  switch (operationType) {
    case "CHECK_IN":
      return applyCheckIn(payload, ctx);
    case "SOS":
      return applySos(payload, ctx);
    case "INVENTORY_CONSUMPTION":
      return applyInventoryConsumption(payload, ctx);
    case "SUPPLY_REQUEST":
      return applySupplyRequest(payload, ctx);
    case "DEVICE_HEARTBEAT":
      return applyHeartbeat(payload, ctx);
    default:
      throw new Error(`Unknown operation: ${operationType}`);
  }
}

async function assertMissionMember(missionId: string, personnelId: string, expeditionId: string) {
  const mission = await prisma.mission.findFirst({
    where: {
      id: missionId,
      expeditionId,
      personnel: { some: { personnelId } },
    },
  });
  if (!mission) throw new Error("Mission not found or not assigned to you.");
  return mission;
}

async function applyCheckIn(payload: Record<string, unknown>, ctx: ApplyContext) {
  const data = checkInPayloadSchema.parse(payload);
  const mission = await assertMissionMember(data.missionId, ctx.personnelId, ctx.expeditionId);

  const status = checkInStatusForSubmission(mission.lastCheckInAt, mission.checkInIntervalMinutes);
  const lat = data.simulatedLatitude ?? -71.02;
  const lng = data.simulatedLongitude ?? 12.14;

  const checkIn = await prisma.$transaction(async (tx) => {
    const row = await tx.checkIn.create({
      data: {
        missionId: data.missionId,
        personnelId: ctx.personnelId,
        status,
        message: data.message,
        simulatedLatitude: lat,
        simulatedLongitude: lng,
        isLocationSimulated: true,
      },
    });
    await tx.mission.update({
      where: { id: data.missionId },
      data: { lastCheckInAt: new Date() },
    });
    await tx.personnel.update({
      where: { id: ctx.personnelId },
      data: { lastDeviceSyncAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: ctx.userId,
        expeditionId: ctx.expeditionId,
        entityType: "CheckIn",
        entityId: row.id,
        action: AuditAction.CREATE,
        newState: JSON.stringify({ status, missionId: data.missionId }),
      },
    });
    return row;
  });

  return checkIn.id;
}

async function applySos(payload: Record<string, unknown>, ctx: ApplyContext) {
  const data = sosPayloadSchema.parse(payload);
  let missionId = data.missionId;
  if (missionId) {
    await assertMissionMember(missionId, ctx.personnelId, ctx.expeditionId);
  } else {
    const active = await prisma.mission.findFirst({
      where: {
        expeditionId: ctx.expeditionId,
        status: { in: ["ACTIVE", "OVERDUE"] },
        personnel: { some: { personnelId: ctx.personnelId } },
      },
      orderBy: { plannedDepartAt: "desc" },
    });
    missionId = active?.id;
  }

  const lat = data.simulatedLatitude ?? -71.02;
  const lng = data.simulatedLongitude ?? 12.14;
  const now = new Date();
  const existingIncident = await prisma.incident.findFirst({
    where: {
      expeditionId: ctx.expeditionId,
      missionId: missionId ?? null,
      severity: IncidentSeverity.CRITICAL,
      status: {
        in: [
          IncidentStatus.NEW,
          IncidentStatus.ACKNOWLEDGED,
          IncidentStatus.INVESTIGATING,
          IncidentStatus.RESPONSE_ACTIVE,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingIncident) {
    await prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: existingIncident.id },
        data: {
          summary: data.message,
          currentStatusSummary: "SOS update received from field device — HQ escalation required.",
          lastConfirmedLat: lat,
          lastConfirmedLng: lng,
          lastConfirmedAt: now,
        },
      });
      await tx.personnel.update({
        where: { id: ctx.personnelId },
        data: { lastDeviceSyncAt: now },
      });
      await tx.auditEvent.create({
        data: {
          actorUserId: ctx.userId,
          expeditionId: ctx.expeditionId,
          entityType: "Incident",
          entityId: existingIncident.id,
          action: AuditAction.UPDATE,
          previousState: JSON.stringify({ summary: existingIncident.summary }),
          newState: JSON.stringify({ summary: data.message, source: "FIELD_SOS_UPDATE" }),
        },
      });
    });
    return existingIncident.id;
  }

  const incident = await prisma.$transaction(async (tx) => {
    const row = await tx.incident.create({
      data: {
        expeditionId: ctx.expeditionId,
        missionId,
        title: "Field SOS — hold-to-confirm",
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.NEW,
        summary: data.message,
        lastConfirmedLat: lat,
        lastConfirmedLng: lng,
        lastConfirmedAt: now,
        currentStatusSummary: "SOS received from field device — HQ escalation required.",
      },
    });
    await tx.personnel.update({
      where: { id: ctx.personnelId },
      data: { lastDeviceSyncAt: now },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: ctx.userId,
        expeditionId: ctx.expeditionId,
        entityType: "Incident",
        entityId: row.id,
        action: AuditAction.CREATE,
        newState: JSON.stringify({ severity: "CRITICAL", source: "FIELD_SOS" }),
      },
    });
    return row;
  });

  return incident.id;
}

async function applyInventoryConsumption(payload: Record<string, unknown>, ctx: ApplyContext) {
  const data = inventoryConsumptionPayloadSchema.parse(payload);
  const person = await prisma.personnel.findUnique({
    where: { id: ctx.personnelId },
    include: { team: true },
  });
  if (!person?.team?.stationId) {
    throw new Error("Your team has no station — cannot log supplies.");
  }

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: data.inventoryItemId,
      expeditionId: ctx.expeditionId,
      stationId: person.team.stationId,
    },
  });
  if (!item) throw new Error("Supply item not found at your station.");

  const tx = await prisma.$transaction(async (db) => {
    const row = await db.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: InventoryTransactionType.CONSUMPTION,
        quantity: -data.quantity,
        reference: `FIELD-${person.employeeCode}`,
        note: data.note,
        actorUserId: ctx.userId,
      },
    });
    await db.auditEvent.create({
      data: {
        actorUserId: ctx.userId,
        expeditionId: ctx.expeditionId,
        entityType: "InventoryTransaction",
        entityId: row.id,
        action: AuditAction.CREATE,
        newState: JSON.stringify({ quantity: -data.quantity, sku: item.sku }),
      },
    });
    await db.personnel.update({
      where: { id: ctx.personnelId },
      data: { lastDeviceSyncAt: new Date() },
    });
    return row;
  });

  return tx.id;
}

async function applySupplyRequest(payload: Record<string, unknown>, ctx: ApplyContext) {
  const data = supplyRequestPayloadSchema.parse(payload);
  const person = await prisma.personnel.findUnique({
    where: { id: ctx.personnelId },
    include: { team: true },
  });
  if (!person?.team?.stationId) {
    throw new Error("Your team has no station — cannot request supplies.");
  }

  const request = await prisma.$transaction(async (tx) => {
    const row = await tx.supplyRequest.create({
      data: {
        expeditionId: ctx.expeditionId,
        stationId: person.team!.stationId!,
        personnelId: person.id,
        requestedByUserId: ctx.userId,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        note: data.note || null,
      },
    });
    await tx.personnel.update({
      where: { id: person.id },
      data: { lastDeviceSyncAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: ctx.userId,
        expeditionId: ctx.expeditionId,
        entityType: "SupplyRequest",
        entityId: row.id,
        action: AuditAction.CREATE,
        newState: JSON.stringify({ itemName: row.itemName, quantity: row.quantity, unit: row.unit }),
      },
    });
    return row;
  });

  return request.id;
}

async function applyHeartbeat(payload: Record<string, unknown>, ctx: ApplyContext) {
  deviceHeartbeatPayloadSchema.parse(payload);
  await prisma.personnel.update({
    where: { id: ctx.personnelId },
    data: { lastDeviceSyncAt: new Date() },
  });
  return ctx.personnelId;
}
