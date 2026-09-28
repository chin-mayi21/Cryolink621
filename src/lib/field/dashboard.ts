import { MissionStatus, PersonnelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FieldDashboard = {
  personnel: {
    fullName: string;
    employeeCode: string;
    roleTitle: string;
    status: PersonnelStatus;
    teamName: string | null;
    lastDeviceSyncAt: string | null;
  };
  expedition: {
    code: string;
    name: string;
    missionDay: number | null;
    missionTotalDays: number | null;
  };
  safety: {
    tone: "safe" | "caution" | "sos";
    headline: string;
    detail: string;
    openSosIncidentId: string | null;
  };
  activeMission: {
    id: string;
    code: string;
    title: string;
    status: MissionStatus;
    checkInIntervalMinutes: number;
    lastCheckInAt: string | null;
    expectedReturnAt: string;
    briefingNotes: string | null;
  } | null;
  recentCheckIns: {
    id: string;
    status: string;
    message: string | null;
    checkedInAt: string;
    personnelName: string;
    simulatedLatitude: number | null;
    simulatedLongitude: number | null;
  }[];
  station: {
    name: string;
    code: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  stationCode: string | null;
};

export async function getFieldDashboard(personnelId: string): Promise<FieldDashboard | null> {
  const personnel = await prisma.personnel.findUnique({
    where: { id: personnelId },
    include: {
      team: true,
      expedition: true,
    },
  });
  if (!personnel) return null;

  const stationRecord = personnel.team?.stationId
    ? await prisma.station.findUnique({ where: { id: personnel.team.stationId } })
    : null;

  let missionDay: number | null = null;
  let missionTotalDays: number | null = null;
  const exp = personnel.expedition;
  if (exp.plannedStart && exp.plannedEnd) {
    missionTotalDays = Math.ceil(
      (exp.plannedEnd.getTime() - exp.plannedStart.getTime()) / 86400000
    );
    missionDay = Math.max(1, Math.ceil((Date.now() - exp.plannedStart.getTime()) / 86400000));
  }

  const missions = await prisma.mission.findMany({
    where: {
      expeditionId: personnel.expeditionId,
      personnel: { some: { personnelId } },
      status: { in: [MissionStatus.ACTIVE, MissionStatus.OVERDUE, MissionStatus.PLANNED] },
    },
    orderBy: { plannedDepartAt: "desc" },
  });

  const activeMission =
    missions.find((m) => m.status === MissionStatus.ACTIVE) ??
    missions.find((m) => m.status === MissionStatus.OVERDUE) ??
    missions[0] ??
    null;

  const openSos = await prisma.incident.findFirst({
    where: {
      expeditionId: personnel.expeditionId,
      severity: "CRITICAL",
      status: { in: ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESPONSE_ACTIVE"] },
      ...(activeMission ? { missionId: activeMission.id } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  let safetyTone: FieldDashboard["safety"]["tone"] = "safe";
  let headline = "Safe";
  let detail = "Check-ins on schedule for your assigned mission.";
  if (openSos) {
    safetyTone = "sos";
    headline = "SOS signal active";
    detail = openSos.currentStatusSummary ?? openSos.summary ?? "HQ has been notified.";
  } else if (activeMission?.status === MissionStatus.OVERDUE) {
    safetyTone = "caution";
    headline = "Return window exceeded";
    detail = "Submit a check-in when safe. HQ may open a comms check — not auto-SOS.";
  } else if (activeMission?.lastCheckInAt) {
    const overdueMs = activeMission.checkInIntervalMinutes * 60 * 1000 * 2;
    if (Date.now() - activeMission.lastCheckInAt.getTime() > overdueMs) {
      safetyTone = "caution";
      headline = "Check-in overdue";
      detail = `Interval ${activeMission.checkInIntervalMinutes}m — last check-in is stale.`;
    }
  }

  const recentCheckIns = activeMission
    ? await prisma.checkIn.findMany({
        where: { missionId: activeMission.id },
        orderBy: { checkedInAt: "desc" },
        take: 12,
        include: { personnel: { select: { fullName: true } } },
      })
    : [];

  return {
    personnel: {
      fullName: personnel.fullName,
      employeeCode: personnel.employeeCode,
      roleTitle: personnel.roleTitle,
      status: personnel.status,
      teamName: personnel.team?.name ?? null,
      lastDeviceSyncAt: personnel.lastDeviceSyncAt?.toISOString() ?? null,
    },
    expedition: {
      code: exp.code,
      name: exp.name,
      missionDay,
      missionTotalDays,
    },
    safety: {
      tone: safetyTone,
      headline,
      detail,
      openSosIncidentId: openSos?.id ?? null,
    },
    activeMission: activeMission
      ? {
          id: activeMission.id,
          code: activeMission.code,
          title: activeMission.title,
          status: activeMission.status,
          checkInIntervalMinutes: activeMission.checkInIntervalMinutes,
          lastCheckInAt: activeMission.lastCheckInAt?.toISOString() ?? null,
          expectedReturnAt: activeMission.expectedReturnAt.toISOString(),
          briefingNotes: activeMission.briefingNotes,
        }
      : null,
    recentCheckIns: recentCheckIns.map((c) => ({
      id: c.id,
      status: c.status,
      message: c.message,
      checkedInAt: c.checkedInAt.toISOString(),
      personnelName: c.personnel.fullName,
      simulatedLatitude: c.simulatedLatitude,
      simulatedLongitude: c.simulatedLongitude,
    })),
    station: stationRecord
      ? {
          name: stationRecord.name,
          code: stationRecord.code,
          latitude: stationRecord.latitude,
          longitude: stationRecord.longitude,
        }
      : null,
    stationCode: stationRecord?.code ?? null,
  };
}

export async function listFieldInventory(personnelId: string) {
  const person = await prisma.personnel.findUnique({
    where: { id: personnelId },
    include: { team: true },
  });
  if (!person?.team?.stationId) return [];

  const items = await prisma.inventoryItem.findMany({
    where: { stationId: person.team.stationId },
    include: { transactions: { select: { quantity: true } } },
    orderBy: { sku: "asc" },
  });

  return items.map((item) => {
    const onHand = item.transactions.reduce((sum, t) => sum + Number(t.quantity), 0);
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      onHand,
    };
  });
}

export async function listFieldAssets(personnelId: string) {
  const person = await prisma.personnel.findUnique({
    where: { id: personnelId },
    include: { team: true },
  });
  if (!person?.team?.stationId) return [];

  const assets = await prisma.asset.findMany({
    where: { stationId: person.team.stationId },
    orderBy: { assetTag: "asc" },
  });

  return assets.map((a) => ({
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    category: a.category,
    status: a.status,
  }));
}
