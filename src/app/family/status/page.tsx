import { getSession } from "@/lib/auth/session";
import { getFamilyStatusForLinkedMember } from "@/lib/family/status";
import { FamilyMemberHeader } from "@/components/family/family-member-header";
import { FamilyWellnessCard } from "@/components/family/family-wellness-card";
import { FamilyCheckInPanel } from "@/components/family/family-check-in-panel";
import { FamilyRefreshButton } from "@/components/family/family-refresh-button";
import { redirect } from "next/navigation";

export default async function FamilyStatusPage() {
  const session = await getSession();
  if (!session?.nextOfKinForId) redirect("/");

  const status = await getFamilyStatusForLinkedMember(session.nextOfKinForId);
  if (!status) {
    return (
      <p className="text-sm text-text-secondary">
        Linked expedition member could not be loaded. Run <span className="font-mono">npm run db:seed</span>.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <FamilyMemberHeader member={status.member} expedition={status.expedition} />
      <FamilyWellnessCard wellness={status.wellness} />
      <section className="operations-panel p-4 sm:p-5" aria-labelledby="family-updates-heading">
        <header className="border-b border-border pb-3">
          <h2 id="family-updates-heading" className="font-display text-lg font-semibold text-text-primary">Updates from HQ</h2>
          <p className="mt-1 text-xs text-text-secondary">Direct updates for your linked family contact.</p>
        </header>
        {status.familyUpdates.length ? (
          <ol className="mt-4 space-y-4">
            {status.familyUpdates.map((update) => (
              <li key={update.id} className="border-l-2 border-teal/50 pl-3">
                <p className="text-xs font-semibold text-text-secondary">{update.authorLabel}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{update.message}</p>
                <p className="mt-1 font-mono text-[10px] text-text-secondary">{update.createdAt.slice(0, 16).replace("T", " ")} UTC</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">No direct updates yet. Confirmed check-ins appear below.</p>
        )}
      </section>
      <FamilyCheckInPanel lastCheckIn={status.lastCheckIn} recentCheckIns={status.recentCheckIns} />
      <div className="flex flex-col gap-3 border border-border bg-bg px-4 py-3 text-xs leading-relaxed text-text-secondary rounded-[2px]">
        <p>
          This portal shows <strong className="font-medium text-text-primary">confirmed</strong> check-ins for your
          linked member only. It does not expose other teams, cargo, inventory, or HQ investigation notes.
        </p>
        <FamilyRefreshButton />
      </div>
    </div>
  );
}
