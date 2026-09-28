"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { CryoLinkBackdrop } from "@/components/brand/cryolink-backdrop";
import { CryoLinkLogo } from "@/components/brand/cryolink-logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth/auth-error-messages";
import { redirectToRoleDashboard, signInWithCredentials } from "@/lib/auth/credentials-client";
import { DEMO_PASSWORD, getRoleEntry, isUserRole, type RoleEntryConfig } from "@/lib/auth/role-entry";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

export function RoleAuthScreen({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") ?? "";
  const errorParam = searchParams.get("error");
  const modeParam = searchParams.get("mode");
  const roleEntry = isUserRole(roleParam) ? getRoleEntry(roleParam) : undefined;

  const [mode, setMode] = useState<AuthMode>(
    modeParam === "signup" ? "signup" : initialMode
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState(roleEntry?.demoEmail ?? "");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const error = formError ?? authErrorMessage(errorParam);
  const [loading, setLoading] = useState(false);

  if (!roleEntry) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
        <p className="text-sm text-text-secondary">Select a role on the home page first.</p>
        <Link href="/" className="mt-4 text-sm font-medium text-cyan underline-offset-2 hover:underline">
          Back to role selection
        </Link>
      </div>
    );
  }

  const entry = roleEntry;

  async function runSignIn(targetEmail: string, targetPassword: string) {
    setFormError(null);
    setLoading(true);
    try {
      const result = await signInWithCredentials(targetEmail, targetPassword, entry.role);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      redirectToRoleDashboard(entry.role);
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onDemoLogin() {
    await runSignIn(entry.demoEmail, DEMO_PASSWORD);
  }

  async function onSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runSignIn(email, password);
  }

  async function onSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: entry.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Sign-up failed.");
        return;
      }
      const signInResult = await signInWithCredentials(email, password, entry.role);
      if (!signInResult.ok) {
        setFormError(signInResult.error);
        return;
      }
      redirectToRoleDashboard(entry.role);
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RoleAuthLayout roleEntry={entry}>
      <div className="mt-6 flex rounded-[6px] border border-border bg-surface p-1">
        {(["signin", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "flex-1 rounded-[4px] py-2 text-sm font-medium transition-colors",
              mode === tab ? "bg-cyan/15 text-navy" : "text-text-secondary hover:text-text-primary"
            )}
            onClick={() => setMode(tab)}
          >
            {tab === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="navy"
        size="lg"
        className="mt-4 w-full"
        disabled={loading}
        onClick={onDemoLogin}
      >
        {loading ? "Signing in…" : "Demo login"}
      </Button>
      <p className="mt-2 text-center font-mono text-[10px] text-text-secondary">
        Uses {entry.demoEmail} / {DEMO_PASSWORD}
      </p>

      <div className="mt-6 space-y-4">
        <GoogleSignInButton role={entry.role} disabled={loading} />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase text-text-secondary">or email</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      {mode === "signin" ? (
        <form onSubmit={onSignInSubmit} className="mt-4 space-y-4 rich-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <AuthError message={error} /> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? "Verifying…" : "Sign in with email"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSignUpSubmit} className="mt-4 space-y-4 rich-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password (min. 8 characters)</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? <AuthError message={error} /> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account & continue"}
          </Button>
        </form>
      )}
    </RoleAuthLayout>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-red" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function RoleAuthLayout({ roleEntry, children }: { roleEntry: RoleEntryConfig; children: React.ReactNode }) {
  const RoleIcon = roleEntry.icon;
  const isFieldPersonnel = roleEntry.role === "FIELD_PERSONNEL";
  return (
    <div className="relative min-h-dvh bg-bg">
      <CryoLinkBackdrop />
      <header className="relative z-10 flex items-center justify-between border-b border-border/80 bg-surface/90 px-6 py-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-cyan">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Role selection
        </Link>
        <ThemeToggle />
      </header>
      <div className={cn("relative z-10 mx-auto px-4 py-8 animate-rise-in", isFieldPersonnel ? "max-w-sm" : "max-w-md sm:py-10")}>
        <CryoLinkLogo href="/" />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          {isFieldPersonnel ? "Field personnel access" : roleEntry.title}
        </p>
        <div className="mt-6 flex items-start gap-3 rich-card p-4">
          <div className="flex h-10 w-10 items-center justify-center border border-border bg-bg rounded-[2px]">
            <RoleIcon className={`h-5 w-5 ${roleEntry.iconAccentClass}`} strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text-primary">
              {isFieldPersonnel ? "Expedition access" : "Account access"}
            </p>
            <p className="text-sm text-text-secondary">{roleEntry.description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
