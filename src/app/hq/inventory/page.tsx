import { HqPageShell } from "@/components/layout/hq-page-shell";
import { InventoryTable } from "@/components/hq/inventory/inventory-table";
import { InventoryTransactionForm } from "@/components/hq/inventory/inventory-transaction-form";
import { ResupplySimulator } from "@/components/hq/inventory/resupply-simulator";
import { SupplyRequestsPanel } from "@/components/hq/inventory/supply-requests-panel";
import { getSession } from "@/lib/auth/session";
import { listInventoryForExpeditions } from "@/lib/inventory/queries";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HqInventoryPage() {
  const session = await getSession();
  if (!session || session.role !== "OPERATIONS_OFFICIAL") {
    redirect("/");
  }

  const [rows, supplyRequests] = await Promise.all([
    listInventoryForExpeditions(session.expeditionIds),
    prisma.supplyRequest.findMany({
      where: { expeditionId: { in: session.expeditionIds } },
      include: { personnel: true, station: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const formOptions = rows.map((r) => ({
    id: r.id,
    label: `${r.sku} · ${r.stationCode} (${r.onHand} ${r.unit})`,
  }));

  const simItems = rows
    .filter((r) => r.dailyConsumptionRate)
    .map((r) => ({
      id: r.id,
      sku: r.sku,
      onHand: Number(r.onHand),
      threshold: Number(r.lowStockThreshold),
      dailyRate: r.dailyConsumptionRate ? Number(r.dailyConsumptionRate) : null,
      unit: r.unit,
    }));

  return (
    <HqPageShell
      title="Inventory"
      subtitle="Transaction ledger — balances computed from receipts, consumption, loss, and adjustments."
    >
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <InventoryTable rows={rows} />
        </div>
        <div className="space-y-6">
          <InventoryTransactionForm items={formOptions} />
        </div>
      </div>
      <div className="mt-8">
        <ResupplySimulator items={simItems} />
      </div>
      <SupplyRequestsPanel requests={supplyRequests.map((request) => ({
        id: request.id,
        itemName: request.itemName,
        quantity: request.quantity,
        unit: request.unit,
        note: request.note,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        personnelName: request.personnel.fullName,
        employeeCode: request.personnel.employeeCode,
        stationName: request.station.name,
      }))} />
    </HqPageShell>
  );
}
