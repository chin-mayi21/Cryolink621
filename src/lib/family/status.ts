import { MissionStatus, PersonnelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Family-safe view — never include HQ-only fields (mission codes, briefing, audit, other personnel). */
export type FamilyStatusBundle = {
  member: {
    fullName: string;
    roleLabel: string;
    deploymentLabel: string;
  };
  expedition: {
    name: string;
    season: string;
    missionDay: number | null;
    missionTotalDays: number | null;
  };
  wellness: {
    tone: "safe" | "attention" | "emergency";
    headline: string;
    detail: string;
    lastSharedAt: string | null;
  };
  lastCheckIn: {
    checkedInAt: string;
    statusLabel: string;
    message: string | null;
    positionLabel: string;
    simulatedLatitude: number | null;
    simulatedLongitude: number | null;
  } | null;
  recentCheckIns: {
    checkedInAt: string;
    statusLabel: string;
    message: string | null;
  }[];
  familyUpdates: {
    id: string;
    message: string;
    createdAt: string;
    authorLabel: string;
  }[];
};

function deploymentLabel(
  personnelStatus: PersonnelStatus,
  missionStatus: MissionStatus | null
): string {
  if (missionStatus === MissionStatus.ACTIVE) return "On field deployment";
  if (missionStatus === MissionStatus.OVERDUE) return "Field deployment — return window under review";
  if (missionStatus === MissionStatus.PLANNED) return "Scheduled for upcoming deployment";
  if (personnelStatus === PersonnelStatus.ON_MISSION) return "On mission";
  if (personnelStatus === PersonnelStatus.EVACUATED) return "Evacuated — HQ coordinating";
  return "At station / standby";
}

function statusLabelForCheckIn(status: string): string {
  if (status === "ON_TIME") return "On time";
  if (status === "LATE") return "Delayed";
  if (status === "MISSED") return "Missed window";
  return status;
}

/**
 * Load family dashboard for exactly one linked personnel record.
 * Call only with `session.nextOfKinForId` — never a client-supplied id without matching session.
 */
export async function getFamilyStatusForLinkedMember(
  linkedPersonnelId: string
): Promise<FamilyStatusBundle | null> {
  const personnel = await prisma.personnel.findUnique({
    where: { id: linkedPersonnelId },
    include: {
      expedition: true,
      familyContact: {
        include: {
          updates: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { author: { select: { name: true, role: true } } },
          },
        },
      },
    },
  });
  if (!personnel) return null;

  const missions = await prisma.mission.findMany({
    where: {
      expeditionId: personnel.expeditionId,
      personnel: { some: { personnelId: linkedPersonnelId } },
      status: { in: [MissionStatus.ACTIVE, MissionStatus.OVERDUE, MissionStatus.PLANNED] },
    },
    orderBy: { plannedDepartAt: "desc" },
  });

  const focusMission =
    missions.find((m) => m.status === MissionStatus.ACTIVE) ??
    missions.find((m) => m.status === MissionStatus.OVERDUE) ??
    missions[0] ??
    null;

  const openEmergency = focusMission
    ? await prisma.incident.findFirst({
        where: {
          missionId: focusMission.id,
          severity: "CRITICAL",
          status: { in: ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESPONSE_ACTIVE"] },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const checkIns = await prisma.checkIn.findMany({
    where: { personnelId: linkedPersonnelId },
    orderBy: { checkedInAt: "desc" },
    take: 6,
  });

  const last = checkIns[0] ?? null;

  let tone: FamilyStatusBundle["wellness"]["tone"] = "safe";
  let headline = "Safe";
  let detail =
    "Last confirmed check-in is within the expected window. This summary excludes live operational tracking.";
  let lastSharedAt = last?.checkedInAt.toISOString() ?? personnel.lastDeviceSyncAt?.toISOString() ?? null;

  if (openEmergency) {
    tone = "emergency";
    headline = "Emergency — HQ notified";
    detail =
      "An emergency signal was received. Response teams are engaged. Further details will be shared through official channels.";
    lastSharedAt = openEmergency.createdAt.toISOString();
  } else if (focusMission?.status === MissionStatus.OVERDUE) {
    tone = "attention";
    headline = "Check-in attention";
    detail =
      "Return window has passed. HQ is monitoring — this is not an automatic distress signal unless you receive separate official contact.";
  } else if (focusMission && focusMission.lastCheckInAt) {
    const staleMs = focusMission.checkInIntervalMinutes * 60 * 1000 * 2;
    if (Date.now() - focusMission.lastCheckInAt.getTime() > staleMs) {
      tone = "attention";
      headline = "Check-in overdue";
      detail = "No recent confirmed check-in. HQ may reach out independently.";
    }
  }

  const exp = personnel.expedition;
  let missionDay: number | null = null;
  let missionTotalDays: number | null = null;
  if (exp.plannedStart && exp.plannedEnd) {
    missionTotalDays = Math.ceil(
      (exp.plannedEnd.getTime() - exp.plannedStart.getTime()) / 86400000
    );
    missionDay = Math.max(1, Math.ceil((Date.now() - exp.plannedStart.getTime()) / 86400000));
  }

  return {
    member: {
      fullName: personnel.fullName,
      roleLabel: personnel.roleTitle,
      deploymentLabel: deploymentLabel(personnel.status, focusMission?.status ?? null),
    },
    expedition: {
      name: exp.name,
      season: exp.season,
      missionDay,
      missionTotalDays,
    },
    wellness: {
      tone,
      headline,
      detail,
      lastSharedAt,
    },
    lastCheckIn: last
      ? {
          checkedInAt: last.checkedInAt.toISOString(),
          statusLabel: statusLabelForCheckIn(last.status),
          message: last.message,
          positionLabel: last.isLocationSimulated ? "Simulated — last confirmed" : "Last confirmed",
          simulatedLatitude: last.simulatedLatitude,
          simulatedLongitude: last.simulatedLongitude,
        }
      : null,
    recentCheckIns: checkIns.map((c) => ({
      checkedInAt: c.checkedInAt.toISOString(),
      statusLabel: statusLabelForCheckIn(c.status),
      message: c.message,
    })),
    familyUpdates: personnel.familyContact?.updates.map((update) => ({
      id: update.id,
      message: update.message,
      createdAt: update.createdAt.toISOString(),
      authorLabel: update.author.role === "FIELD_PERSONNEL" ? `${update.author.name} · Field personnel` : "HQ",
    })) ?? [],
  };
}
