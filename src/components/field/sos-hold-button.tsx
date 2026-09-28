"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import { queueFieldOperation } from "@/lib/field/queue-operation";
import { listQueuedOperations } from "@/lib/field/offline-db";
import { cn } from "@/lib/utils";

const HOLD_MS = 3000;

export function SosHoldButton({
  missionId,
  activeSos = false,
}: {
  missionId?: string;
  activeSos?: boolean;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);

  const clearTimers = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  async function sendSos() {
    setSending(true);
    try {
      const queued = await queueFieldOperation("SOS", {
        missionId,
        message: activeSos
          ? "Field personnel confirmed an update to the active SOS."
          : "Hold-to-confirm SOS from field device.",
        simulatedLatitude: -71.02,
        simulatedLongitude: 12.14,
      });

      const stillQueued = (await listQueuedOperations()).some(
        (operation) => operation.clientOperationId === queued.clientOperationId
      );
      if (stillQueued) {
        toast.error("SOS saved on this device. Sync is needed to notify HQ.");
      } else {
        toast.success(activeSos ? "SOS update sent to HQ." : "SOS sent to HQ.");
      }
      router.refresh();
    } catch {
      toast.error("Could not send or save SOS. Try again when safe.");
    } finally {
      setSending(false);
    }
  }

  function startHold() {
    if (sending || holding) return;
    setHolding(true);
    const started = Date.now();
    interval.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / HOLD_MS) * 100);
      setProgress(pct);
    }, 50);
    timer.current = setTimeout(() => {
      clearTimers();
      void sendSos();
    }, HOLD_MS);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startHold();
    }
  }

  return (
    <button
      type="button"
      disabled={sending}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        startHold();
      }}
      onPointerUp={clearTimers}
      onPointerCancel={clearTimers}
      onKeyDown={handleKeyDown}
      onKeyUp={clearTimers}
      onBlur={clearTimers}
      className={cn(
        "relative flex h-14 w-full touch-none select-none items-center justify-center gap-3 overflow-hidden rounded-[4px] border-2 border-red bg-red text-lg font-medium text-white disabled:cursor-wait disabled:opacity-60",
        holding && "ring-2 ring-amber ring-offset-2 ring-offset-bg"
      )}
      aria-label={activeSos ? "Hold for three seconds to send an SOS update" : "Hold for three seconds to send SOS"}
      aria-describedby="sos-hold-instructions"
    >
      <span
        className="absolute inset-y-0 left-0 bg-white/25 transition-[width]"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
      <Siren className="relative h-6 w-6 shrink-0" aria-hidden />
      <span className="relative">
        {sending
          ? "Sending SOS…"
          : holding
            ? `Hold… ${Math.ceil((HOLD_MS - (progress / 100) * HOLD_MS) / 1000)}s`
            : activeSos
              ? "Hold to update HQ (3s)"
              : "Hold to send SOS (3s)"}
      </span>
    </button>
  );
}
