import { AlertTriangle, Clock, Radio, Siren, WifiOff } from "lucide-react";
import { StatusBadge } from "@/components/design/status-badge";
import type { AttentionItem, AttentionSignalType } from "@/lib/hq/attention";

function iconFor(type: AttentionSignalType) {
  switch (type) {
    case "CHECK_IN_OVERDUE":
      return Clock;
    case "RETURN_OVERDUE":
      return AlertTriangle;
    case "DISCONNECTED":
      return WifiOff;
    case "EMERGENCY":
      return Siren;
  }
}

function labelFor(type: AttentionSignalType) {
  switch (type) {
    case "CHECK_IN_OVERDUE":
      return "Check-in overdue";
    case "RETURN_OVERDUE":
      return "Return overdue";
    case "DISCONNECTED":
      return "Disconnected";
    case "EMERGENCY":
      return "Emergency";
  }
}

export function AttentionRequiredPanel({ items }: { items: AttentionItem[] }) {
  return (
    <section className="rich-card overflow-hidden" aria-labelledby="attention-required-heading">
      <header className="hq-sidebar-gradient flex items-center justify-between border-b border-white/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber" strokeWidth={2} aria-hidden />
          <h2 id="attention-required-heading" className="font-display text-base font-semibold text-white">
            Attention required
          </h2>
        </div>
        <span className="font-mono text-xs text-white/80">{items.length} signal(s)</span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-secondary">
          No attention signals from live rules — check-in intervals, return windows, device sync, and open incidents are
          evaluated separately.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          {items.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <li key={item.id} className="flex min-w-0 items-start justify-between gap-3 bg-surface px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-text-primary">{item.title}</p>
                  <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-text-secondary">{item.detail}</p>
                </div>
                <StatusBadge
                  label={labelFor(item.type)}
                  tone={item.tone}
                  icon={Icon}
                  className="mt-0.5 shrink-0"
                />
              </li>
            );
          })}
        </ul>
      )}
      <footer className="border-t border-border px-4 py-2">
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Radio className="h-3 w-3 text-teal" aria-hidden />
          Connectivity loss is visibility only — never auto-declared as emergency.
        </p>
      </footer>
    </section>
  );
}
