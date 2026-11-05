import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, useLanguagePreference, useT } from "@/components/LanguageSwitcher";
import { LANGUAGE_STORAGE_KEY } from "@/lib/commerce";
import { getPublicPlans } from "@/lib/storefront.functions";
import { PlanCards } from "@/components/PlanCards";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  loader: () => getPublicPlans(),
  head: () => ({
    meta: [
      { title: "oranix — صفحة طلب لمنتجك وطلباتك مرتبة في مكان واحد" },
      {
        name: "description",
        content:
          "للتجار في الجزائر: أنشئ متجرك، أضف منتجك، وانشر الرابط. طلبات الدفع عند الاستلام من 58 ولاية تصلك مباشرة في لوحتك. 7 أيام مجاناً.",
      },
      { property: "og:title", content: "oranix — صفحة طلب لمنتجك وطلباتك مرتبة في مكان واحد" },
      {
        property: "og:description",
        content: "أنشئ متجرك، أضف منتجك، وانشر الرابط. الطلبات تصلك مباشرة في لوحتك.",
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
];

function FeaturesAccordion() {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-2">
      {FEATURES.map((f, i) => {
        const isOpen = open === i;
        const id = `feature-${i}`;
        return (
          <li
            key={f.title}
            className={cn(
              "rounded-3xl border transition-colors duration-300",
              isOpen ? "border-border bg-card shadow-card" : "border-transparent bg-secondary",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center gap-4 px-5 py-2.5 text-start sm:px-6"
            >
              <span className="w-7 shrink-0 text-sm text-muted-foreground num">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-lg font-medium sm:text-xl">{t(f.title)}</span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ChevronDown className={cn("size-4 transition-transform duration-300", isOpen && "rotate-180")} />
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
                <p className="px-5 pb-6 ps-16 text-base leading-8 text-muted-foreground sm:px-6 sm:ps-[4.25rem]">{t(f.text)}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Home() {
  const plans = Route.useLoaderData();
  const { t } = useT();
  const { language, setLanguage } = useLanguagePreference();

  useEffect(() => {
    // First visit: open the landing page in English, while keeping the Arabic toggle.
    if (!window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) setLanguage("en");
  }, [setLanguage]);

  const underline = "underline decoration-[#3A0D0D] decoration-[3px] underline-offset-[6px]";

  return (
    <div className="min-h-screen bg-card">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher value={language} onChange={setLanguage} compact />
          <Button asChild variant="outline">
            <Link to="/auth">{t("landing.login")}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <h1 className="mt-7 text-balance text-[1.75rem] font-medium leading-[1.45] text-foreground sm:text-5xl sm:leading-[1.3]">
          {t("landing.hero.before")}
          <span className={underline}>{t("landing.hero.w1")}</span>
          {t("landing.hero.mid")}
          <span className={underline}>{t("landing.hero.w2")}</span>
          {t("landing.hero.after")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          {t("landing.hero.sub")}
        </p>
        <div className="mx-auto mt-9 flex max-w-md flex-col gap-3">
          <Button asChild size="xl" className="w-full">
            <Link to="/auth" search={{ mode: "signup" }}>{t("landing.cta")}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
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
          <div className="mx-auto max-w-3xl px-5 py-16">
            <h2 className="text-center text-3xl font-medium">{t("landing.pricing.title")}</h2>
            <p className="mt-2 text-center text-muted-foreground">{t("landing.pricing.sub")}</p>
            <div className="mt-8">
              <PlanCards
                plans={plans}
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
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} oranix</p>
        </div>
      </footer>
    </div>
  );
}
