import { MissionPanel } from "@/components/field/mission-panel";
import { MissionMapPanel } from "@/components/field/mission-map-panel";
import { getSession } from "@/lib/auth/session";
import { getFieldDashboard } from "@/lib/field/dashboard";
import { redirect } from "next/navigation";

export default async function FieldMissionPage() {
  const session = await getSession();
  if (!session?.personnelId) redirect("/");

  const dashboard = await getFieldDashboard(session.personnelId);
  if (!dashboard) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-teal">{dashboard.expedition.code}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Mission &amp; Map</h1>
      </div>
      <MissionMapPanel
        mission={dashboard.activeMission}
        station={dashboard.station}
        teamName={dashboard.personnel.teamName}
        checkIns={dashboard.recentCheckIns}
      />
      <MissionPanel activeMission={dashboard.activeMission} recentCheckIns={dashboard.recentCheckIns} />
    </div>
  );
}
