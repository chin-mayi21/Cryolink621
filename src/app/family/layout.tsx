import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { CryoLinkLogo } from "@/components/brand/cryolink-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "FAMILY_NOK") {
    redirect("/");
  }

  if (!session.nextOfKinForId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-sm text-text-secondary">
          Your account is not linked to an expedition member. Contact HQ to complete NOK registration.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between border-b border-border/80 bg-surface/90 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-4">
        <CryoLinkLogo compact href="/family/status" />
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[10rem] truncate text-sm text-text-secondary sm:block">{session.name}</span>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
