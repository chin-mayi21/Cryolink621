"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Users,
  Map,
  MapPinned,
  LifeBuoy,
  Package,
  Boxes,
  Wrench,
  Siren,
  FileBarChart,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CryoLinkLogo } from "@/components/brand/cryolink-logo";

const navItems = [
  { href: "/hq/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/hq/expeditions", label: "Expeditions", icon: Compass },
  { href: "/hq/personnel", label: "Personnel & Teams", icon: Users },
  { href: "/hq/family", label: "Family updates", icon: HeartHandshake },
  { href: "/hq/missions", label: "Missions", icon: Map },
  { href: "/hq/map", label: "Field map", icon: MapPinned },
  { href: "/hq/rescue", label: "Rescue", icon: LifeBuoy },
  { href: "/hq/cargo", label: "Cargo & Logistics", icon: Package },
  { href: "/hq/inventory", label: "Inventory", icon: Boxes },
  { href: "/hq/assets", label: "Assets", icon: Wrench },
  { href: "/hq/emergency", label: "Emergency Control Center", icon: Siren },
  { href: "/hq/reports", label: "Reports & Audit", icon: FileBarChart },
] as const;

export function HqSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hq-sidebar-gradient flex h-auto w-full shrink-0 flex-col border-b border-white/10 text-white md:h-dvh md:w-56 md:border-b-0 md:border-r">
      <div className="border-b border-white/10 px-4 py-3 md:py-4">
        <CryoLinkLogo compact inverted href="/hq/overview" />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-white/55">Operations / HQ</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-1 md:flex-col md:space-y-0.5 md:overflow-x-hidden md:overflow-y-auto md:py-3" aria-label="HQ navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/hq/personnel" && pathname.startsWith("/hq/teams"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors md:min-h-9 md:shrink md:gap-3 md:border-b-0 md:border-l-2 md:text-[13px]",
                active
                  ? "border-cyan bg-white/10 text-white md:bg-white/10"
                  : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-snug">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-white/10 px-4 py-3 md:block">
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">Position feed</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-white/75">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Simulated check-ins
        </p>
      </div>
    </aside>
  );
}
