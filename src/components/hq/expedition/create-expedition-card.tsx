"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationDraft = { name: string; code: string };
type TeamDraft = { name: string; callsign: string; locationIndex: string };
type PersonnelDraft = { fullName: string; roleTitle: string; teamIndex: string };
type InventoryDraft = { itemName: string; quantity: string; unit: string; note: string };

const steps = ["Expedition", "Schedule & research", "Locations & teams", "Personnel & inventory", "Review"] as const;

function seasonForDate(date: string) {
  const year = Number(date.slice(0, 4));
  return year ? `${year}-${String(year + 1).slice(-2)}` : "2026-27";
}

export function CreateExpeditionCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [season, setSeason] = useState("2026-27");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [research, setResearch] = useState("");
  const [locations, setLocations] = useState<LocationDraft[]>([{ name: "", code: "" }]);
  const [teams, setTeams] = useState<TeamDraft[]>([{ name: "", callsign: "", locationIndex: "0" }]);
  const [personnel, setPersonnel] = useState<PersonnelDraft[]>([{ fullName: "", roleTitle: "", teamIndex: "0" }]);
  const [inventory, setInventory] = useState<InventoryDraft[]>([{ itemName: "", quantity: "", unit: "", note: "" }]);

  const canContinue = (() => {
    if (step === 0) return code.trim().length >= 3 && name.trim().length >= 3 && season.trim().length >= 4;
    if (step === 1) return Boolean(startDate && endDate && endDate >= startDate && description.trim() && research.trim());
    if (step === 2) return locations.every((location) => location.name.trim() && location.code.trim()) && teams.every((team) => team.name.trim() && locations[Number(team.locationIndex)]);
    if (step === 3) return personnel.every((person) => person.fullName.trim() && person.roleTitle.trim() && teams[Number(person.teamIndex)]) && inventory.every((item) => item.itemName.trim() && Number(item.quantity) > 0 && item.unit.trim());
    return true;
  })();

  function updateRow<T>(rows: T[], setRows: (next: T[]) => void, index: number, patch: Partial<T>) {
    setRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function createExpedition() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/hq/expeditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          season,
          startDate,
          endDate,
          description: description.trim(),
          research: research.trim(),
          locations: locations.map((location) => ({ name: location.name.trim(), code: location.code.trim().toUpperCase() })),
          teams: teams.map((team) => ({ name: team.name.trim(), callsign: team.callsign.trim(), locationIndex: Number(team.locationIndex) })),
          personnel: personnel.map((person) => ({ fullName: person.fullName.trim(), roleTitle: person.roleTitle.trim(), teamIndex: Number(person.teamIndex) })),
          inventory: inventory.map((item) => ({ itemName: item.itemName.trim(), quantity: Number(item.quantity), unit: item.unit.trim(), note: item.note.trim() })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error ?? "Could not create expedition.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Expedition created with its initial roster and inventory needs.");
      setOpen(false);
      setStep(0);
      router.refresh();
    } catch {
      setError("Could not reach the server. Your draft is still here.");
      toast.error("Could not create expedition.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border border-border bg-surface" aria-labelledby="create-expedition-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-teal">Expedition setup</p>
          <h2 id="create-expedition-heading" className="mt-1 font-display text-lg font-semibold text-text-primary">
            Create an expedition
          </h2>
        </div>
        {!open ? (
          <Button type="button" variant="navy" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New expedition
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        )}
      </header>

      {open ? (
        <div className="border-t border-border">
          <div className="border-b border-border bg-bg px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-secondary">Step {step + 1} of {steps.length}</p>
              <p className="truncate text-xs font-medium text-text-primary">{steps[step]}</p>
            </div>
            <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Expedition creation progress">
              {steps.map((label, index) => (
                <li key={label} aria-current={index === step ? "step" : undefined}>
                  <div className={`h-1 ${index <= step ? "bg-teal" : "bg-border"}`} />
                  <span className="sr-only">{label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Expedition name" htmlFor="wizard-name">
                  <Input id="wizard-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Antarctic Research Expedition" />
                </Field>
                <Field label="Expedition code" htmlFor="wizard-code">
                  <Input id="wizard-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ISEA-45" />
                </Field>
                <Field label="Season" htmlFor="wizard-season">
                  <Input id="wizard-season" value={season} onChange={(event) => setSeason(event.target.value)} placeholder={seasonForDate(startDate)} />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date" htmlFor="wizard-start"><Input id="wizard-start" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (!season || season === "2026-27") setSeason(seasonForDate(event.target.value)); }} /></Field>
                <Field label="End date" htmlFor="wizard-end"><Input id="wizard-end" type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Expedition description" htmlFor="wizard-description">
                    <textarea id="wizard-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Purpose, scope, and deployment context" className="w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-cyan" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Research work to be done" htmlFor="wizard-research">
                    <textarea id="wizard-research" rows={4} value={research} onChange={(event) => setResearch(event.target.value)} placeholder="Research objectives, surveys, and planned field work" className="w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-cyan" />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <section className="space-y-3" aria-labelledby="locations-heading">
                  <div className="flex items-center justify-between gap-2">
                    <div><h3 id="locations-heading" className="text-sm font-semibold text-text-primary">Locations / stations</h3><p className="text-xs text-text-secondary">Add each deployment location.</p></div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setLocations([...locations, { name: "", code: "" }])}><Plus className="h-3.5 w-3.5" aria-hidden />Add location</Button>
                  </div>
                  {locations.map((location, index) => (
                    <div key={index} className="grid gap-2 border border-border p-3 sm:grid-cols-[1fr_10rem_auto]">
                      <Input aria-label={`Location ${index + 1} name`} value={location.name} onChange={(event) => updateRow(locations, setLocations, index, { name: event.target.value })} placeholder="Station name" />
                      <Input aria-label={`Location ${index + 1} code`} value={location.code} onChange={(event) => updateRow(locations, setLocations, index, { code: event.target.value.toUpperCase() })} placeholder="Code" />
                      <RemoveButton label="Remove location" disabled={locations.length === 1} onClick={() => setLocations(locations.filter((_, rowIndex) => rowIndex !== index))} />
                    </div>
                  ))}
                </section>
                <section className="space-y-3" aria-labelledby="teams-heading">
                  <div className="flex items-center justify-between gap-2">
                    <div><h3 id="teams-heading" className="text-sm font-semibold text-text-primary">Teams involved</h3><p className="text-xs text-text-secondary">Assign each team to a station.</p></div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setTeams([...teams, { name: "", callsign: "", locationIndex: "0" }])}><Plus className="h-3.5 w-3.5" aria-hidden />Add team</Button>
                  </div>
                  {teams.map((team, index) => (
                    <div key={index} className="grid gap-2 border border-border p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input aria-label={`Team ${index + 1} name`} value={team.name} onChange={(event) => updateRow(teams, setTeams, index, { name: event.target.value })} placeholder="Team name" />
                      <Input aria-label={`Team ${index + 1} callsign`} value={team.callsign} onChange={(event) => updateRow(teams, setTeams, index, { callsign: event.target.value })} placeholder="Callsign (optional)" />
                      <select aria-label={`Team ${index + 1} location`} className="h-11 w-full border border-border bg-surface px-3 text-sm" value={team.locationIndex} onChange={(event) => updateRow(teams, setTeams, index, { locationIndex: event.target.value })}>
                        {locations.map((location, locationIndex) => <option key={locationIndex} value={locationIndex}>{location.name || `Location ${locationIndex + 1}`}</option>)}
                      </select>
                      <RemoveButton label="Remove team" disabled={teams.length === 1} onClick={() => setTeams(teams.filter((_, rowIndex) => rowIndex !== index))} />
                    </div>
                  ))}
                </section>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <section className="space-y-3" aria-labelledby="personnel-heading">
                  <div className="flex items-center justify-between gap-2">
                    <div><h3 id="personnel-heading" className="text-sm font-semibold text-text-primary">Personnel</h3><p className="text-xs text-text-secondary">Assign each person to a team. Employee codes are generated automatically.</p></div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setPersonnel([...personnel, { fullName: "", roleTitle: "", teamIndex: teams[0] ? "0" : "" }])}><Plus className="h-3.5 w-3.5" aria-hidden />Add person</Button>
                  </div>
                  {personnel.map((person, index) => (
                    <div key={index} className="grid gap-2 border border-border p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input aria-label={`Personnel ${index + 1} name`} value={person.fullName} onChange={(event) => updateRow(personnel, setPersonnel, index, { fullName: event.target.value })} placeholder="Full name" />
                      <Input aria-label={`Personnel ${index + 1} role`} value={person.roleTitle} onChange={(event) => updateRow(personnel, setPersonnel, index, { roleTitle: event.target.value })} placeholder="Role / research specialty" />
                      <select aria-label={`Personnel ${index + 1} team`} className="h-11 w-full border border-border bg-surface px-3 text-sm" value={person.teamIndex} onChange={(event) => updateRow(personnel, setPersonnel, index, { teamIndex: event.target.value })}>
                        {teams.map((team, teamIndex) => <option key={teamIndex} value={teamIndex}>{team.name || `Team ${teamIndex + 1}`}</option>)}
                      </select>
                      <RemoveButton label="Remove person" disabled={personnel.length === 1} onClick={() => setPersonnel(personnel.filter((_, rowIndex) => rowIndex !== index))} />
                    </div>
                  ))}
                </section>
                <section className="space-y-3" aria-labelledby="inventory-heading">
                  <div className="flex items-center justify-between gap-2">
                    <div><h3 id="inventory-heading" className="text-sm font-semibold text-text-primary">Inventory needed</h3><p className="text-xs text-text-secondary">Capture the planned supplies and quantities.</p></div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setInventory([...inventory, { itemName: "", quantity: "", unit: "", note: "" }])}><Plus className="h-3.5 w-3.5" aria-hidden />Add item</Button>
                  </div>
                  {inventory.map((item, index) => (
                    <div key={index} className="grid gap-2 border border-border p-3 sm:grid-cols-2 xl:grid-cols-[1fr_7rem_7rem_1fr_auto]">
                      <Input aria-label={`Inventory item ${index + 1} name`} value={item.itemName} onChange={(event) => updateRow(inventory, setInventory, index, { itemName: event.target.value })} placeholder="Supply item" />
                      <Input aria-label={`Inventory item ${index + 1} quantity`} type="number" min="0.01" step="any" value={item.quantity} onChange={(event) => updateRow(inventory, setInventory, index, { quantity: event.target.value })} placeholder="Quantity" />
                      <Input aria-label={`Inventory item ${index + 1} unit`} value={item.unit} onChange={(event) => updateRow(inventory, setInventory, index, { unit: event.target.value })} placeholder="Unit" />
                      <Input aria-label={`Inventory item ${index + 1} note`} value={item.note} onChange={(event) => updateRow(inventory, setInventory, index, { note: event.target.value })} placeholder="Note (optional)" />
                      <RemoveButton label="Remove inventory item" disabled={inventory.length === 1} onClick={() => setInventory(inventory.filter((_, rowIndex) => rowIndex !== index))} />
                    </div>
                  ))}
                </section>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <ReviewBlock title="Expedition" lines={[`${name} (${code.toUpperCase()})`, `Season ${season}`, `${startDate} to ${endDate}`, description]} />
                <ReviewBlock title="Research work" lines={[research]} />
                <ReviewBlock title="Locations & teams" lines={[
                  ...locations.map((location) => `${location.name} (${location.code})`),
                  ...teams.map((team) => `${team.name}${team.callsign ? ` · ${team.callsign}` : ""} · ${locations[Number(team.locationIndex)]?.name}`),
                ]} />
                <ReviewBlock title="Personnel & inventory" lines={[
                  ...personnel.map((person) => `${person.fullName} · ${person.roleTitle} · ${teams[Number(person.teamIndex)]?.name}`),
                  ...inventory.map((item) => `${item.itemName} · ${item.quantity} ${item.unit}${item.note ? ` · ${item.note}` : ""}`),
                ]} />
              </div>
            ) : null}

            {error ? <p className="border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">{error}</p> : null}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg/60 px-4 py-3 sm:px-5">
            <Button type="button" variant="secondary" disabled={step === 0 || loading} onClick={() => { setStep(step - 1); setError(""); }}>
              <ArrowLeft className="h-4 w-4" aria-hidden />Back
            </Button>
            <p className="font-mono text-[10px] text-text-secondary">Draft is saved when you finish setup.</p>
            {step < steps.length - 1 ? (
              <Button type="button" variant="navy" disabled={!canContinue} onClick={() => { setStep(step + 1); setError(""); }}>
                Continue<ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" variant="navy" disabled={loading || !canContinue} onClick={createExpedition}>
                {loading ? "Creating…" : "Create expedition"}
              </Button>
            )}
          </footer>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>
      <Trash2 className="h-4 w-4 text-red" aria-hidden />
    </Button>
  );
}

function ReviewBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="min-w-0 border border-border p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      <ul className="mt-2 space-y-1">
        {lines.map((line, index) => <li key={`${title}-${index}`} className="break-words text-sm text-text-primary">{line || "—"}</li>)}
      </ul>
    </section>
  );
}