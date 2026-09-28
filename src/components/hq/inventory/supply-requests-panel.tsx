import { ClipboardList } from "lucide-react";
import type { SupplyRequestStatus } from "@prisma/client";

export type SupplyRequestRow = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string | null;
  status: SupplyRequestStatus;
  createdAt: string;
  personnelName: string;
  employeeCode: string;
  stationName: string;
};

export function SupplyRequestsPanel({ requests }: { requests: SupplyRequestRow[] }) {
  return (
    <section className="operations-panel mt-8 overflow-hidden" aria-labelledby="supply-requests-heading">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ClipboardList className="h-4 w-4 text-teal" aria-hidden />
        <div>
          <h2 id="supply-requests-heading" className="font-display text-base font-semibold text-text-primary">Field supply requests</h2>
          <p className="font-mono text-[10px] text-text-secondary">{requests.length} request(s) across your expeditions</p>
        </div>
      </header>
      {requests.length ? (
        <ul className="divide-y divide-border">
          {requests.map((request) => (
            <li key={request.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-text-primary">{request.itemName} <span className="font-mono text-xs">· {request.quantity} {request.unit}</span></p>
                <p className="mt-1 text-xs text-text-secondary">{request.personnelName} · {request.employeeCode} · {request.stationName}</p>
                {request.note ? <p className="mt-1 text-xs text-text-secondary">{request.note}</p> : null}
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <span className={`border px-2 py-1 font-mono text-[10px] ${request.status === "OPEN" ? "border-amber/40 bg-amber/10 text-amber" : request.status === "FULFILLED" ? "border-teal/30 bg-teal-soft-bg text-teal" : "border-border bg-bg text-text-secondary"}`}>{request.status}</span>
                <time className="font-mono text-[10px] text-text-secondary">{request.createdAt.slice(0, 16).replace("T", " ")} UTC</time>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="px-4 py-5 text-sm text-text-secondary">No field supply requests.</p>}
    </section>
  );
}