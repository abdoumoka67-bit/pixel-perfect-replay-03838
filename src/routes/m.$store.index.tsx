import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Banknote,
  Facebook,
  Instagram,
  MessageCircle,
  Package,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { getStorefront } from "@/lib/storefront.functions";
import { StoreChrome, StoreFaq } from "@/components/store/StoreChrome";
import { formatDZD, whatsappLink } from "@/lib/commerce";
import {
  TRUST_BADGES,
  parseStorefrontConfig,
  presetStyles,
  trustBadgeLabel,
  type TrustBadgeKey,
} from "@/lib/storefront-theme";
import { useStorefrontLanguage } from "@/components/LanguageSwitcher";
import { tr } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/m/$store/")({
  loader: async ({ params }) => {
    const data = await getStorefront({ data: { slug: params.store } });
    if (!data.store) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store) {
      return { meta: [{ title: tr("en", "المتجر غير موجود") }, { name: "robots", content: "noindex" }] };
    }
    const lang = loaderData.store.storefront_config?.language ?? "en";
    const title = `${loaderData.store.name} — ${tr(lang, "تسوق والدفع عند الاستلام")}`;
    const description = tr(
      lang,
      "تصفح منتجات {store} واطلب مع الدفع عند الاستلام والتوصيل إلى 58 ولاية.",
      { store: loaderData.store.name },
    );
    const image = loaderData.products[0]?.images[0];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-medium">{tr("en", "المتجر غير موجود")}</h1>
      <p className="text-muted-foreground">{tr("en", "تأكد من الرابط وحاول مجدداً.")}</p>
    </div>
  ),
  component: Storefront,
});

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.82 4.46v-7.14a8.16 8.16 0 0 0 5.63 2.24V11.8a4.85 4.85 0 0 1-3.77-1.84c.002-.01.002-.02 0-.03v-3.24h3.77Z" />
    </svg>
  );
}

function getTrustBadgeIcon(key: TrustBadgeKey) {
  switch (key) {
    case "cod":
      return Banknote;
    case "delivery_58":
      return Truck;
    case "exchange":
      return ArrowLeftRight;
    case "original":
      return ShieldCheck;
    case "support":
      return MessageCircle;
    default:
      return ShieldCheck;
  }
}

function normalizeUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function Storefront() {
  const { store, products } = Route.useLoaderData();
  const storeLanguage = store?.storefront_config?.language ?? "en";
  const { language } = useStorefrontLanguage(storeLanguage);
  if (!store) return null;

  const config = store.storefront_config ?? parseStorefrontConfig({}, store.name);
  const t = (text: string, vars?: Record<string, string | number>) => tr(language, text, vars);
  const styles = presetStyles(config.preset);

  const socialWhatsapp = config.sections.social.whatsapp || store.whatsapp;
  const socialInstagram = normalizeUrl(config.sections.social.instagram);
  const socialFacebook = normalizeUrl(config.sections.social.facebook);
  const socialTiktok = normalizeUrl(config.sections.social.tiktok);

  const hasSocialLinks = Boolean(socialWhatsapp || socialInstagram || socialFacebook || socialTiktok);

  return (
    <StoreChrome store={store}>
      {/* 1. Hero Section */}
      <section
        style={styles.hero}
        className="px-6 py-20 text-center transition-colors sm:py-28"
      >
        <h1 className="text-[2rem] font-normal leading-tight sm:text-5xl">{config.hero_title}</h1>
        <p className="mx-auto mt-5 max-w-md text-lg font-light leading-9 opacity-90 sm:text-xl">
          {config.hero_subtitle}
        </p>
        <a
          href="#products"
          style={styles.button}
          className="mt-9 inline-flex h-14 items-center rounded-xl px-12 text-lg font-normal shadow-float transition-opacity hover:opacity-90"
        >
          {config.hero_button}
        </a>
      </section>

      {/* 2. Products Section */}
      <main id="products" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        {!store.accepting_orders && (
          <p className="mb-6 rounded-2xl bg-warning-soft p-4 text-center text-sm text-warning">
            {t("المتجر متوقف مؤقتاً عن استقبال الطلبات.")}
          </p>
        )}
        <h2 className="mb-6 px-1 text-2xl font-bold sm:text-3xl">{t("منتجاتنا")}</h2>
        {products.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 size-10" strokeWidth={1.4} /> {t("لا توجد منتجات حالياً.")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/m/$store/p/$product"
                params={{ store: store.slug, product: p.slug }}
                className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-float"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Package />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-[15px]">{p.name}</p>
                  <p className="mt-1 font-medium num">{formatDZD(p.price, language)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 3. Below Products Sections in order */}

      {/* 3.1. Trust badges row */}
      {config.sections.trust.enabled && config.sections.trust.badges.length > 0 && (
        <section className="border-t py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {config.sections.trust.badges.map((badgeKey) => {
                const badge = TRUST_BADGES[badgeKey];
                if (!badge) return null;
                const Icon = getTrustBadgeIcon(badgeKey);
                return (
                  <div
                    key={badgeKey}
                    className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-card"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon className="size-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-medium leading-relaxed">{trustBadgeLabel(badgeKey, language)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3.2. Reviews (only merchant-entered) */}
      {config.sections.reviews.enabled && config.sections.reviews.items.length > 0 && (
        <section className="border-t bg-background py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">{t("آراء عملائنا")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {config.sections.reviews.items.map((rev, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-card"
                >
                  <div>
                    <div className="mb-3 flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={cn(
                            "size-4",
                            starIndex < rev.rating
                              ? "fill-brand text-brand"
                              : "fill-muted text-muted-foreground/30",
                          )}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <p className="text-base leading-relaxed text-foreground">{rev.text}</p>
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">{rev.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3.3. FAQ */}
      {config.sections.faq.enabled && (
        <div className="border-t">
          <StoreFaq config={config.sections.faq} />
        </div>
      )}

      {/* 3.4. Social links */}
      {config.sections.social.enabled && hasSocialLinks && (
        <section className="border-t py-12 text-center">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="mb-2 text-xl font-bold">{t("تابعنا على وسائل التواصل")}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{t("تواصل معنا وتابع آخر العروض والتحديثات")}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {socialWhatsapp && (
                <a
                  href={whatsappLink(socialWhatsapp, t("السلام عليكم، عندي استفسار عن متجر {store}", { store: store.name }))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary hover:bg-secondary"
                  aria-label={t("واتساب")}
                >
                  <MessageCircle className="size-5" strokeWidth={1.5} />
                </a>
              )}
              {socialInstagram && (
                <a
                  href={socialInstagram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary hover:bg-secondary"
                  aria-label={t("إنستغرام")}
                >
                  <Instagram className="size-5" strokeWidth={1.5} />
                </a>
              )}
              {socialFacebook && (
                <a
                  href={socialFacebook}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary hover:bg-secondary"
                  aria-label={t("فيسبوك")}
                >
                  <Facebook className="size-5" strokeWidth={1.5} />
                </a>
              )}
              {socialTiktok && (
                <a
                  href={socialTiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary hover:bg-secondary"
                  aria-label={t("تيك توك")}
                >
                  <TikTokIcon className="size-5" />
                </a>
              )}
            </div>
          </div>
        </section>
      )}
    </StoreChrome>
  );
}
