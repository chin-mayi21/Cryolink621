"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/design/status-badge";
import { queueFieldOperation } from "@/lib/field/queue-operation";
import type { FieldDashboard } from "@/lib/field/dashboard";

export function MissionPanel({
  activeMission,
  recentCheckIns,
}: {
  activeMission: FieldDashboard["activeMission"];
  recentCheckIns: FieldDashboard["recentCheckIns"];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!activeMission) {
    return (
      <p className="border border-dashed border-border p-6 text-center text-sm text-text-secondary">
        No mission assigned. HQ will add you via expedition workflow.
      </p>
    );
  }

  const statusTone =
    activeMission.status === "ACTIVE"
      ? "accent"
      : activeMission.status === "OVERDUE"
        ? "warning"
        : "neutral";

  async function submitCheckIn() {
    if (!activeMission) return;
    setBusy(true);
    try {
      await queueFieldOperation("CHECK_IN", {
        missionId: activeMission.id,
        message: message || "Routine check-in — all nominal.",
        simulatedLatitude: -71.02,
        simulatedLongitude: 12.14,
      });
      toast.success("Check-in queued.");
      setMessage("");
      router.refresh();
    } catch {
      toast.error("Could not queue check-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <article className="border border-border bg-surface p-4 rounded-[2px]">
        <p className="font-mono text-xs text-cyan">{activeMission.code}</p>
        <h2 className="font-display text-xl font-semibold">{activeMission.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge label={activeMission.status} tone={statusTone} />
          <span className="font-mono text-xs text-text-secondary">
            Check-in every {activeMission.checkInIntervalMinutes}m
          </span>
        </div>
        {activeMission.briefingNotes ? (
          <p className="mt-3 text-sm text-text-secondary">{activeMission.briefingNotes}</p>
        ) : null}
        <p className="mt-2 font-mono text-[10px] text-text-secondary">
          Return window ends {activeMission.expectedReturnAt.slice(0, 16)}Z
        </p>
      </article>

      <div id="check-in" className="scroll-mt-4 border border-border bg-surface p-4 rounded-[2px]">
        <h3 className="font-medium text-text-primary">Submit check-in</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Controlled action only — queues offline if needed. GPS labeled simulated.
        </p>
        <Input
          className="mt-3"
          placeholder="Short status message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button className="mt-3 w-full" variant="navy" size="field" disabled={busy} onClick={submitCheckIn}>
          Queue check-in
        </Button>
      </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-secondary">Mission check-ins</h3>
        <ul className="mt-2 space-y-2">
          {recentCheckIns.length === 0 ? (
            <li className="text-xs text-text-secondary">None logged yet.</li>
          ) : (
            recentCheckIns.map((c) => (
                  <li key={c.id} className="border border-border px-3 py-2 font-mono text-[10px] rounded-[2px]">
                    {c.checkedInAt.slice(0, 16)}Z · {c.personnelName} · {c.status} — {c.message ?? "—"}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
