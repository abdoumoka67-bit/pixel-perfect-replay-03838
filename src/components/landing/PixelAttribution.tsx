import type { ReactNode } from "react";
import { Shirt, ShieldCheck } from "lucide-react";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";
import { revealClasses, useInView } from "@/hooks/use-in-view";

const META_PATH =
  "M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z";

/** One platform tile: white rounded square, brand-tinted glyph, floating. */
function Tile({
  x,
  delay,
  label,
  children,
}: {
  x: number;
  delay: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} 14)`}>
      <title>{label}</title>
      <g className="pixel-tile" style={{ animationDelay: `${delay}s` }}>
        <rect
          width="56"
          height="56"
          rx="16"
          fill="#FFFFFF"
          stroke="#E4E4E7"
          strokeWidth="1"
        />
        {children}
      </g>
    </g>
  );
}

/**
 * "Every order knows its ad": Instagram and Facebook are shown as two apps
 * that feed one Meta node, and Meta feeds the order card.
 */
export function PixelAttribution() {
  const language = useUiLanguage();
  const t = (key: TranslationKey) => translate(language, key);
  // CSS loops are paused while the diagram is off screen (see .pixel-stage).
  const { ref, inView } = useInView<HTMLElement>({ settleMs: 150 });

  return (
    <section ref={ref} data-active={inView} className="pixel-stage border-t bg-background">
      <div className="mx-auto w-full max-w-4xl px-5 py-16">
        <div
          className={revealClasses(
            inView,
            "relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 sm:p-8 shadow-xs",
          )}
        >
          <div className="relative text-center">
            <span className="inline-flex rounded-full border border-border/70 bg-card px-3.5 py-1 text-xs text-muted-foreground">
              {t("landing.pixels.badge")}
            </span>
            <h2 className="mt-4 text-balance text-2xl font-medium sm:text-3xl">
              {t("landing.pixels.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t("landing.pixels.sub")}
            </p>
          </div>

          <svg
            viewBox="0 0 400 168"
            role="img"
            aria-label={t("landing.pixels.diagramLabel")}
            className="relative mx-auto mt-8 block h-auto w-full max-w-[520px]"
          >
            <defs>
              <linearGradient id="pixel-meta-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0064E0" />
                <stop offset="1" stopColor="#0082FB" />
              </linearGradient>
            </defs>

            {/* Instagram */}
            <Tile x={100} delay={0} label="Instagram">
              <image href="/logos/instagram.webp" x="12" y="12" width="32" height="32" />
            </Tile>

            {/* Facebook */}
            <Tile x={244} delay={-0.7} label="Facebook">
              <image href="/logos/facebook.webp" x="12" y="12" width="32" height="32" />
            </Tile>

            {/* Meta node: both apps report into it. */}
            <g transform="translate(164 90)">
              <rect width="72" height="30" rx="15" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
              <text
                x="36"
                y="19.8"
                fontSize="13"
                fontWeight="600"
                fill="#111111"
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
              >
                Meta
              </text>
            </g>

            {/* Connectors: apps → Meta → order card. */}
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="pixel-connector text-neutral-300 dark:text-neutral-600"
            >
              <path d="M128 70 V82 Q128 90 142 90 H164" />
              <path d="M272 70 V82 Q272 90 258 90 H236" />
              <path d="M200 120 V168" />
            </g>
            <circle cx="200" cy="163" r="3" className="pixel-ping fill-brand" />
            <circle cx="200" cy="163" r="2.2" className="fill-brand" />
          </svg>

          <div className="pixel-card relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 text-start">
                <p dir="ltr" className="text-[11px] tracking-wide text-muted-foreground">
                  #00001042
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">{t("landing.pixels.product")}</p>
                <p className="mt-2 text-lg font-bold tracking-tight">{t("landing.pixels.amount")}</p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700">
                <Shirt className="size-6 text-neutral-500 dark:text-neutral-300" strokeWidth={1.6} aria-hidden />
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 border-t px-4 py-3">
              <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">{t("landing.pixels.sourcesLabel")}</span>
              <ul className="flex min-w-0 flex-col items-end gap-1.5 text-sm font-medium">
                <li className="flex max-w-full items-center gap-1.5">
                  <img src="/logos/instagram.webp" className="size-4 shrink-0" alt="" />
                  <span className="truncate">{t("landing.pixels.sourceInstagram")}</span>
                </li>
                <li className="flex max-w-full items-center gap-1.5">
                  <img src="/logos/facebook.webp" className="size-4 shrink-0" alt="" />
                  <span className="truncate">{t("landing.pixels.sourceFacebook")}</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">{t("landing.pixels.pixelsLabel")}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden>
                  <path d={META_PATH} fill="url(#pixel-meta-gradient)" />
                </svg>
                <span dir="ltr">Meta</span>
              </span>
            </div>

            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[11px] font-medium leading-snug text-brand-strong">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                <span>{t("landing.pixels.shield")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
