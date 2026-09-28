import { prisma } from "@/lib/prisma";
import { fetchAttentionItems, fetchResourceHealth } from "@/lib/hq/attention";
import { fetchActivityFeed } from "@/lib/hq/activity-feed";

export async function fetchOverviewBundle(expeditionIds: string[]) {
  const [attention, feed, resource, expedition, personnelCount, activeMissionCount] = await Promise.all([
    fetchAttentionItems(expeditionIds),
    fetchActivityFeed(expeditionIds),
    fetchResourceHealth(expeditionIds),
    expeditionIds[0]
      ? prisma.expedition.findUnique({ where: { id: expeditionIds[0] } })
      : Promise.resolve(null),
    prisma.personnel.count({ where: { expeditionId: { in: expeditionIds } } }),
    prisma.mission.count({
      where: { expeditionId: { in: expeditionIds }, status: "ACTIVE" },
    }),
  ]);

  let missionDay: number | null = null;
  let missionTotalDays: number | null = null;
  if (expedition?.plannedStart && expedition?.plannedEnd) {
    const total = Math.ceil(
      (expedition.plannedEnd.getTime() - expedition.plannedStart.getTime()) / (86400000)
    );
    const current = Math.ceil((Date.now() - expedition.plannedStart.getTime()) / 86400000);
    missionDay = Math.max(1, current);
    missionTotalDays = total;
  }

  const positions = await prisma.checkIn.findMany({
    where: {
      mission: { expeditionId: { in: expeditionIds } },
      simulatedLatitude: { not: null },
    },
    orderBy: { checkedInAt: "desc" },
    take: 6,
    include: { personnel: true, mission: { include: { team: true } } },
  });

  const positionRows = positions.map((p) => ({
    id: p.id,
    team: p.mission.team.name,
    missionCode: p.mission.code,
    personnel: p.personnel.fullName,
    checkedInAt: p.checkedInAt.toISOString(),
    lat: `${p.simulatedLatitude?.toFixed(2)}°`,
    lng: `${p.simulatedLongitude?.toFixed(2)}°`,
  }));

  return {
    attention,
    feed,
    resource,
    expedition,
    personnelCount,
    activeMissionCount,
    missionDay,
    missionTotalDays,
    positionRows,
  };
}
