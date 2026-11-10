import { Shirt, ShieldCheck } from "lucide-react";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";

const META_PATH =
  "M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z";

const TIKTOK_PATH =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

const SNAPCHAT_PATH =
  "M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z";

const GOOGLE_ADS_BLUE =
  "M85.9,28.6c2.4-6.3,5.7-12.1,10.6-16.8c19.6-19.1,52-14.3,65.3,9.7c10,18.2,20.6,36,30.9,54c17.2,29.9,34.6,59.8,51.6,89.8c14.3,25.1-1.2,56.8-29.6,61.1c-17.4,2.6-33.7-5.4-42.7-21c-15.1-26.3-30.3-52.6-45.4-78.8c-0.3-0.6-0.7-1.1-1.1-1.6c-1.6-1.3-2.3-3.2-3.3-4.9c-6.7-11.8-13.6-23.5-20.3-35.2c-4.3-7.6-8.8-15.1-13.1-22.7c-3.9-6.8-5.7-14.2-5.5-22C83.6,36.2,84.1,32.2,85.9,28.6";

const GOOGLE_ADS_YELLOW =
  "M85.9,28.6c-0.9,3.6-1.7,7.2-1.9,11c-0.3,8.4,1.8,16.2,6,23.5C101,82,112,101,122.9,120c1,1.7,1.8,3.4,2.8,5c-6,10.4-12,20.7-18.1,31.1c-8.4,14.5-16.8,29.1-25.3,43.6c-0.4,0-0.5-0.2-0.6-0.5c-0.1-0.8,0.2-1.5,0.4-2.3c4.1-15,0.7-28.3-9.6-39.7c-6.3-6.9-14.3-10.8-23.5-12.1c-12-1.7-22.6,1.4-32.1,8.9c-1.7,1.3-2.8,3.2-4.8,4.2c-0.4,0-0.6-0.2-0.7-0.5c4.8-8.3,9.5-16.6,14.3-24.9C45.5,98.4,65.3,64,85.2,29.7C85.4,29.3,85.7,29,85.9,28.6";

const GOOGLE_ADS_GREEN =
  "M11.8,158c1.9-1.7,3.7-3.5,5.7-5.1c24.3-19.2,60.8-5.3,66.1,25.1c1.3,7.3,0.6,14.3-1.6,21.3c-0.1,0.6-0.2,1.1-0.4,1.7c-0.9,1.6-1.7,3.3-2.7,4.9c-8.9,14.7-22,22-39.2,20.9C20,225.4,4.5,210.6,1.8,191c-1.3-9.5,0.6-18.4,5.5-26.6c1-1.8,2.2-3.4,3.3-5.2C11.1,158.8,10.9,158,11.8,158";

function MetaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="pixel-meta-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0064E0" />
          <stop offset="1" stopColor="#0082FB" />
        </linearGradient>
      </defs>
      <path fill="url(#pixel-meta-gradient)" d={META_PATH} />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={TIKTOK_PATH} fill="#25F4EE" transform="translate(-0.55 -0.55)" />
      <path d={TIKTOK_PATH} fill="#FE2C55" transform="translate(0.55 0.55)" />
      <path d={TIKTOK_PATH} fill="#010101" />
    </svg>
  );
}

function SnapchatGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#FFFC00" />
      <path d={SNAPCHAT_PATH} fill="#FFFFFF" transform="translate(2.1 2.1) scale(0.825)" />
    </svg>
  );
}

function GoogleAdsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 251 246" className={className} aria-hidden>
      <path fill="#3C8BD9" d={GOOGLE_ADS_BLUE} />
      <path fill="#FABC04" d={GOOGLE_ADS_YELLOW} />
      <path fill="#34A852" d={GOOGLE_ADS_GREEN} />
    </svg>
  );
}

const PLATFORMS = [
  { name: "Meta", Glyph: MetaGlyph },
  { name: "TikTok", Glyph: TikTokGlyph },
  { name: "Snapchat", Glyph: SnapchatGlyph },
  { name: "Google Ads", Glyph: GoogleAdsGlyph },
];

/**
 * "Every order knows its ad" — pixel attribution demo with animated
 * dashed data lines flowing from the ad platforms into an order card.
 */
export function PixelAttribution() {
  const language = useUiLanguage();
  const t = (key: TranslationKey) => translate(language, key);

  return (
    <section className="border-t bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-secondary/40 px-5 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 start-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl rtl:translate-x-1/2"
          />

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

          <ul className="relative mt-9 grid grid-cols-4 gap-2">
            {PLATFORMS.map(({ name, Glyph }, i) => (
              <li key={name} className="flex justify-center">
                <span
                  className="pixel-tile flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-white shadow-sm ring-1 ring-black/[0.03] sm:size-14"
                  style={{ animationDelay: `${i * -1.4}s` }}
                >
                  <Glyph className="size-6 sm:size-7" />
                  <span className="sr-only">{name}</span>
                </span>
              </li>
            ))}
          </ul>

          <svg
            aria-hidden
            viewBox="0 0 400 110"
            preserveAspectRatio="none"
            className="pixel-connector relative mt-1 block h-20 w-full text-neutral-300 dark:text-neutral-600 sm:h-24"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke">
              <path d="M50 0 V30 Q50 44 64 44 H200" />
              <path d="M150 0 V42 Q150 56 164 56 H200" />
              <path d="M250 0 V42 Q250 56 236 56 H200" />
              <path d="M350 0 V30 Q350 44 336 44 H200" />
              <path d="M200 44 V110" />
            </g>
            <circle cx="200" cy="106" r="3" className="pixel-ping fill-brand" />
            <circle cx="200" cy="106" r="2.2" className="fill-brand" />
          </svg>

          <div className="pixel-card relative mx-auto -mt-1 w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 text-start">
                <p dir="ltr" className="text-[11px] tracking-wide text-muted-foreground">
                  #00001042
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">{t("landing.pixels.product")}</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{t("landing.pixels.amount")}</p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700">
                <Shirt className="size-6 text-neutral-500 dark:text-neutral-300" strokeWidth={1.6} aria-hidden />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">{t("landing.pixels.sourceLabel")}</span>
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <TikTokGlyph className="size-4 shrink-0" />
                <span className="truncate">{t("landing.pixels.sourceValue")}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">{t("landing.pixels.carrierLabel")}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                <span dir="ltr">CAPI</span>
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
