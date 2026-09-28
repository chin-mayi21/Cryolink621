"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, PackageCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queueFieldOperation } from "@/lib/field/queue-operation";

export type SupplyRow = { id: string; sku: string; name: string; unit: string; onHand: number };
type QueueLine = { checked: boolean; quantity: string };

export function SuppliesPanel({ items, stationCode }: { items: SupplyRow[]; stationCode: string | null }) {
  const router = useRouter();
  const [lines, setLines] = useState<Record<string, QueueLine>>(() => Object.fromEntries(
    items.map((item) => [item.id, { checked: false, quantity: "1" }])
  ));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestDraft, setRequestDraft] = useState({ itemName: "", quantity: "1", unit: "unit", note: "" });

  const selectedItems = items.filter((item) => lines[item.id]?.checked);
  const hasInvalidQuantity = selectedItems.some((item) => {
    const quantity = Number(lines[item.id]?.quantity);
    return !Number.isFinite(quantity) || quantity <= 0 || quantity > item.onHand;
  });

  function updateLine(itemId: string, patch: Partial<QueueLine>) {
    setLines((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] ?? { checked: false, quantity: "1" }), ...patch },
    }));
  }

  async function queueSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItems.length || hasInvalidQuantity || busy) return;

    setBusy(true);
    try {
      for (const item of selectedItems) {
        await queueFieldOperation("INVENTORY_CONSUMPTION", {
          inventoryItemId: item.id,
          quantity: Number(lines[item.id].quantity),
          note: note.trim() || undefined,
        });
      }
      toast.success(`${selectedItems.length} inventory line(s) queued.`);
      setLines((current) => Object.fromEntries(
        Object.entries(current).map(([id, line]) => [id, { ...line, checked: false, quantity: "1" }])
      ));
      setNote("");
      router.refresh();
    } catch {
      toast.error("Could not queue all selected supplies. Check sync status before retrying.");
    } finally {
      setBusy(false);
    }
  }

  async function requestNewItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(requestDraft.quantity);
    if (!requestDraft.itemName.trim() || !Number.isFinite(quantity) || quantity <= 0 || !requestDraft.unit.trim() || requestBusy) return;

    setRequestBusy(true);
    try {
      await queueFieldOperation("SUPPLY_REQUEST", {
        itemName: requestDraft.itemName.trim(),
        quantity,
        unit: requestDraft.unit.trim(),
        note: requestDraft.note.trim() || undefined,
      });
      toast.success("New item request queued for HQ review.");
      setRequestDraft({ itemName: "", quantity: "1", unit: "unit", note: "" });
      router.refresh();
    } catch {
      toast.error("Could not queue the new item request.");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <section className="operations-panel overflow-hidden" aria-labelledby="supply-queue-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-teal" aria-hidden />
          <div>
            <h2 id="supply-queue-heading" className="text-sm font-semibold text-text-primary">Supply queue</h2>
            <p className="font-mono text-[10px] text-text-secondary">Station {stationCode ?? "—"} · {items.length} inventory item(s)</p>
          </div>
        </div>
        <p className="font-mono text-[10px] text-text-secondary">{selectedItems.length} selected</p>
      </header>

      {items.length ? (
        <form onSubmit={queueSelected}>
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const line = lines[item.id] ?? { checked: false, quantity: "1" };
              const quantity = Number(line.quantity);
              const invalid = line.checked && (!Number.isFinite(quantity) || quantity <= 0 || quantity > item.onHand);
              return (
                <li key={item.id} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:px-4">
                  <label htmlFor={`supply-check-${item.id}`} className="flex min-w-0 cursor-pointer items-start gap-3">
                    <input
                      id={`supply-check-${item.id}`}
                      type="checkbox"
                      checked={line.checked}
                      onChange={(event) => updateLine(item.id, { checked: event.target.checked })}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">{item.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-text-secondary">
                        <span>{item.sku}</span><span>·</span><span>{item.onHand} {item.unit} on hand</span>
                      </span>
                    </span>
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-2 pl-7 sm:pl-0">
                    <label htmlFor={`supply-qty-${item.id}`} className="text-[10px] text-text-secondary">Quantity to queue</label>
                    <Input
                      id={`supply-qty-${item.id}`}
                      aria-label={`${item.name} quantity`}
                      type="number"
                      min="0.1"
                      max={item.onHand}
                      step="0.1"
                      value={line.quantity}
                      onChange={(event) => updateLine(item.id, { quantity: event.target.value })}
                      disabled={!line.checked}
                      className={invalid ? "border-red" : ""}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <footer className="space-y-3 border-t border-border bg-bg/50 p-3 sm:p-4">
            <Input aria-label="Queue note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for selected inventory (optional)" />
            {hasInvalidQuantity ? <p className="text-xs text-red">Enter a quantity greater than zero and no higher than the on-hand balance.</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[10px] text-text-secondary"><PackageCheck className="h-3.5 w-3.5 text-teal" aria-hidden />Queued consumption syncs to the station inventory ledger.</p>
              <Button type="submit" variant="navy" size="sm" disabled={busy || selectedItems.length === 0 || hasInvalidQuantity}>
                {busy ? "Queueing…" : `Queue ${selectedItems.length || "selected"} supply line${selectedItems.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </footer>
        </form>
      ) : (
        <p className="border-t border-border px-4 py-4 text-sm text-text-secondary">No supplies are registered at your station yet.</p>
      )}

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg/60">
          <Plus className="h-4 w-4 text-teal" aria-hidden />
          <span>Add new item</span>
        </summary>
        <form onSubmit={requestNewItem} className="grid gap-3 border-t border-border bg-bg/40 p-3 sm:grid-cols-2 sm:p-4">
          <label className="space-y-1 text-xs text-text-secondary sm:col-span-2">Item name
            <Input required minLength={2} maxLength={120} value={requestDraft.itemName} onChange={(event) => setRequestDraft((current) => ({ ...current, itemName: event.target.value }))} placeholder="Supply or equipment name" />
          </label>
          <label className="space-y-1 text-xs text-text-secondary">Quantity
            <Input required type="number" min="0.1" step="0.1" value={requestDraft.quantity} onChange={(event) => setRequestDraft((current) => ({ ...current, quantity: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs text-text-secondary">Unit
            <Input required maxLength={24} value={requestDraft.unit} onChange={(event) => setRequestDraft((current) => ({ ...current, unit: event.target.value }))} placeholder="kg, units, kits…" />
          </label>
          <label className="space-y-1 text-xs text-text-secondary sm:col-span-2">Note (optional)
            <Input maxLength={200} value={requestDraft.note} onChange={(event) => setRequestDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Reason or delivery details" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" size="sm" disabled={requestBusy || !requestDraft.itemName.trim() || Number(requestDraft.quantity) <= 0 || !requestDraft.unit.trim()}>
              {requestBusy ? "Queueing request…" : "Queue new item request"}
            </Button>
            <p className="mt-2 text-[10px] text-text-secondary">This requests a new item from HQ; it does not change the on-hand stock count.</p>
          </div>
        </form>
      </details>
    </section>
  );
}