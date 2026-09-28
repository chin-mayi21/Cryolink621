"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listQueuedOperations } from "@/lib/field/offline-db";
import { flushFieldQueue } from "@/lib/field/sync-client";
import { useFieldConnectivity } from "@/stores/field-connectivity";

export function FieldSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setPendingCount = useFieldConnectivity((s) => s.setPendingCount);
  const setBrowserOnline = useFieldConnectivity((s) => s.setBrowserOnline);
  const forceOffline = useFieldConnectivity((s) => s.forceOffline);

  const refreshPending = useCallback(async () => {
    const pending = await listQueuedOperations();
    setPendingCount(pending.length);
  }, [setPendingCount]);

  const tryFlush = useCallback(async () => {
    if (useFieldConnectivity.getState().isEffectivelyOnline()) {
      await flushFieldQueue();
      await refreshPending();
      router.refresh();
    }
  }, [refreshPending, router]);

  useEffect(() => {
    const updateConnection = () => setBrowserOnline(navigator.onLine);
    updateConnection();
    refreshPending();
    tryFlush();

    const onOnline = () => {
      updateConnection();
      tryFlush();
    };
    const onOffline = () => updateConnection();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [forceOffline, refreshPending, setBrowserOnline, tryFlush]);

  return children;
}
