import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, MessageCircle, X, Home } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { whatsappLink } from "@/lib/commerce";
import { LanguageMenu, useDocumentLanguage, useStorefrontLanguage } from "@/components/LanguageSwitcher";
import type { PublicStore } from "@/lib/storefront.functions";
import { initPixels } from "@/lib/pixels";
import { captureAttribution } from "@/lib/attribution";
import {
  DEFAULT_FAQ_BY_LANGUAGE,
  parseStorefrontConfig,
  type FaqItem,
} from "@/lib/storefront-theme";
import { tr, UiLanguageProvider, useUiLanguage, useTr } from "@/lib/ui-i18n";

export function StoreChrome({ store, children }: { store: PublicStore; children: ReactNode }) {
  const [bar, setBar] = useState(true);
  const [open, setOpen] = useState(false);
  // The store language is the default; visitors can switch it and their choice is remembered.
  const storeLanguage = store.storefront_config?.language ?? parseStorefrontConfig({}, store.name).language;
  const { language, setLanguage } = useStorefrontLanguage(storeLanguage);
  const config = store.storefront_config ?? parseStorefrontConfig({}, store.name);
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  const t = (text: string, vars?: Record<string, string | number>) => tr(language, text, vars);

  useEffect(() => {
    // Remember the ad click (UTM/click id) before the next client-side navigation drops it.
    captureAttribution();
    initPixels(store);
  }, [store]);

  const barEnabled = config.bar_enabled;
  const barText = config.bar_text || t("مرحبا بك في متجرنا");

  return (
    <UiLanguageProvider language={language}>
      <div className="min-h-screen bg-card" dir={isRtl ? "rtl" : "ltr"} style={{ fontFamily: config.font_family }}>
        {bar && barEnabled && (
          <div className="relative px-10 py-2.5 text-center text-sm" style={{ backgroundColor: config.bar_bg_color, color: config.bar_text_color }}>
            {barText}
            <button onClick={() => setBar(false)} className="absolute end-3 top-1/2 -translate-y-1/2 p-1 opacity-80" aria-label={t("إغلاق")}>
              <X className="size-4" />
            </button>
          </div>
        )}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3.5">
            <div className="flex items-center gap-1">
              {store.whatsapp && (
                <a
                  href={whatsappLink(store.whatsapp, t("السلام عليكم، عندي سؤال عن منتجات {store}", { store: store.name }))}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full p-2 hover:bg-secondary"
                  aria-label={t("واتساب")}
                >
                  <MessageCircle className="size-[22px]" strokeWidth={1.6} />
                </a>
              )}
            </div>
            <Link to="/m/$store" params={{ store: store.slug }} className="flex items-center gap-2">
              {store.logo && <img src={store.logo} alt="" className="size-8 rounded-full object-cover" />}
              <span className="text-xl font-normal">{store.name}</span>
            </Link>
            <div className="flex items-center justify-end gap-1">
              <LanguageMenu value={language} onChange={setLanguage} />
              <button onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-secondary" aria-label={t("القائمة")}>
                <Menu className="size-6" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </header>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={isRtl ? "right" : "left"} className="w-[80vw] max-w-sm bg-background">
            <SheetTitle className="text-start font-normal">{store.name}</SheetTitle>
            <nav className="mt-6 space-y-1">
              <Link
                to="/m/$store"
                params={{ store: store.slug }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-card"
              >
                <Home className="size-5" strokeWidth={1.6} /> {t("كل المنتجات")}
              </Link>
              {store.whatsapp && (
                <a
                  href={whatsappLink(store.whatsapp, t("السلام عليكم، عندي سؤال عن منتجات {store}", { store: store.name }))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-foreground/80"
                >
                  <MessageCircle className="size-5" strokeWidth={1.6} /> {t("تواصل معنا عبر واتساب")}
                </a>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {children}

        <footer className="border-t bg-background py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {store.name} - {t("جميع الحقوق محفوظة")}
        </footer>
      </div>
    </UiLanguageProvider>
  );
}

export function StoreFaq({ config }: { config?: { enabled: boolean; items: FaqItem[] } }) {
  const t = useTr();
  const language = useUiLanguage();
  const faq = config ?? { enabled: true, items: DEFAULT_FAQ_BY_LANGUAGE[language] };
  if (!faq.enabled || !faq.items || faq.items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{t("أسئلة شائعة")}</h2>
      <Accordion type="single" collapsible defaultValue="0">
        {faq.items.map((f, i) => (
          <AccordionItem key={`${f.q}-${i}`} value={String(i)}>
            <AccordionTrigger className="py-5 text-start text-lg font-normal hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
