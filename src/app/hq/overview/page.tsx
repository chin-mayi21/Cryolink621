import { HqPageShell } from "@/components/layout/hq-page-shell";
import { AttentionRequiredPanel } from "@/components/hq/attention-required-panel";
import { ActivityFeedPanel } from "@/components/hq/activity-feed-panel";
import { FieldPositionsPanel } from "@/components/hq/field-positions-panel";
import { Boxes, Compass, MapPinned, Users } from "lucide-react";
import { fetchOverviewBundle } from "@/lib/hq/overview-data";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HqOverviewPage() {
  const session = await getSession();
  if (!session || session.role !== "OPERATIONS_OFFICIAL") redirect("/");

  const bundle = await fetchOverviewBundle(session.expeditionIds);
  const assetTotal = bundle.resource.assetsOperational + bundle.resource.assetsMaintenance;
  const metrics = [
    {
      label: "Expedition",
      value: bundle.expedition?.code ?? "—",
      detail: bundle.missionDay && bundle.missionTotalDays
        ? `${bundle.expedition?.status ?? "No status"} · Day ${bundle.missionDay} of ${bundle.missionTotalDays}`
        : bundle.expedition?.status ?? "No active expedition",
      icon: Compass,
      href: "/hq/expeditions",
    },
    {
      label: "Personnel",
      value: bundle.personnelCount.toLocaleString(),
      detail: "on expedition roster",
      icon: Users,
      href: "/hq/personnel",
    },
    {
      label: "Active missions",
      value: bundle.activeMissionCount.toLocaleString(),
      detail: "currently in the field",
      icon: MapPinned,
      href: "/hq/missions",
    },
    {
      label: "Resource readiness",
      value: `${bundle.resource.assetsOperational}/${assetTotal}`,
      detail: `${bundle.resource.inventoryCritical} critical · ${bundle.resource.inventoryLow} low stock`,
      icon: Boxes,
      href: "/hq/inventory",
    },
  ];

  return (
    <HqPageShell
      title="Overview"
      subtitle="Operations snapshot · expedition health, field activity, and exceptions."
    >
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Expedition summary">
          {metrics.map(({ label, value, detail, icon: Icon, href }, index) => (
            <Link
              key={label}
              href={href}
              className="rich-card group min-w-0 border-t-2 border-t-cyan/45 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
                <Icon className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              </div>
              <p className="mt-3 truncate font-mono text-2xl font-medium text-text-primary">{value}</p>
              <p className="mt-1 truncate text-xs text-text-secondary">{detail}</p>
            </Link>
          ))}
        </section>

        <AttentionRequiredPanel items={bundle.attention} />

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="operations-panel overflow-hidden">
            <FieldPositionsPanel rows={bundle.positionRows} />
          </div>
          <div className="operations-panel overflow-hidden">
            <ActivityFeedPanel items={bundle.feed} />
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary">
          <Link href="/hq/map" className="text-cyan underline-offset-2 hover:underline">
            Open MapLibre field map
          </Link>
          {" · "}
          <Link href="/hq/rescue" className="text-cyan underline-offset-2 hover:underline">
            Rescue dashboard
          </Link>
        </p>
      </div>
    </HqPageShell>
  );
}
