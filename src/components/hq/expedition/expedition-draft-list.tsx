"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Circle, Package, Rocket } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

type ExpeditionListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  season: string;
  description: string | null;
  destination: string | null;
  objectives: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  stations: { id: string; name: string; code: string }[];
  teams: { id: string; name: string; callsign: string | null; stationName: string | null }[];
  personnel: { id: string; fullName: string; roleTitle: string; teamName: string | null }[];
  inventoryNeeds: { id: string; itemName: string; quantity: number; unit: string; note: string | null }[];
  readinessItems: { id: string; key: string; label: string; isComplete: boolean }[];
  readiness: { pass: boolean; blockers: string[] };
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function ExpeditionDraftList({
  expeditions,
  focusExpeditionId,
}: {
  expeditions: ExpeditionListItem[];
  focusExpeditionId?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function activate(expedition: ExpeditionListItem) {
    setBusyId(expedition.id);
    try {
      const response = await fetch(`/api/hq/expeditions/${expedition.id}/activate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Expedition activation failed.");
        router.refresh();
        return;
      }
      toast.success(`${expedition.code} is now active.`);
      router.refresh();
    } catch {
      toast.error("Could not reach the server to activate this expedition.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleReadiness(itemId: string, isComplete: boolean) {
    const response = await fetch(`/api/hq/readiness/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: !isComplete }),
    });
    if (!response.ok) {
      toast.error("Could not update the readiness checklist.");
      return;
    }
    router.refresh();
  }

  return (
    <section aria-labelledby="saved-expeditions-heading">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-teal">Planning queue</p>
          <h2 id="saved-expeditions-heading" className="mt-1 font-display text-xl font-semibold text-text-primary">Saved expeditions</h2>
        </div>
        <p className="font-mono text-xs text-text-secondary">{expeditions.length} total · {expeditions.filter((item) => item.status === "DRAFT").length} drafts</p>
      </header>

      {expeditions.length ? (
        <ul className="space-y-2">
          {expeditions.map((expedition) => {
            const isActive = expedition.status === "ACTIVE";
            const canActivate = ["DRAFT", "READY"].includes(expedition.status) && expedition.readiness.pass;
            return (
              <li id={`expedition-${expedition.id}`} key={expedition.id} className="operations-panel overflow-hidden scroll-mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${isActive ? "bg-teal-soft-bg text-teal" : expedition.readiness.pass ? "bg-cyan/10 text-cyan" : "bg-amber/10 text-amber"}`}>
                      {isActive ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Rocket className="h-4 w-4" aria-hidden />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-text-primary">{expedition.name}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-text-secondary">
                        <span>{expedition.code}</span><span>·</span><span>{expedition.season}</span><span>·</span><span>{expedition.status}</span>
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="border border-teal/30 bg-teal-soft-bg px-2.5 py-1.5 text-xs font-medium text-teal">Active</span>
                  ) : !["DRAFT", "READY"].includes(expedition.status) ? (
                    <span className="border border-border bg-bg px-2.5 py-1.5 text-xs text-text-secondary">{expedition.status}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/hq/assets?expeditionId=${encodeURIComponent(expedition.id)}`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
                        <Package className="h-3.5 w-3.5" aria-hidden />
                        Assets
                      </Link>
                      <Button type="button" size="sm" variant="navy" disabled={!canActivate || busyId === expedition.id} onClick={() => activate(expedition)}>
                        <Rocket className="h-3.5 w-3.5" aria-hidden />
                        {busyId === expedition.id ? "Activating…" : "Activate"}
                      </Button>
                    </div>
                  )}
                </div>

                <details className="group border-t border-border" open={focusExpeditionId === expedition.id}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 bg-bg/40 px-4 py-2.5 text-xs text-text-secondary hover:bg-bg">
                    <ChevronDown className="h-3.5 w-3.5 text-teal transition-transform group-open:rotate-180" aria-hidden />
                    <span>Details and readiness</span>
                    {!isActive && !expedition.readiness.pass ? <span className="ml-auto font-mono text-[10px] text-amber">{expedition.readiness.blockers.length} blocker(s)</span> : null}
                  </summary>
                  <div className="grid gap-5 border-t border-border p-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Detail label="Dates" value={`${formatDate(expedition.plannedStart)} – ${formatDate(expedition.plannedEnd)}`} />
                        <Detail label="Locations" value={expedition.destination || "Not set"} />
                      </div>
                      {expedition.description ? <Detail label="Description" value={expedition.description} /> : null}
                      {expedition.objectives ? <Detail label="Research work" value={expedition.objectives} /> : null}
                      <Detail label="Teams" value={expedition.teams.map((team) => `${team.name}${team.stationName ? ` · ${team.stationName}` : ""}`).join("; ") || "None assigned"} />
                      <Detail label="Personnel" value={expedition.personnel.map((person) => `${person.fullName} · ${person.teamName ?? person.roleTitle}`).join("; ") || "None assigned"} />
                      <Detail label="Inventory needed" value={expedition.inventoryNeeds.map((item) => `${item.itemName} · ${item.quantity} ${item.unit}`).join("; ") || "None listed"} />
                    </div>

                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-text-secondary">Readiness checklist</p>
                      <ul className="space-y-2">
                        {expedition.readinessItems.map((item) => (
                          <li key={item.id}>
                            <button type="button" disabled={isActive} onClick={() => toggleReadiness(item.id, item.isComplete)} className="flex w-full items-start gap-2 text-left text-xs text-text-primary disabled:cursor-default">
                              {item.isComplete ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />}
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {!isActive && expedition.readiness.blockers.length ? (
                        <div className="mt-3 border border-amber/30 bg-amber/5 p-3">
                          <p className="text-xs font-semibold text-amber">Activation requirements</p>
                          <ul className="mt-1 list-inside list-disc space-y-1 text-[10px] leading-relaxed text-text-secondary">
                            {expedition.readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                          </ul>
                        </div>
                      ) : null}
                      {!isActive && expedition.readiness.pass ? <p className="mt-3 text-xs text-teal">Readiness checks passed. This expedition can be activated.</p> : null}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-dashed border-border bg-surface p-6 text-sm text-text-secondary">No saved expeditions yet. Create a draft above to start the planning queue.</p>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-0.5 break-words text-xs leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}