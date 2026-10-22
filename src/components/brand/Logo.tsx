import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-brand shadow-brand",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 text-brand-foreground" fill="none">
        <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="17.5" cy="6.5" r="2.2" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} dir="ltr">
      <LogoMark />
      <span
        className={cn(
          "font-display text-xl font-bold tracking-tight",
          tone === "light" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        oranix
      </span>
    </span>
  );
}
