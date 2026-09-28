import { SyncPanel } from "@/components/field/sync-panel";
import { getSession } from "@/lib/auth/session";
import { getFieldDashboard } from "@/lib/field/dashboard";
import { redirect } from "next/navigation";

export default async function FieldSyncPage() {
  const session = await getSession();
  if (!session?.personnelId) redirect("/");

  const dashboard = await getFieldDashboard(session.personnelId);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="font-display text-3xl font-semibold">Sync</h1>
      <SyncPanel nearestStation={dashboard?.station ?? null} />
    </div>
  );
}
