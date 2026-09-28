"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Plus, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UpdateRecord = { id: string; message: string; createdAt: string };
type FamilyContactRecord = {
  id: string;
  fullName: string;
  email: string;
  relationship: string;
  phone: string | null;
  updates: UpdateRecord[];
};
type PersonnelRecord = {
  id: string;
  fullName: string;
  employeeCode: string;
  expedition: { name: string; code: string };
  team: { name: string } | null;
  nextOfKin: { id: string; email: string } | null;
  familyContact: FamilyContactRecord | null;
};

function formatTime(value: string) {
  return `${value.slice(0, 16).replace("T", " ")} UTC`;
}

export function FamilyUpdatesManager() {
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/hq/family", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load family contacts.");
      setPersonnel(result.personnel ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load family contacts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hq/family", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load family contacts.");
        if (!cancelled) setPersonnel(result.personnel ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load family contacts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availablePersonnel = personnel.filter((person) => !person.familyContact);

  async function addContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/hq/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personnelId: selectedPersonnelId,
          fullName,
          email,
          relationship,
          phone,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add family contact.");
      toast.success("Family contact added.");
      setFullName("");
      setEmail("");
      setRelationship("");
      setPhone("");
      setSelectedPersonnelId("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add family contact.");
    } finally {
      setSaving(false);
    }
  }

  async function sendUpdate(contactId: string) {
    const message = drafts[contactId]?.trim() ?? "";
    if (!message) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/hq/family/${contactId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not publish update.");
      toast.success("Family update published.");
      setDrafts((current) => ({ ...current, [contactId]: "" }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]">
      <section className="operations-panel p-4 sm:p-5" aria-labelledby="family-contact-heading">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-5 w-5 text-teal" aria-hidden />
          <div>
            <h2 id="family-contact-heading" className="font-display text-lg font-semibold text-text-primary">Add family contact</h2>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">Register one contact for a roster member. They can create a Family account later with this email; signup will link only to this person.</p>
          </div>
        </div>

        {availablePersonnel.length === 0 ? (
          <p className="mt-5 border border-border bg-bg p-3 text-sm text-text-secondary">
            {loading ? "Loading roster…" : "Every roster member already has a family contact."}
          </p>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={addContact}>
            <div className="space-y-1.5">
              <Label htmlFor="family-member">Linked expedition member</Label>
              <select id="family-member" required value={selectedPersonnelId} onChange={(event) => setSelectedPersonnelId(event.target.value)} className="h-11 w-full border border-border bg-surface px-3 text-sm text-text-primary">
                <option value="">Select roster member</option>
                {availablePersonnel.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.employeeCode}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="family-name">Family contact name</Label><Input id="family-name" required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="family-email">Email for Family portal</Label><Input id="family-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="family-relationship">Relationship</Label><Input id="family-relationship" required value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Parent, partner…" /></div>
              <div className="space-y-1.5"><Label htmlFor="family-phone">Phone (optional)</Label><Input id="family-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
            </div>
            <Button type="submit" variant="navy" disabled={saving || !selectedPersonnelId}>
              <Plus className="h-4 w-4" aria-hidden />Add contact
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="family-updates-heading">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-teal" aria-hidden />
          <div>
            <h2 id="family-updates-heading" className="font-display text-lg font-semibold text-text-primary">Family updates</h2>
            <p className="text-xs text-text-secondary">Updates appear only in the linked contact’s Family portal.</p>
          </div>
        </div>
        {loading ? <p className="operations-panel p-4 text-sm text-text-secondary">Loading linked contacts…</p> : null}
        {!loading && personnel.every((person) => !person.familyContact) ? (
          <p className="operations-panel p-4 text-sm text-text-secondary">No family contacts registered yet.</p>
        ) : null}
        {personnel.filter((person) => person.familyContact).map((person) => {
          const contact = person.familyContact!;
          return (
            <article key={contact.id} className="operations-panel min-w-0 p-4 sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-text-primary">{contact.fullName} <span className="font-normal text-text-secondary">· {contact.relationship}</span></h3>
                  <p className="mt-1 break-all font-mono text-[10px] text-text-secondary">{contact.email}</p>
                  <p className="mt-1 text-xs text-text-secondary">For {person.fullName} · {person.team?.name ?? "Unassigned"} · {person.expedition.code}</p>
                </div>
                <span className={`border px-2 py-1 text-[10px] ${person.nextOfKin ? "border-teal/40 bg-teal-soft-bg text-teal" : "border-amber/40 bg-bg text-amber"}`}>
                  {person.nextOfKin ? "Portal linked" : "Account not activated"}
                </span>
              </header>

              <div className="mt-4 space-y-3">
                <Label htmlFor={`family-update-${contact.id}`}>Publish a safe update</Label>
                <textarea id={`family-update-${contact.id}`} rows={3} maxLength={1000} value={drafts[contact.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [contact.id]: event.target.value }))} placeholder="Share a confirmed, family-appropriate update. Avoid sensitive operational details." className="w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-text-primary" />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-text-secondary">{(drafts[contact.id] ?? "").length}/1000</p>
                  <Button type="button" size="sm" variant="navy" disabled={saving || !(drafts[contact.id] ?? "").trim()} onClick={() => sendUpdate(contact.id)}>
                    <Send className="h-3.5 w-3.5" aria-hidden />Publish update
                  </Button>
                </div>
              </div>

              {contact.updates.length ? (
                <ol className="mt-4 space-y-2 border-t border-border pt-3">
                  {contact.updates.map((update) => (
                    <li key={update.id} className="border-l-2 border-teal/50 pl-3">
                      <p className="whitespace-pre-wrap text-sm text-text-primary">{update.message}</p>
                      <p className="mt-1 font-mono text-[10px] text-text-secondary">{formatTime(update.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-3 border-t border-border pt-3 text-xs text-text-secondary">No direct updates published yet. Confirmed check-ins remain visible separately.</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}