import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getPublicPlans } from "@/lib/storefront.functions";
import { PlanCards } from "@/components/PlanCards";
import { cn } from "@/lib/utils";
import { translate, type TranslationKey } from "@/lib/i18n";
import { LanguageMenu, useDocumentLanguage, usePublicLanguage } from "@/components/LanguageSwitcher";
import { UiLanguageProvider, useUiLanguage } from "@/lib/ui-i18n";
import { useInView } from "@/hooks/use-in-view";
import { DeliveryLogosMarquee } from "@/components/DeliveryLogosMarquee";
import { DashboardShowcase } from "@/components/landing/DashboardShowcase";
import { DispatchShowcase } from "@/components/landing/DispatchShowcase";
import { PixelAttribution } from "@/components/landing/PixelAttribution";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await getPublicPlans();
    } catch (error) {
      // Keep the landing page rendering even if the plans call fails.
      console.error("Public plans loader failed", error);
      return [];
    }
  },
  head: () => ({
    meta: [
      { title: "oranix — Build your store, manage your sales, and launch with ease" },
      {
        name: "description",
        content:
          "For merchants in Algeria: create your store, add your product, and share the link. Cash-on-delivery orders from all 58 wilayas land straight in your dashboard. 7 days free.",
      },
      {
        property: "og:title",
        content: "oranix — Build your store, manage your sales, and launch with ease",
      },
      {
        property: "og:description",
        content: "Create your store, add your product, and share the link. Orders land straight in your dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES: { title: TranslationKey; text: TranslationKey }[] = [
  { title: "landing.f1.title", text: "landing.f1.text" },
  { title: "landing.f2.title", text: "landing.f2.text" },
  { title: "landing.f3.title", text: "landing.f3.text" },
  { title: "landing.f4.title", text: "landing.f4.text" },
  { title: "landing.f5.title", text: "landing.f5.text" },
  { title: "landing.f6.title", text: "landing.f6.text" },
  { title: "landing.f7.title", text: "landing.f7.text" },
];

function FeaturesAccordion() {
  const language = useUiLanguage();
  const t = (key: TranslationKey) => translate(language, key);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rounded-3xl border border-border/80 bg-secondary/40 p-2 sm:p-2.5 shadow-xs">
      <ul className="space-y-1.5">
        {FEATURES.map((f, i) => {
          const isOpen = open === i;
          const id = `feature-${i}`;
          return (
            <li
              key={f.title}
              className={cn(
                "rounded-2xl border transition-colors duration-300",
                isOpen ? "border-border/80 bg-card shadow-xs" : "border-transparent bg-secondary/80 hover:bg-secondary",
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-4 px-4 py-2 text-start sm:px-5 sm:py-2.5"
              >
                <span className="w-6 shrink-0 text-xs text-muted-foreground num">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 text-base font-medium sm:text-lg">{t(f.title)}</span>
                <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ChevronDown className={cn("size-3.5 transition-transform duration-300", isOpen && "rotate-180")} />
                </span>
              </button>
              <div
                id={id}
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 ps-12 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:ps-14">{t(f.text)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Draws a desktop selection over the closing phrase of the hero: a blue marquee
 * grows with a mouse pointer dragged from the start corner to the opposite one,
 * holds so the phrase stays readable, then fades out. Timing and corners live in
 * styles.css (see `hero-select-*`) and respect `prefers-reduced-motion`.
 */
function TextSelectionHighlight({
  children,
  isRtl,
  className,
}: {
  children: string;
  isRtl: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <span aria-hidden className="hero-select-layer pointer-events-none absolute inset-0">
        <span className="hero-select-marquee absolute start-0 top-0 rounded-[2px] border-[1.5px] border-blue-600/80 bg-blue-500/15" />
        <span
          className="hero-select-cursor absolute start-0 top-0 h-[22px] w-[18px]"
          style={{ transform: isRtl ? "translateX(100%)" : undefined }}
        >
          <svg
            width={18}
            height={22}
            viewBox="0 0 18 22"
            className="h-full w-full overflow-visible drop-shadow-sm pointer-events-none select-none"
            style={{
              width: "18px",
              height: "22px",
              transformOrigin: "0 0",
              transform: isRtl ? "scaleX(-1)" : undefined,
            }}
          >
            <path
              d="M0 0 L0 17 L4.4 12.8 L6.9 18.4 L9.4 17.3 L6.9 11.8 L12.6 11.8 Z"
              fill="#FFFFFF"
              stroke="#1F2937"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}

function Home() {
  const plans = Route.useLoaderData();
  const navigate = useNavigate();
  // The public site opens in French by default; the visitor can switch language.
  const { language, setLanguage } = usePublicLanguage("fr");
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const [heroLine1 = "", heroLine2] = t("landing.hero.title").split("\n");
  const [email, setEmail] = useState("");
  // Pause the selection loop while the hero is off screen.
  const { ref: heroRef, inView: heroInView } = useInView<HTMLElement>();

  function renderHeroLine1() {
    let part1 = "متجرك";
    if (language === "fr") part1 = "Votre boutique";
    else if (language === "en") part1 = "Your store";
    // Keep the translated remainder (and its capitalization) after the lead-in.
    const part2 = heroLine1.startsWith(part1)
      ? heroLine1.slice(part1.length).trimStart().replace(/^,\s*/, "")
      : "";

    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:flex-nowrap lg:whitespace-nowrap">
        <span>{part1}</span>{" "}
        {part2 && <span>{part2}</span>}
      </span>
    );
  }

  function startWithEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    navigate({ to: "/auth", search: { mode: "signup", email: value } });
  }

  return (
    <UiLanguageProvider language={language}>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-card" dir={isRtl ? "rtl" : "ltr"}>
        <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-5">
          <Logo className="min-w-0 shrink" />
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageMenu compact value={language} onChange={setLanguage} />
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/auth">{t("landing.login")}</Link>
            </Button>
          </div>
        </header>

        <section
          ref={heroRef}
          data-active={heroInView}
          className={cn(
            "hero-stage mx-auto w-full max-w-3xl px-5 text-center lg:max-w-7xl",
            isRtl ? "pb-10 pt-4 sm:pb-10 sm:pt-8" : "pb-16 pt-12 sm:pt-20",
          )}
        >
          <h1
            className={cn(
              "mx-auto max-w-3xl text-balance break-words text-center font-cairo font-medium text-[#1D1D20] lg:max-w-none",
              "flex flex-col items-center",
              isRtl ? "text-hero-ar gap-2" : "text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl gap-3 sm:gap-4",
              isRtl && "lg:flex-row lg:flex-nowrap lg:justify-center lg:gap-3",
              !isRtl && "leading-[1.06] tracking-tight",
              isRtl && "tracking-normal",
            )}
          >
            {renderHeroLine1()}
            {heroLine2 && (
              <TextSelectionHighlight
                isRtl={isRtl}
                className={cn(isRtl && "lg:shrink-0 lg:whitespace-nowrap")}
              >
                {heroLine2}
              </TextSelectionHighlight>
            )}
          </h1>
          <p className={cn("text-sm text-[#6B6B6B] sm:text-base", isRtl ? "mt-2 mb-5" : "mt-4 mb-8")}>
            {t("landing.hero.sub")}
          </p>
          <form
            onSubmit={startWithEmail}
            className="mx-auto flex w-full max-w-md items-center gap-1.5 rounded-full border border-border bg-white p-1.5 shadow-sm"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("landing.hero.email")}
              aria-label={t("landing.hero.email")}
              autoComplete="email"
              dir={isRtl ? "rtl" : "ltr"}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              className="h-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all px-5 text-sm font-medium"
            >
              {t("landing.hero.emailCta")}
            </Button>
          </form>
        </section>

        <DeliveryLogosMarquee />

        <DashboardShowcase />
        <DispatchShowcase />
        <PixelAttribution />

        <section className="mx-auto w-full max-w-3xl px-5 pb-16">
          <div className="mb-8 text-center">
            <span className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              {t("landing.features.badge")}
            </span>
            <h2 className="mt-4 text-balance text-2xl font-medium sm:text-3xl">
              {t("landing.features.title")}
            </h2>
          </div>
          <FeaturesAccordion />
        </section>

        {plans.length > 0 && (
          <section className="border-t bg-background">
            <div className="mx-auto w-full max-w-3xl px-5 py-16">
              <h2 className="text-center text-3xl font-medium">{t("landing.pricing.title")}</h2>
              <p className="mt-2 text-center text-muted-foreground">{t("landing.pricing.sub")}</p>
              <div className="mt-8">
                <PlanCards
                  plans={plans}
                  language={language}
                  action={(p) => (
                    <Button asChild size="xl" variant={p.tier === "pro" ? "outline" : "default"} className={p.tier === "pro" ? "w-full border-transparent text-foreground" : "w-full"}>
                      <Link to="/auth" search={{ mode: "signup" }}>{t("landing.cta")}</Link>
                    </Button>
                  )}
                />
              </div>
            </div>
          </section>
        )}

        <footer className="border-t">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
            <Logo />
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                {t("legal.privacy.title")}
              </Link>
              <Link to="/terms" className="transition-colors hover:text-foreground">
                {t("legal.terms.title")}
              </Link>
            </nav>
            <p>© {new Date().getFullYear()} oranix</p>
          </div>
        </footer>
      </div>
    </UiLanguageProvider>
  );
}
