import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionUser, requireHqOfficial } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Z0-9][A-Z0-9-]*$/),
  name: z.string().min(3),
  season: z.string().min(4),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  description: z.string().trim().min(2),
  research: z.string().trim().min(2),
  locations: z.array(z.object({ name: z.string().trim().min(2), code: z.string().trim().min(2) })).min(1),
  teams: z.array(z.object({
    name: z.string().trim().min(2),
    callsign: z.string().trim(),
    locationIndex: z.number().int().nonnegative(),
  })).min(1),
  personnel: z.array(z.object({
    fullName: z.string().trim().min(2),
    roleTitle: z.string().trim().min(2),
    teamIndex: z.number().int().nonnegative(),
  })).min(1),
  inventory: z.array(z.object({
    itemName: z.string().trim().min(2),
    quantity: z.number().positive(),
    unit: z.string().trim().min(1),
    note: z.string().trim(),
  })).min(1),
}).superRefine((data, context) => {
  if (data.endDate < data.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
  }
  data.teams.forEach((team, index) => {
    if (team.locationIndex >= data.locations.length) {
      context.addIssue({ code: "custom", path: ["teams", index, "locationIndex"], message: "Select a valid location." });
    }
  });
  data.personnel.forEach((person, index) => {
    if (person.teamIndex >= data.teams.length) {
      context.addIssue({ code: "custom", path: ["personnel", index, "teamIndex"], message: "Select a valid team." });
    }
  });
});

export async function POST(request: Request) {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.expedition.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json({ error: "Expedition code already exists." }, { status: 409 });
  }

  const expedition = await prisma.$transaction(async (tx) => {
    const ex = await tx.expedition.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        season: parsed.data.season,
        description: parsed.data.description,
        destination: parsed.data.locations.map((location) => location.name).join(", "),
        objectives: parsed.data.research,
        plannedStart: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
        plannedEnd: new Date(`${parsed.data.endDate}T23:59:59.999Z`),
        status: "DRAFT",
        readinessItems: {
          create: [
            { key: "personnel_roster", label: "Personnel roster approved" },
            { key: "cargo_manifest", label: "Outbound cargo manifest verified" },
            { key: "medical_clearance", label: "Medical clearance complete" },
            { key: "comms_plan", label: "Communications plan signed off" },
            { key: "emergency_contacts", label: "Emergency contacts & response process" },
          ],
        },
      },
    });

    const stations = [];
    for (const location of parsed.data.locations) {
      stations.push(await tx.station.create({
        data: {
          expeditionId: ex.id,
          name: location.name,
          code: location.code.toUpperCase(),
        },
      }));
    }

    const teams = [];
    for (const team of parsed.data.teams) {
      teams.push(await tx.team.create({
        data: {
          expeditionId: ex.id,
          stationId: stations[team.locationIndex].id,
          name: team.name,
          callsign: team.callsign || null,
        },
      }));
    }

    for (const [index, person] of parsed.data.personnel.entries()) {
      await tx.personnel.create({
        data: {
          expeditionId: ex.id,
          teamId: teams[person.teamIndex].id,
          employeeCode: `${ex.code}-P${String(index + 1).padStart(3, "0")}`,
          fullName: person.fullName,
          roleTitle: person.roleTitle,
        },
      });
    }

    await tx.expeditionInventoryNeed.createMany({
      data: parsed.data.inventory.map((item) => ({
        expeditionId: ex.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note || null,
      })),
    });

    await tx.userExpeditionScope.create({
      data: { userId: session.id, expeditionId: ex.id },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: session.id,
        expeditionId: ex.id,
        entityType: "Expedition",
        entityId: ex.id,
        action: "CREATE",
        newState: JSON.stringify({
          code: ex.code,
          locations: stations.length,
          teams: teams.length,
          personnel: parsed.data.personnel.length,
          inventoryNeeds: parsed.data.inventory.length,
        }),
      },
    });
    return ex;
  });

  return NextResponse.json({ expedition }, { status: 201 });
}

export async function GET() {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const expeditions = await prisma.expedition.findMany({
    where: { id: { in: session.expeditionIds } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ expeditions });
}
