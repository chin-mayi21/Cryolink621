import { HqPageShell } from "@/components/layout/hq-page-shell";
import { AssetsBoard } from "@/components/hq/assets/assets-board";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type HqAssetsPageProps = {
  searchParams: Promise<{ expeditionId?: string }>;
};

export default async function HqAssetsPage({ searchParams }: HqAssetsPageProps) {
  const session = await getSession();
  if (!session || session.role !== "OPERATIONS_OFFICIAL") {
    redirect("/");
  }

  const { expeditionId: requestedExpeditionId } = await searchParams;
  const expeditionId = requestedExpeditionId && session.expeditionIds.includes(requestedExpeditionId)
    ? requestedExpeditionId
    : session.expeditionIds[0];
  if (!expeditionId) {
    return (
      <HqPageShell title="Assets" subtitle="No expedition scope assigned.">
        <p className="text-sm text-text-secondary">Link your account to an expedition scope.</p>
      </HqPageShell>
    );
  }

  const expedition = await prisma.expedition.findUnique({
    where: { id: expeditionId },
    select: { code: true, name: true },
  });
  const assets = await prisma.asset.findMany({
    where: { expeditionId },
    include: { station: true },
    orderBy: { assetTag: "asc" },
  });

  const rows = assets.map((a) => ({
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    category: a.category,
    status: a.status,
    stationCode: a.station?.code ?? null,
  }));

  return (
    <HqPageShell
      title="Assets"
      subtitle={`${expedition?.name ?? "Expedition assets"} (${expedition?.code ?? expeditionId}) · Vehicles, generators, and critical equipment.`}
    >
      <AssetsBoard assets={rows} expeditionId={expeditionId} />
    </HqPageShell>
  );
}
