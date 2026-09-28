"use client";

import { useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpeditionWorkflow } from "@/components/hq/expedition/expedition-workflow";

type ExpeditionSummary = {
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
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function ExpeditionWorkspace({ expeditions }: { expeditions: ExpeditionSummary[] }) {
  const [selectedId, setSelectedId] = useState(expeditions[0]?.id ?? "");
  const selected = expeditions.find((expedition) => expedition.id === selectedId) ?? expeditions[0];

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="min-w-0" aria-label="Selected expedition workflow">
        {selected ? <ExpeditionWorkflow key={selected.id} expeditionId={selected.id} /> : (
          <p className="border border-dashed border-border p-6 text-sm text-text-secondary">Create a draft expedition to begin the workflow.</p>
        )}
      </section>

      <aside className="min-w-0 border border-border bg-surface xl:sticky xl:top-4 xl:self-start" aria-labelledby="saved-expeditions-heading">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal" aria-hidden />
            <h2 id="saved-expeditions-heading" className="font-display text-base font-semibold text-text-primary">Saved expeditions</h2>
          </div>
          <p className="mt-1 font-mono text-[10px] text-text-secondary">{expeditions.length} in your workspace</p>
        </header>

        {expeditions.length ? (
          <ul className="divide-y divide-border">
            {expeditions.map((expedition) => {
              const isSelected = expedition.id === selected?.id;
              return (
                <li key={expedition.id}>
                  <details open={isSelected} className="group">
                    <summary className={`flex cursor-pointer list-none items-start gap-2 px-3 py-3 hover:bg-bg/70 ${isSelected ? "bg-teal-soft-bg/50" : ""}`}>
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-teal transition-transform group-open:rotate-180" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">{expedition.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-text-secondary">
                          <span>{expedition.code}</span><span>·</span><span>{expedition.status}</span>
                        </span>
                      </span>
                    </summary>
                    <div className="space-y-2 border-t border-border px-4 py-3">
                      <Detail label="Season" value={expedition.season} />
                      <Detail label="Dates" value={`${formatDate(expedition.plannedStart)} – ${formatDate(expedition.plannedEnd)}`} />
                      <Detail label="Locations" value={expedition.destination || "Not added"} />
                      {expedition.description ? <Detail label="Description" value={expedition.description} /> : null}
                      {expedition.objectives ? <Detail label="Research" value={expedition.objectives} /> : null}
                      <Button type="button" size="sm" variant={isSelected ? "secondary" : "navy"} className="mt-2 w-full" onClick={() => setSelectedId(expedition.id)}>
                        {isSelected ? "Currently selected" : "Select expedition"}
                      </Button>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : <p className="px-4 py-5 text-sm text-text-secondary">No saved expeditions.</p>}
      </aside>
    </div>
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
