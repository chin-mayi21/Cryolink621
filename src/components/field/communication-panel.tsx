"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, HeartHandshake, MessageCircle, Radio, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Channel = { id: string; group: "Main center" | "Inter-station" | "Family liaison"; name: string; detail: string; availability: string; tone: "teal" | "cyan" | "amber" };
type Message = { id: number | string; sender: string; body: string; time: string; mine?: boolean };
type FamilyMessage = { id: string; authorName: string; authorRole: string; message: string; createdAt: string };

const channels: Channel[] = [
  { id: "hq", group: "Main center", name: "HQ Operations", detail: "Mission coordination · 24/7 operations desk", availability: "Online", tone: "teal" },
  { id: "ecc", group: "Main center", name: "Emergency Control Center", detail: "Medical escalation and rescue coordination", availability: "Priority line", tone: "amber" },
  { id: "maitri", group: "Inter-station", name: "Maitri Station", detail: "Station operations · supplies and weather relay", availability: "Online", tone: "cyan" },
  { id: "bharati", group: "Inter-station", name: "Bharati Station", detail: "Inter-station support and logistics relay", availability: "Scheduled check-in", tone: "cyan" },
  { id: "family", group: "Family liaison", name: "Family Liaison Desk", detail: "Approved wellbeing updates for next of kin", availability: "Daily window · 18:00 UTC", tone: "teal" },
];

const initialMessages: Message[] = [
  { id: 1, sender: "HQ Operations", body: "Weather window remains clear until 16:00 UTC. Continue the planned traverse.", time: "12:18" },
  { id: 2, sender: "Team Bravo", body: "Received. We are moving from waypoint 4 to waypoint 5.", time: "12:24" },
];

const channelIcon = { "Main center": Building2, "Inter-station": Radio, "Family liaison": HeartHandshake };

export function CommunicationPanel({ teamName }: { teamName: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([]);
  const [familyContactExists, setFamilyContactExists] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [channelId, setChannelId] = useState("hq");
  const activeChannel = channels.find((channel) => channel.id === channelId) ?? channels[0];

  useEffect(() => {
    if (channelId !== "family") return;
    let cancelled = false;
    fetch("/api/field/family-updates", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load Family Liaison messages.");
        if (cancelled) return;
        setFamilyContactExists(Boolean(result.hasContact));
        setFamilyMessages(result.updates ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFamilyError(error instanceof Error ? error.message : "Could not load Family Liaison messages.");
      })
      .finally(() => {
        if (!cancelled) setFamilyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  function selectChannel(nextChannelId: string) {
    if (nextChannelId === "family") {
      setFamilyLoading(true);
      setFamilyError("");
    }
    setChannelId(nextChannelId);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    if (channelId === "family") {
      if (!familyContactExists) return;
      setSending(true);
      try {
        const response = await fetch("/api/field/family-updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: body }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not send family update.");
        setFamilyMessages((current) => [...current, {
          id: result.update.id,
          authorName: "You",
          authorRole: "FIELD_PERSONNEL",
          message: result.update.message,
          createdAt: result.update.createdAt,
        }]);
        setDraft("");
      } catch (error) {
        setFamilyError(error instanceof Error ? error.message : "Could not send family update.");
      } finally {
        setSending(false);
      }
      return;
    }
    setMessages((current) => [...current, { id: Date.now(), sender: "You", body, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), mine: true }]);
    setDraft("");
  }

  const visibleMessages: Message[] = activeChannel.id === "family"
    ? familyMessages.map((message) => ({
        id: message.id,
        sender: message.authorRole === "FIELD_PERSONNEL" ? `${message.authorName} · Field personnel` : `${message.authorName} · HQ`,
        body: message.message,
        time: `${message.createdAt.slice(11, 16)} UTC`,
        mine: message.authorRole === "FIELD_PERSONNEL",
      }))
    : messages;

  return (
    <section className="operations-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-soft-bg text-teal"><MessageCircle className="h-5 w-5" aria-hidden /></span>
          <div><h2 className="font-semibold text-text-primary">Communication workflow</h2><p className="text-xs text-text-secondary">Select a contact, review availability, then send a message.</p></div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-teal"><Radio className="h-3.5 w-3.5" aria-hidden /> Connected</span>
      </header>

      <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-bg/60 p-3 lg:border-b-0 lg:border-r">
          {(["Main center", "Inter-station", "Family liaison"] as const).map((group) => {
            const Icon = channelIcon[group];
            return <div key={group} className="mb-4 last:mb-0">
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-text-secondary"><Icon className="h-3.5 w-3.5" aria-hidden /> {group}</p>
              <div className="space-y-1">{channels.filter((channel) => channel.group === group).map((channel) => <button key={channel.id} type="button" onClick={() => selectChannel(channel.id)} className={`w-full border-l-2 px-3 py-2 text-left transition-colors ${channel.id === channelId ? "border-cyan bg-surface text-text-primary shadow-sm" : "border-transparent text-text-secondary hover:bg-surface hover:text-text-primary"}`}><span className="block text-sm font-medium">{channel.name}</span><span className="mt-0.5 block text-[11px] leading-snug">{channel.availability}</span></button>)}</div>
            </div>;
          })}
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><div><p className="font-semibold text-text-primary">{activeChannel.name}</p><p className="mt-0.5 text-xs text-text-secondary">{activeChannel.detail}{activeChannel.id === "family" ? ` · ${teamName}` : ""}</p></div><span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${activeChannel.tone === "amber" ? "border-amber/40 bg-amber/10 text-amber" : "border-teal/30 bg-teal-soft-bg text-teal"}`}>{activeChannel.availability}</span></div>
          <div aria-live="polite" className="min-h-28 space-y-3 p-4 sm:p-5">
            {activeChannel.id === "family" && familyLoading ? <p className="text-sm text-text-secondary">Loading family updates…</p> : null}
            {activeChannel.id === "family" && familyError ? <p role="alert" className="text-sm text-red">{familyError}</p> : null}
            {activeChannel.id === "family" && !familyLoading && !familyContactExists ? <p className="text-sm text-text-secondary">HQ must register your family contact before you can send updates.</p> : null}
            {visibleMessages.map((message) => <article key={message.id} className={message.mine ? "ml-auto max-w-[88%]" : "max-w-[88%]"}><div className={message.mine ? "border border-cyan/30 bg-ice/20 px-3 py-2.5" : "border border-border bg-bg px-3 py-2.5"}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-text-primary">{message.sender}</p><time className="font-mono text-[10px] text-text-secondary">{message.time}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{message.body}</p></div></article>)}
            {activeChannel.id === "family" && !familyLoading && familyContactExists && familyMessages.length === 0 ? <p className="text-sm text-text-secondary">No family updates yet. Messages sent here will appear in your linked Family portal.</p> : null}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-border bg-bg/60 p-3 sm:p-4"><label className="sr-only" htmlFor="message">Message {activeChannel.name}</label><input id="message" maxLength={1000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${activeChannel.name}…`} disabled={activeChannel.id === "family" && (!familyContactExists || familyLoading)} className="min-w-0 flex-1 border border-border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:opacity-60" /><Button type="submit" size="sm" className="shrink-0" disabled={sending || !draft.trim() || (activeChannel.id === "family" && !familyContactExists)}><Send className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></Button></form>
          <p className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-[11px] text-text-secondary"><ShieldCheck className="h-3.5 w-3.5 text-teal" aria-hidden /> {activeChannel.id === "family" ? "Messages go only to your linked family contact. Avoid sensitive operational details." : "Messages are queued automatically when offline. Family updates are limited to approved wellbeing information."}</p>
        </div>
      </div>
    </section>
  );
}
