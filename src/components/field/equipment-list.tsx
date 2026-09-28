import { StatusBadge } from "@/components/design/status-badge";

export type EquipmentRow = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: string;
};

export function EquipmentList({ assets, compact = false }: { assets: EquipmentRow[]; compact?: boolean }) {
  if (assets.length === 0) {
    return <p className="text-sm text-text-secondary">No assets registered at your station.</p>;
  }

  return (
    <ul className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 md:grid-cols-2"}>
      {assets.map((a) => (
        <li
          key={a.id}
          className={compact
            ? "flex min-w-0 items-center justify-between gap-3 border border-border bg-surface px-3 py-2"
            : "flex min-w-0 items-center justify-between gap-3 border border-border bg-surface px-4 py-3"}
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wide text-cyan">{a.assetTag}</p>
            <p className="truncate text-sm font-medium text-text-primary">{a.name}</p>
            <p className="text-[11px] text-text-secondary">{a.category}</p>
          </div>
          <StatusBadge
            label={a.status}
            tone={a.status === "OPERATIONAL" ? "success" : a.status === "MAINTENANCE" ? "warning" : "neutral"}
          />
        </li>
      ))}
    </ul>
  );
}
