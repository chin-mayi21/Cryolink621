"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CryoLinkBackdrop } from "@/components/brand/cryolink-backdrop";
import { CryoLinkLogo } from "@/components/brand/cryolink-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ROLE_ENTRIES } from "@/lib/auth/role-entry";
import { cn } from "@/lib/utils";

export function RoleEntryScreen() {
  return (
    <div className="relative min-h-dvh bg-bg">
      <CryoLinkBackdrop />

      <header className="expedition-masthead animate-rise-in relative z-10 flex items-center justify-between px-6 py-4 text-white">
        <CryoLinkLogo inverted />
        <div className="flex items-center gap-4">
          <p className="hidden font-mono text-[10px] uppercase tracking-widest text-white/75 sm:block">
            MoES / NCPOR
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div
          className="animate-rise-in max-w-2xl border-b border-border/80 pb-8"
          style={{ animationDelay: "80ms" }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">CryoLink platform</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
            Sign in to <span className="text-navy">CryoLink</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
            Select your access role to continue. Authorization is verified on the server after sign-in — this
            selection is for navigation only.
          </p>
        </div>

        <div
          className="animate-rise-in mt-6 rich-card border-cyan/20 bg-surface/90 px-4 py-3 text-xs text-text-secondary backdrop-blur-sm"
          style={{ animationDelay: "140ms" }}
        >
          <span className="font-medium text-text-primary">Judge demo:</span> seed once, then sign in with{" "}
          <span className="font-mono">demo-official@ncpor.test</span> / <span className="font-mono">demo1234</span>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {ROLE_ENTRIES.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <li
                key={entry.role}
                className="animate-rise-in"
                style={{ animationDelay: `${200 + index * 90}ms` }}
              >
                <Link
                  href={`/login?role=${encodeURIComponent(entry.role)}`}
                  className={cn(
                    "group flex h-full flex-col rich-card p-5",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center border border-border bg-gradient-to-br from-ice/40 to-surface rounded-[6px] transition-transform duration-300 group-hover:scale-105"
                      aria-hidden
                    >
                      <Icon className={cn("h-5 w-5", entry.iconAccentClass)} strokeWidth={1.75} />
                    </div>
                    <ChevronRight
                      className="h-4 w-4 translate-x-0 text-cyan opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <h2 className="mt-4 font-display text-lg font-semibold text-text-primary">{entry.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-snug text-text-secondary">{entry.description}</p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-cyan/90">
                    Continue to credentials →
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
