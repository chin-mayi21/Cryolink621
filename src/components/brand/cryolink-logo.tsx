import Link from "next/link";
import { cn } from "@/lib/utils";

type CryoLinkLogoProps = {
  className?: string;
  compact?: boolean;
  /** White text for dark sidebars */
  inverted?: boolean;
  href?: string | null;
};

export function CryoLinkLogo({ className, compact, inverted, href = "/" }: CryoLinkLogoProps) {
  const mark = (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[5px] shadow-sm",
        compact ? "h-8 w-8" : "h-10 w-10",
        inverted
          ? "bg-white/15 ring-1 ring-white/25"
          : "bg-gradient-to-br from-ice to-surface ring-1 ring-border"
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(compact ? "h-4 w-4" : "h-5 w-5", inverted ? "text-white" : "text-cyan")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M2.5 18.5 9.1 7l3 5 2.3-3.9 7.1 10.4" strokeWidth="2" />
        <path d="m10.9 18.5 4.3-7.1 6.3 7.1" strokeWidth="2" />
      </svg>
      <span className="cryolink-mark-pulse absolute inset-0 rounded-[6px]" />
    </div>
  );

  const wordmark = (
    <div className="min-w-0">
      <p
        className={cn(
          "font-display font-bold tracking-tight",
          compact ? "text-base" : "text-xl sm:text-2xl",
          inverted
            ? "text-white"
            : "bg-gradient-to-r from-cyan via-[#5a9fd4] to-navy bg-clip-text text-transparent"
        )}
      >
        CryoLink
      </p>
      {!compact ? (
        <p
          className={cn(
            "mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em]",
            inverted ? "text-white/65" : "text-text-secondary"
          )}
        >
          Logistics & asset management
        </p>
      ) : null}
    </div>
  );

  const inner = (
    <div className={cn("flex items-center gap-3", className)}>
      {mark}
      {wordmark}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-[4px] outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
        {inner}
      </Link>
    );
  }

  return inner;
}
