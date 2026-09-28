"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";

type ExpeditionPayload = {
  id: string;
  code: string;
  name: string;
  status: string;
  description: string | null;
  destination: string | null;
  objectives: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  teams: { id: string; name: string; callsign: string | null; station: { name: string } | null }[];
  personnel: { id: string; fullName: string; teamId: string | null }[];
  missions: { id: string; code: string; title: string }[];
  cargoItems: { id: string; manifestCode: string; status: string }[];
  assets: { id: string; assetTag: string; status: string }[];
  inventoryNeeds?: { id: string; itemName: string; quantity: number; unit: string; note: string | null }[];
  readinessItems: { id: string; key: string; label: string; isComplete: boolean }[];
};

const STEPS = [
  "Create draft expedition",
  "Dates, destination, objectives",
  "Create teams",
  "Assign personnel to teams",
  "Create missions",
  "Cargo manifest status",
  "Assets registered",
  "Validate readiness",
  "Activate expedition",
] as const;

export function ExpeditionWorkflow({ expeditionId }: { expeditionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ExpeditionPayload | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, rdRes] = await Promise.all([
        fetch(`/api/hq/expeditions/${expeditionId}`),
        fetch(`/api/hq/expeditions/${expeditionId}/readiness`),
      ]);
      const exJson = await exRes.json();
      const rdJson = await rdRes.json();
      if (exRes.ok) setData(exJson.expedition);
      if (rdRes.ok) setBlockers(rdJson.blockers ?? []);
    } finally {
      setLoading(false);
    }
  }, [expeditionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [exRes, rdRes] = await Promise.all([
          fetch(`/api/hq/expeditions/${expeditionId}`),
          fetch(`/api/hq/expeditions/${expeditionId}/readiness`),
        ]);
        const exJson = await exRes.json();
        const rdJson = await rdRes.json();
        if (cancelled) return;
        if (exRes.ok) setData(exJson.expedition);
        if (rdRes.ok) setBlockers(rdJson.blockers ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expeditionId]);

  async function patchExpedition(fields: Record<string, string>) {
    const res = await fetch(`/api/hq/expeditions/${expeditionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      toast.error("Could not save expedition details.");
      return;
    }
    toast.success("Expedition updated.");
    load();
    router.refresh();
  }

  async function activate() {
    const res = await fetch(`/api/hq/expeditions/${expeditionId}/activate`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Activation blocked.");
      if (json.blockers) setBlockers(json.blockers);
      return;
    }
    toast.success("Expedition activated.");
    load();
    router.refresh();
  }

  if (loading && !data) {
    return <div className="h-48 animate-pulse bg-border rounded-[2px]" />;
  }

  if (!data) {
    return <p className="text-sm text-text-secondary">Expedition not found in your scope.</p>;
  }

  const canActivate = data.status !== "ACTIVE" && blockers.length === 0;
  const inventoryNeeds = data.inventoryNeeds ?? [];

  return (
    <div className="space-y-8">
      <div className="border border-border bg-surface px-4 py-3 rounded-[2px]">
        <p className="font-display text-xl font-semibold text-text-primary">{data.name}</p>
        <p className="font-mono text-xs text-text-secondary">
          {data.code} · status {data.status}
        </p>
      </div>

      <ol className="space-y-2">
        {STEPS.map((label, idx) => (
          <li key={label}>
            <details open={idx === 1} className={`group border ${idx === 8 ? "border-navy bg-bg" : "border-border bg-surface"}`}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-bg/60 sm:px-4">
                <span className="font-mono text-xs text-cyan">{String(idx + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">{label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-border px-3 py-3 sm:px-4">
                {idx === 0 && (
                  <p className="mt-1 text-xs text-text-secondary">Draft record {data.code} exists.</p>
                )}
                {idx === 1 && (
                  <Step2Form data={data} onSave={patchExpedition} />
                )}
                {idx === 2 && <StepTeams expeditionId={data.id} teams={data.teams} onDone={load} />}
                {idx === 3 && (
                  <StepPersonnel personnel={data.personnel} teams={data.teams} onDone={load} />
                )}
                {idx === 4 && (
                  <StepMission expeditionId={data.id} teams={data.teams} personnel={data.personnel} onDone={load} />
                )}
                {idx === 5 && (
                  <div className="mt-2 space-y-2">
                    <p className="font-mono text-[10px] text-text-secondary">
                      {data.cargoItems.length} cargo item(s) tracked · advance statuses in Cargo & Logistics
                    </p>
                    <p className="text-xs font-medium text-text-primary">Planned inventory needs</p>
                    {inventoryNeeds.length ? (
                      <ul className="space-y-1 text-[10px] text-text-secondary">
                        {inventoryNeeds.map((item) => (
                          <li key={item.id} className="flex flex-wrap justify-between gap-x-2">
                            <span>{item.itemName}{item.note ? ` · ${item.note}` : ""}</span>
                            <span className="font-mono">{item.quantity} {item.unit}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[10px] text-text-secondary">No planned inventory needs recorded.</p>}
                  </div>
                )}
                {idx === 6 && (
                  <p className="mt-2 font-mono text-[10px] text-text-secondary">
                    {data.assets.length} assets · {data.assets.filter((a) => a.status === "OPERATIONAL").length} operational
                  </p>
                )}
                {idx === 7 && (
                  <StepReadiness items={data.readinessItems} blockers={blockers} onToggle={load} />
                )}
                {idx === 8 && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="navy"
                      disabled={!canActivate}
                      onClick={activate}
                    >
                      Activate expedition
                    </Button>
                    {!canActivate && data.status !== "ACTIVE" ? (
                      <p className="mt-2 text-xs text-amber">Resolve step 8 blockers before activation.</p>
                    ) : null}
                    {data.status === "ACTIVE" ? (
                      <p className="mt-2 flex items-center gap-1 text-xs text-teal">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Operational
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Step2Form({
  data,
  onSave,
}: {
  data: ExpeditionPayload;
  onSave: (f: Record<string, string>) => void;
}) {
  const [destination, setDestination] = useState(data.destination ?? "");
  const [description, setDescription] = useState(data.description ?? "");
  const [objectives, setObjectives] = useState(data.objectives ?? "");
  const [plannedStart, setPlannedStart] = useState(data.plannedStart?.slice(0, 10) ?? "");
  const [plannedEnd, setPlannedEnd] = useState(data.plannedEnd?.slice(0, 10) ?? "");
  return (
    <div className="mt-2 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="date" aria-label="Expedition start date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
        <Input type="date" aria-label="Expedition end date" min={plannedStart || undefined} value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
      </div>
      <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Locations / destination" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Expedition description" rows={2} className="w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-text-primary" />
      <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="Research work and objectives" rows={3} className="w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-text-primary" />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!plannedStart || !plannedEnd || plannedEnd < plannedStart || !destination.trim() || !description.trim() || !objectives.trim()}
        onClick={() => onSave({
          destination,
          description,
          objectives,
          plannedStart: new Date(`${plannedStart}T00:00:00.000Z`).toISOString(),
          plannedEnd: new Date(`${plannedEnd}T23:59:59.999Z`).toISOString(),
        })}
      >
        Save
      </Button>
    </div>
  );
}

function StepTeams({
  expeditionId,
  teams,
  onDone,
}: {
  expeditionId: string;
  teams: { id: string; name: string; station: { name: string } | null }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  async function add() {
    const res = await fetch("/api/hq/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expeditionId, name }),
    });
    if (!res.ok) {
      toast.error("Could not create team.");
      return;
    }
    toast.success("Team created.");
    setName("");
    onDone();
  }
  return (
    <div className="mt-2 space-y-2">
      <p className="font-mono text-[10px] text-text-secondary">{teams.length} team(s)</p>
      {teams.length > 0 ? (
        <ul className="space-y-1 text-[10px] text-text-secondary">
          {teams.map((team) => <li key={team.id}>{team.name} · {team.station?.name ?? "No station"}</li>)}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" />
        <Button type="button" size="sm" onClick={add} disabled={!name.trim()}>Add</Button>
      </div>
    </div>
  );
}

function StepPersonnel({
  personnel,
  teams,
  onDone,
}: {
  personnel: { id: string; fullName: string; teamId: string | null }[];
  teams: { id: string; name: string }[];
  onDone: () => void;
}) {
  async function assign(personId: string, teamId: string) {
    const res = await fetch(`/api/hq/personnel/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    if (!res.ok) {
      toast.error("Assignment failed.");
      return;
    }
    toast.success("Personnel assigned.");
    onDone();
  }
  return (
    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
      {personnel.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2">
          <span className="truncate">{p.fullName}</span>
          <select
            className="h-8 border border-border px-1 rounded-[2px]"
            value={p.teamId ?? ""}
            onChange={(e) => assign(p.id, e.target.value)}
          >
            <option value="">— team —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

function StepMission({
  expeditionId,
  teams,
  personnel,
  onDone,
}: {
  expeditionId: string;
  teams: { id: string; name: string }[];
  personnel: { id: string; fullName: string }[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");

  async function create() {
    const depart = new Date();
    const ret = new Date(Date.now() + 3 * 86400000);
    const res = await fetch("/api/hq/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expeditionId,
        teamId,
        title,
        code,
        plannedDepartAt: depart.toISOString(),
        expectedReturnAt: ret.toISOString(),
        checkInIntervalMinutes: 180,
        personnelIds: personnel.slice(0, 2).map((p) => p.id),
      }),
    });
    if (!res.ok) {
      toast.error("Could not create mission.");
      return;
    }
    toast.success("Mission created.");
    setTitle("");
    setCode("");
    onDone();
  }

  return (
    <div className="mt-2 space-y-2">
      <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MSN code" />
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mission title" />
      <select
        className="flex h-10 w-full border border-border px-2 text-sm rounded-[2px]"
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <Button type="button" size="sm" onClick={create} disabled={!title || !code || !teamId}>
        Create mission
      </Button>
    </div>
  );
}

function StepReadiness({
  items,
  blockers,
  onToggle,
}: {
  items: { id: string; label: string; isComplete: boolean }[];
  blockers: string[];
  onToggle: () => void;
}) {
  async function toggle(id: string, isComplete: boolean) {
    const res = await fetch(`/api/hq/readiness/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: !isComplete }),
    });
    if (!res.ok) {
      toast.error("Could not update checklist.");
      return;
    }
    onToggle();
  }

  return (
    <div className="mt-2 space-y-2">
      <ul className="space-y-1 text-xs">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left hover:text-cyan"
              onClick={() => toggle(item.id, item.isComplete)}
            >
              {item.isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-teal" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-text-secondary" />
              )}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      {blockers.length > 0 ? (
        <ul className="border border-amber/40 bg-bg p-2 text-[10px] text-amber">
          {blockers.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-teal">All automated readiness rules pass.</p>
      )}
    </div>
  );
}
