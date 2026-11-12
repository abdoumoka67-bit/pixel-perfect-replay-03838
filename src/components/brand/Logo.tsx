import { cn } from "@/lib/utils";

/**
 * Official ORX Brand Logo
 * - Displays the new official ORX wordmark emblem.
 * - Handles both dark tone (for light backgrounds) and light tone (for dark sidebars/headers).
 * - The image is 942x200, so every render reserves a 4:1 box with explicit width and
 *   height attributes. Without them the browser paints the raw 942px-wide bitmap before
 *   the stylesheet loads, which shifts the whole header (FOUC).
 */
const LOGO_WIDTH = 96;
const LOGO_HEIGHT = 24;
const LOGO_STYLE = {
  height: `${LOGO_HEIGHT}px`,
  width: "auto",
  aspectRatio: "4 / 1",
} as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-orx.png"
      alt="ORX"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      style={LOGO_STYLE}
      className={cn("h-6 w-auto object-contain select-none", className)}
      loading="eager"
      fetchPriority="high"
      decoding="sync"
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
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        style={LOGO_STYLE}
        className="h-5 w-auto max-w-[120px] object-contain sm:h-6"
        loading="eager"
        fetchPriority="high"
        decoding="sync"
      />
    </span>
  );
}
