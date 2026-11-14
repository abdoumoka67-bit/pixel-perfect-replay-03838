import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LanguageMenu, useDocumentLanguage, usePublicLanguage } from "@/components/LanguageSwitcher";
import { translate, type TranslationKey } from "@/lib/i18n";

export type LegalSection = {
  title: TranslationKey;
  body: TranslationKey;
};

/**
 * Shared shell for the public legal pages (/privacy, /terms).
 * They are intentionally outside the `_authenticated` layout, so they stay
 * reachable without signing in.
 */
export function LegalPage({
  titleKey,
  introKey,
  sections,
}: {
  titleKey: TranslationKey;
  introKey: TranslationKey;
  sections: readonly LegalSection[];
}) {
  const { language, setLanguage } = usePublicLanguage("fr");
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  const t = (key: TranslationKey) => translate(language, key);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-card" dir={isRtl ? "rtl" : "ltr"}>
      <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-5">
        <Link to="/" aria-label="oranix" className="min-w-0 shrink">
          <Logo />
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageMenu compact value={language} onChange={setLanguage} />
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/">{t("legal.backHome")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-8 sm:pt-12">
        <article>
          <h1 className="text-[2rem] font-medium leading-[1.4] text-foreground sm:text-4xl sm:leading-[1.25]">
            {t(titleKey)}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t(introKey)}</p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-medium text-foreground">{t(section.title)}</h2>
                <p className="mt-2 text-base leading-8 text-muted-foreground">{t(section.body)}</p>
              </section>
            ))}
          </div>

          <p className="mt-12 text-sm text-muted-foreground">{t("legal.updated")}</p>
        </article>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/" className="transition-colors hover:text-foreground">
              {t("legal.home")}
            </Link>
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
  );
}
