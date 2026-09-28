"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

type HqHeaderProps = {
  title: string;
  subtitle?: string;
  userName?: string;
};

export function HqHeader({ title, subtitle, userName }: HqHeaderProps) {
  return (
    <header className="animate-rise-in border-b border-border bg-surface">
      <div className="expedition-masthead relative flex min-h-14 items-center justify-between gap-4 px-5 py-3 text-white sm:px-8">
        <div className="relative z-10 min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight sm:text-base">CryoLink Logistics &amp; Asset Management System</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/70">HQ / Operations dashboard</p>
        </div>
        <p className="relative z-10 hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/75 md:block">Connected · Prepared · Safer</p>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Operations console</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {userName ? <p className="hidden text-sm text-text-secondary sm:block">{userName}</p> : null}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
