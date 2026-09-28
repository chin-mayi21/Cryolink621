"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, CloudOff, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { flushFieldQueue } from "@/lib/field/sync-client";
import { enqueueFieldOperation, listQueuedOperations } from "@/lib/field/offline-db";
import type { FieldOperationType } from "@/lib/field/operations";
import { useFieldConnectivity } from "@/stores/field-connectivity";

export function SyncPanel({
  nearestStation,
}: {
  nearestStation?: { name: string; code: string; latitude: number | null; longitude: number | null } | null;
}) {
  const router = useRouter();
  const forceOffline = useFieldConnectivity((s) => s.forceOffline);
  const setForceOffline = useFieldConnectivity((s) => s.setForceOffline);
  const browserOnline = useFieldConnectivity((s) => s.browserOnline);
  const pendingCount = useFieldConnectivity((s) => s.pendingCount);
  const setPendingCount = useFieldConnectivity((s) => s.setPendingCount);
  const online = browserOnline && !forceOffline;
  const checkingConnection = browserOnline === null && !forceOffline;
  const offlineStation = nearestStation ?? {
    name: "Nearest station",
    code: "—",
    latitude: -71.02,
    longitude: 12.14,
  };
  const [busy, setBusy] = useState(false);
  const [queuePreview, setQueuePreview] = useState<string[]>([]);
  const [operationType, setOperationType] = useState<FieldOperationType>("CHECK_IN");
  const [message, setMessage] = useState("");
  const [missionId, setMissionId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const refreshQueue = useCallback(async () => {
    const rows = await listQueuedOperations();
    setPendingCount(rows.length);
    setQueuePreview(rows.map((r) => `${r.operationType} · ${r.clientCreatedAt.slice(11, 19)}`));
  }, [setPendingCount]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listQueuedOperations();
      if (cancelled) return;
      setPendingCount(rows.length);
      setQueuePreview(rows.map((r) => `${r.operationType} · ${r.clientCreatedAt.slice(11, 19)}`));
    })();
    return () => {
      cancelled = true;
    };
  }, [setPendingCount]);

  async function syncNow() {
    setBusy(true);
    try {
      const result = await flushFieldQueue();
      await refreshQueue();
      router.refresh();
      if (result.synced.length) toast.success(`Synced ${result.synced.length} operation(s).`);
      if (result.failed.length) toast.error(`${result.failed.length} failed — still in queue.`);
      if (!result.synced.length && !result.failed.length) toast.message("Queue empty.");
    } finally {
      setBusy(false);
    }
  }

  async function queueOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const coordinates = {
      ...(latitude.trim() ? { simulatedLatitude: Number(latitude) } : {}),
      ...(longitude.trim() ? { simulatedLongitude: Number(longitude) } : {}),
    };

    let payload: Record<string, unknown>;
    if (operationType === "INVENTORY_CONSUMPTION") {
      payload = { inventoryItemId: inventoryItemId.trim(), quantity: Number(quantity), ...(message.trim() ? { note: message.trim() } : {}) };
    } else if (operationType === "SOS") {
      payload = { ...(missionId.trim() ? { missionId: missionId.trim() } : {}), message: message.trim(), ...coordinates };
    } else if (operationType === "CHECK_IN") {
      payload = { missionId: missionId.trim(), ...(message.trim() ? { message: message.trim() } : {}), ...coordinates };
    } else {
      payload = coordinates;
    }

    await enqueueFieldOperation(operationType, payload);
    await refreshQueue();
    setMessage("");
    toast.success("Operation saved to the offline queue.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border border-border bg-surface p-4 rounded-[2px]">
        {checkingConnection ? (
          <Cloud className="h-6 w-6 text-text-secondary" aria-hidden />
        ) : online ? (
          <Cloud className="h-6 w-6 text-cyan" aria-hidden />
        ) : (
          <CloudOff className="h-6 w-6 text-amber" aria-hidden />
        )}
        <div>
          <p className="font-medium">
            {checkingConnection ? "Checking connection…" : online ? "Online" : "Offline (demo or network)"}
          </p>
          <p className="text-sm text-text-secondary">
            Pending sync ({pendingCount}) — idempotent via client operation IDs
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between border border-border bg-bg px-4 py-3 text-sm rounded-[2px]">
        <span>Simulate offline (demo)</span>
        <input
          type="checkbox"
          checked={forceOffline}
          onChange={(e) => setForceOffline(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
      </label>

      {!online ? (
        <div className="operations-panel overflow-hidden">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">Offline draft map</p>
            <p className="mt-1 text-sm font-medium text-text-primary">Nearest station: {offlineStation.name} {offlineStation.code !== "—" ? `(${offlineStation.code})` : ""}</p>
          </div>

          <div className="relative h-48 overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top,#1d3f52_0%,#0b1a27_42%,#08141d_100%)]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M8 24 C16 18, 24 18, 32 23 L40 32 L50 27 L62 34 L72 29 L80 36 L82 48 L72 63 L58 70 L50 86 L26 80 L18 65 L10 51 Z" fill="rgba(13,94,108,0.74)" stroke="rgba(158,222,230,0.7)" strokeWidth="1" />
              <path d="M18 41 L32 45 L44 40 L58 48 L66 52 L72 66 L58 62 L44 70 L28 62 Z" fill="rgba(13,125,145,0.5)" stroke="rgba(158,222,230,0.5)" strokeWidth="0.8" />
              <path d="M30 22 L42 12 L54 18 L60 12 L76 20 L70 30 L52 28 L38 32 Z" fill="rgba(18,59,73,0.5)" stroke="rgba(158,222,230,0.4)" strokeWidth="0.7" />
            </svg>
            <div
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan shadow-lg"
              style={{
                left: `${Math.min(94, Math.max(6, (offlineStation.longitude ?? 12.14) + 180) / 3.6)}%`,
                top: `${Math.min(94, Math.max(6, 90 - ((offlineStation.latitude ?? -71.02) + 90) * 100 / 180))}%`,
              }}
              aria-label={`${offlineStation.name} marker`}
            />
          </div>

          <div className="grid gap-3 border-t border-border bg-bg/30 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-secondary">Latitude</p>
              <p className="mt-1 font-mono text-sm text-text-primary">{(offlineStation.latitude ?? -71.02).toFixed(2)}°</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-secondary">Longitude</p>
              <p className="mt-1 font-mono text-sm text-text-primary">{(offlineStation.longitude ?? 12.14).toFixed(2)}°</p>
            </div>
          </div>

          <form onSubmit={queueOperation} className="space-y-4 p-4 sm:p-5">
            <div>
              <p className="font-semibold text-text-primary">Add to offline queue</p>
              <p className="mt-1 text-xs text-text-secondary">Capture the operation now; it will be securely sent when connection returns.</p>
            </div>

            <label className="block text-sm font-medium text-text-primary">
              Operation
              <select
                value={operationType}
                onChange={(event) => setOperationType(event.target.value as FieldOperationType)}
                className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              >
                <option value="CHECK_IN">Check-in</option>
                <option value="INVENTORY_CONSUMPTION">Inventory consumption</option>
                <option value="DEVICE_HEARTBEAT">Device position update</option>
                <option value="SOS">SOS alert</option>
              </select>
            </label>

            {operationType === "CHECK_IN" || operationType === "SOS" ? (
              <label className="block text-sm font-medium text-text-primary">
                Mission ID {operationType === "CHECK_IN" ? "*" : "(optional)"}
                <input value={missionId} onChange={(event) => setMissionId(event.target.value)} required={operationType === "CHECK_IN"} placeholder="e.g. MSN-ALPHA-12" className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" />
              </label>
            ) : null}

            {operationType === "INVENTORY_CONSUMPTION" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="block text-sm font-medium text-text-primary">Inventory item ID *<input value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)} required placeholder="e.g. INV-MED-01" className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
                <label className="block text-sm font-medium text-text-primary">Quantity *<input value={quantity} onChange={(event) => setQuantity(event.target.value)} required min="0.01" step="0.01" type="number" className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
              </div>
            ) : null}

            {operationType !== "INVENTORY_CONSUMPTION" ? (
              <label className="block text-sm font-medium text-text-primary">{operationType === "SOS" ? "Emergency details *" : "Note"}<textarea value={message} onChange={(event) => setMessage(event.target.value)} required={operationType === "SOS"} rows={3} placeholder={operationType === "SOS" ? "Describe the emergency" : "Add a brief status note"} className="mt-1.5 w-full resize-y border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
            ) : (
              <label className="block text-sm font-medium text-text-primary">Note<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Reason or usage note" className="mt-1.5 w-full resize-y border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
            )}

            {operationType !== "INVENTORY_CONSUMPTION" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-text-primary">Latitude <input value={latitude} onChange={(event) => setLatitude(event.target.value)} type="number" min="-90" max="90" step="any" placeholder="Optional" className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
                <label className="block text-sm font-medium text-text-primary">Longitude <input value={longitude} onChange={(event) => setLongitude(event.target.value)} type="number" min="-180" max="180" step="any" placeholder="Optional" className="mt-1.5 h-11 w-full border border-border bg-surface px-3 text-sm font-normal text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20" /></label>
              </div>
            ) : null}

            <Button type="submit" variant="navy" className="w-full"><Plus className="h-4 w-4" aria-hidden /> Add to queue</Button>
          </form>
        </div>
      ) : null}

      <Button variant="navy" size="field" className="gap-2" disabled={busy || !online} onClick={syncNow}>
        <RefreshCw className="h-5 w-5" aria-hidden />
        Sync now
      </Button>

      <Button variant="secondary" size="sm" onClick={refreshQueue}>
        Refresh queue list
      </Button>

      {queuePreview.length > 0 ? (
        <ul className="space-y-1 font-mono text-[10px] text-text-secondary">
          {queuePreview.map((line, i) => (
            <li key={i} className="border border-border px-2 py-1 rounded-[2px]">{line}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-text-secondary">
        Status uses icon + text, not color alone. Operations replay into <span className="font-mono">SyncOperation</span> on the server.
      </p>
    </div>
  );
}
