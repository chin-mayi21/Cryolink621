import { CommunicationPanel } from "@/components/field/communication-panel";
import { getSession } from "@/lib/auth/session";
import { getFieldDashboard } from "@/lib/field/dashboard";
import { redirect } from "next/navigation";

export default async function FieldCommunicationPage() {
  const session = await getSession();
  if (!session?.personnelId) redirect("/");

  const dashboard = await getFieldDashboard(session.personnelId);
  if (!dashboard) redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-teal">{dashboard.expedition.code} · Field personnel</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-text-primary">Communication</h1>
        <p className="mt-1 text-sm text-text-secondary">Coordinate with HQ and your expedition team.</p>
      </div>
      <CommunicationPanel teamName={dashboard.personnel.teamName ?? "Your team"} />
    </div>
  );
}
