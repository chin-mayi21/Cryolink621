import { SafetyStatusCard } from "@/components/field/safety-status-card";
import { SosHoldButton } from "@/components/field/sos-hold-button";
import { getSession } from "@/lib/auth/session";
import { getFieldDashboard } from "@/lib/field/dashboard";
import { Cloud, MapPinned, Package, Radio } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function FieldHomePage() {
  const session = await getSession();
  if (!session?.personnelId) redirect("/");

  const dashboard = await getFieldDashboard(session.personnelId);
  if (!dashboard) {
    return <p className="text-sm text-text-secondary">Personnel record not found.</p>;
  }

  const dayLabel = dashboard.expedition.missionDay && dashboard.expedition.missionTotalDays
    ? `Day ${dashboard.expedition.missionDay} of ${dashboard.expedition.missionTotalDays}`
    : dashboard.expedition.code;
  const nextCheckIn = dashboard.activeMission?.lastCheckInAt
    ? new Date(
        Date.parse(dashboard.activeMission.lastCheckInAt) +
          dashboard.activeMission.checkInIntervalMinutes * 60_000
      )
    : null;
  const nameParts = dashboard.personnel.fullName.split(" ");
  const firstName = nameParts[0].endsWith(".") ? nameParts[1] ?? nameParts[0] : nameParts[0];
  const quickLinks = [
    { href: "/field/mission", label: "Mission & route", icon: MapPinned, detail: "Briefing and check-ins" },
    { href: "/field/mission#check-in", label: "Check in", icon: Radio, detail: "Send a status update" },
    { href: "/field/inventory", label: "Gear & stock", icon: Package, detail: "Assigned gear and station stock" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          <section className="border-b border-border pb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-teal">
              {dashboard.expedition.code} · Field personnel
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text-primary">
              Welcome, {firstName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span>{dashboard.personnel.teamName ?? "Unassigned team"}</span>
              <span aria-hidden>·</span>
              <span>{dayLabel}</span>
              <span className="font-mono text-[10px]">{dashboard.personnel.employeeCode}</span>
            </div>
          </section>

          <Link
            href="/field/mission"
            className="block border border-[#244765] bg-[#102b43] p-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/65">Current mission</p>
              <span className="border border-white/20 px-2 py-1 font-mono text-[10px] text-white/85">
                {dashboard.activeMission?.status ?? "UNASSIGNED"}
              </span>
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold leading-snug sm:text-xl">
              {dashboard.activeMission?.title ?? "No mission assigned"}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3 text-xs">
              <span className="font-mono text-white/75">
                {dashboard.activeMission?.code ?? dashboard.personnel.teamName ?? "Awaiting assignment"}
              </span>
              <span className="text-white/75">
                {nextCheckIn
                  ? `Next check-in ${nextCheckIn.toISOString().slice(11, 16)} UTC`
                  : "Check-in time not set"}
              </span>
            </div>
          </Link>

          <section aria-label="Field actions">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Field actions</h2>
              <Link href="/field/sync" className="inline-flex items-center gap-1.5 text-xs text-teal underline-offset-2 hover:underline">
                <Cloud className="h-3.5 w-3.5" aria-hidden />
                Sync status
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {quickLinks.map(({ href, label, icon: Icon, detail }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex min-h-24 flex-col justify-between border border-border bg-surface p-3 transition-colors hover:border-teal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:min-h-28 sm:p-4"
                >
                  <Icon className="h-5 w-5 text-teal" aria-hidden />
                  <span className="mt-3 block">
                    <span className="block text-sm font-medium text-text-primary">{label}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-text-secondary">{detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="min-w-0 space-y-3">
          <SafetyStatusCard dashboard={dashboard} />
          <SosHoldButton
            missionId={dashboard.activeMission?.id}
            activeSos={dashboard.safety.tone === "sos"}
          />
          {dashboard.safety.tone === "sos" ? (
            <p id="sos-hold-instructions" className="text-xs leading-relaxed text-text-secondary">
              SOS is active. Hold to send HQ an update; it updates the existing alert instead of creating a duplicate.
            </p>
          ) : <p id="sos-hold-instructions" className="text-xs leading-relaxed text-text-secondary">Hold for 3 seconds to confirm an SOS. Release early to cancel.</p>}
        </section>
      </div>
    </div>
  );
}
