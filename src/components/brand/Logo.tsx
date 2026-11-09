import { cn } from "@/lib/utils";

/**
 * Official ORX Brand Logo
 * - Displays the new official ORX wordmark emblem.
 * - Handles both dark tone (for light backgrounds) and light tone (for dark sidebars/headers).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-orx.png"
      alt="ORX"
      className={cn("h-6 w-auto object-contain select-none", className)}
      loading="eager"
    />
  );
}

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={cn("inline-flex items-center select-none", className)}
      dir="ltr"
      aria-label="ORX"
    >
      <img
        src={tone === "light" ? "/logo-orx-white.png" : "/logo-orx.png"}
        alt="ORX"
        className="h-5 w-auto max-w-[120px] object-contain sm:h-6"
        loading="eager"
      />
    </span>
  );
}
