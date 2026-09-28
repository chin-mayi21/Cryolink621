import { HqPageShell } from "@/components/layout/hq-page-shell";
import { FamilyUpdatesManager } from "@/components/hq/family/family-updates-manager";

export default function HqFamilyPage() {
  return (
    <HqPageShell
      title="Family updates"
      subtitle="Manage each roster member’s family contact and publish confirmed, family-safe updates."
    >
      <FamilyUpdatesManager />
    </HqPageShell>
  );
}