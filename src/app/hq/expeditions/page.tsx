import { HqPageShell } from "@/components/layout/hq-page-shell";
import { CreateExpeditionCard } from "@/components/hq/expedition/create-expedition-card";
import { ExpeditionDraftList } from "@/components/hq/expedition/expedition-draft-list";
import { explainExpeditionReadiness } from "@/lib/expedition/readiness-explained";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type HqExpeditionsPageProps = {
  searchParams: Promise<{ expeditionId?: string }>;
};

export default async function HqExpeditionsPage({ searchParams }: HqExpeditionsPageProps) {
  const session = await getSession();
  if (!session || session.role !== "OPERATIONS_OFFICIAL") redirect("/");
  const { expeditionId: focusExpeditionId } = await searchParams;

  const expeditions = await prisma.expedition.findMany({
    where: { id: { in: session.expeditionIds } },
    orderBy: { createdAt: "desc" },
    include: {
      stations: { select: { id: true, name: true, code: true } },
      teams: { include: { station: { select: { name: true } } } },
      personnel: { include: { team: { select: { name: true } } } },
      inventoryNeeds: { orderBy: { createdAt: "asc" } },
      readinessItems: { orderBy: { key: "asc" } },
    },
  });
  const expeditionSummaries = await Promise.all(expeditions.map(async (expedition) => {
    const readiness = await explainExpeditionReadiness(expedition.id);
    return {
      ...expedition,
      plannedStart: expedition.plannedStart?.toISOString() ?? null,
      plannedEnd: expedition.plannedEnd?.toISOString() ?? null,
      stations: expedition.stations.map(({ id, name, code }) => ({ id, name, code })),
      teams: expedition.teams.map(({ id, name, callsign, station }) => ({ id, name, callsign, stationName: station?.name ?? null })),
      personnel: expedition.personnel.map(({ id, fullName, roleTitle, team }) => ({ id, fullName, roleTitle, teamName: team?.name ?? null })),
      inventoryNeeds: expedition.inventoryNeeds.map(({ id, itemName, quantity, unit, note }) => ({ id, itemName, quantity, unit, note })),
      readinessItems: expedition.readinessItems.map(({ id, key, label, isComplete }) => ({ id, key, label, isComplete })),
      readiness: {
        pass: readiness.pass,
        blockers: readiness.rules.filter((rule) => !rule.pass).map((rule) => rule.explanation),
      },
    };
  }));

  return (
    <HqPageShell
      title="Expeditions"
      subtitle="Create draft expeditions, review their readiness, and activate when operational checks pass."
    >
      <CreateExpeditionCard />
      <div className="mt-6">
        <ExpeditionDraftList expeditions={expeditionSummaries} focusExpeditionId={focusExpeditionId} />
      </div>
    </HqPageShell>
  );
}
