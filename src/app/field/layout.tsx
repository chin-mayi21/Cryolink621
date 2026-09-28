import { FieldBottomNav } from "@/components/layout/field-bottom-nav";
import { FieldSyncProvider } from "@/components/field/field-sync-provider";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { CryoLinkLogo } from "@/components/brand/cryolink-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "CryoLink Field" },
};

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "FIELD_PERSONNEL") {
    redirect("/");
  }

  return (
    <FieldSyncProvider>
      <div className="flex min-h-dvh flex-col bg-bg pb-24">
        <header className="expedition-masthead flex items-center justify-between px-4 py-3 text-white">
          <CryoLinkLogo compact inverted href="/field/home" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[10rem] truncate text-sm text-white/75 sm:block">{session.name}</span>
            <LogoutButton />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
        <FieldBottomNav />
      </div>
    </FieldSyncProvider>
  );
}
