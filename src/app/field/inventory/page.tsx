import { EquipmentList } from "@/components/field/equipment-list";
import { SuppliesPanel } from "@/components/field/supplies-panel";
import { getSession } from "@/lib/auth/session";
import { getFieldDashboard, listFieldAssets, listFieldInventory } from "@/lib/field/dashboard";
import { redirect } from "next/navigation";

export default async function FieldInventoryPage() {
  const session = await getSession();
  if (!session?.personnelId) redirect("/");

  const [dashboard, items, assets] = await Promise.all([
    getFieldDashboard(session.personnelId),
    listFieldInventory(session.personnelId),
    listFieldAssets(session.personnelId),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal">Field inventory</p>
          <h1 className="font-display text-3xl font-semibold">Gear & supplies</h1>
        </div>
        <p className="text-sm text-text-secondary">{dashboard?.stationCode ? `Station ${dashboard.stationCode}` : "Station not assigned"}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SuppliesPanel items={items} stationCode={dashboard?.stationCode ?? null} />

        <section className="operations-panel overflow-hidden" aria-labelledby="field-equipment-heading">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h2 id="field-equipment-heading" className="text-sm font-semibold text-text-primary">Equipment</h2>
              <p className="font-mono text-[10px] text-text-secondary">{assets.length} asset(s) assigned</p>
            </div>
          </header>
          <div className="p-3 sm:p-4">
            <EquipmentList assets={assets} compact />
          </div>
        </section>
      </div>
    </div>
  );
}
