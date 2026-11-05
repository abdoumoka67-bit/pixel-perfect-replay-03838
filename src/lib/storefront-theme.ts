import { z } from "zod";

export const PRESET_KEYS = ["noir", "charcoal_gold", "midnight", "emerald", "plum", "minimal"] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

/** Interface language of a store, saved with its storefront settings. */
export const STOREFRONT_LANGUAGES = ["ar", "fr", "en"] as const;
export type StorefrontLanguage = (typeof STOREFRONT_LANGUAGES)[number];
export const STOREFRONT_LANGUAGE_DEFAULT: StorefrontLanguage = "en";

export interface HeroPreset {
  id: PresetKey;
  label: string;
  from: string;
  to: string;
  textColor: string;
  buttonBg: string;
  buttonText: string;
}

export const HERO_PRESETS: Record<PresetKey, HeroPreset> = {
  noir: {
    id: "noir",
    label: "أسود كلاسيكي",
    from: "#111111",
    to: "#3A3A3A",
    textColor: "#FFFFFF",
    buttonBg: "#FFFFFF",
    buttonText: "#111111",
  },
  charcoal_gold: {
    id: "charcoal_gold",
    label: "فحمي وذهبي",
    from: "#1C1C1C",
    to: "#2B2B2B",
    textColor: "#FFFFFF",
    buttonBg: "#C9A24B",
    buttonText: "#111111",
  },
  midnight: {
    id: "midnight",
    label: "أزرق ليلي",
    from: "#0F1B33",
    to: "#1E3A5F",
    textColor: "#FFFFFF",
    buttonBg: "#FFFFFF",
    buttonText: "#0F1B33",
  },
  emerald: {
    id: "emerald",
    label: "زمردي",
    from: "#0F3D2E",
    to: "#2F6B55",
    textColor: "#FFFFFF",
    buttonBg: "#A7C4B5",
    buttonText: "#0F3D2E",
  },
  plum: {
    id: "plum",
    label: "برقوقي",
    from: "#3B1F3A",
    to: "#6B3A5C",
    textColor: "#FFFFFF",
    buttonBg: "#F2C6D0",
    buttonText: "#3B1F3A",
  },
  minimal: {
    id: "minimal",
    label: "أبيض بسيط",
    from: "#F5F5F5",
    to: "#FFFFFF",
    textColor: "#111111",
    buttonBg: "#111111",
    buttonText: "#FFFFFF",
  },
};

export const TRUST_BADGE_KEYS = ["cod", "delivery_58", "exchange", "original", "support"] as const;
export type TrustBadgeKey = (typeof TRUST_BADGE_KEYS)[number];

export const TRUST_BADGES: Record<TrustBadgeKey, { label: string; icon: string }> = {
  cod: { label: "الدفع عند الاستلام", icon: "banknote" },
  delivery_58: { label: "توصيل لـ 58 ولاية", icon: "truck" },
  exchange: { label: "إمكانية الاستبدال", icon: "repeat" },
  original: { label: "منتجات أصلية", icon: "shield-check" },
  support: { label: "خدمة زبائن عبر واتساب", icon: "message-circle" },
};

export const DEFAULT_FAQ = [
  {
    q: "شحال ثمن التوصيل لولايتي؟",
    a: "التوصيل يختلف حسب الولاية (للبيت أو للمكتب). سعر التوصيل يبان لك مباشرة كي تختار ولايتك في نموذج الطلب.",
  },
  {
    q: "كيفاش نخلّص؟",
    a: "الدفع عند الاستلام، تخلّص نقداً كي يوصلك الطرد.",
  },
  {
    q: "وقتاش يوصلني الطلب؟",
    a: "بعد ما نتصلو بيك ونأكدو الطلب، نبعثوه مع شركة التوصيل. المدة تختلف حسب الولاية.",
  },
  {
    q: "كيفاش نتأكد بلي الطلب تسجل؟",
    a: "تظهر لك صفحة تأكيد فيها رقم الطلب، ومن بعد نتصلو بيك في الهاتف باش نأكدو معاك.",
  },
];

export const faqItemSchema = z.object({
  q: z.string().trim().min(1, "السؤال مطلوب").max(80, "السؤال طويل جداً"),
  a: z.string().trim().min(1, "الجواب مطلوب").max(300, "الجواب طويل جداً"),
});

export const reviewItemSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(60, "الاسم طويل جداً"),
  text: z.string().trim().min(1, "نص التقييم مطلوب").max(300, "نص التقييم طويل جداً"),
  rating: z.number().int().min(1, "التقييم بين 1 و 5").max(5, "التقييم بين 1 و 5"),
});

export const socialLinksSchema = z.object({
  enabled: z.boolean().default(true),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().optional().or(z.literal("")),
  facebook: z.string().trim().optional().or(z.literal("")),
  tiktok: z.string().trim().optional().or(z.literal("")),
});

export const storefrontConfigSchema = z.object({
  preset: z.enum(PRESET_KEYS).default("noir"),
  language: z.enum(STOREFRONT_LANGUAGES).default(STOREFRONT_LANGUAGE_DEFAULT),
  hero_title: z.string().trim().max(80).default(""),
  hero_subtitle: z.string().trim().max(160).default("اطلب الآن والدفع عند الاستلام"),
  hero_button: z.string().trim().max(30).default("تسوق الآن"),
  bar_enabled: z.boolean().default(true),
  bar_text: z.string().trim().max(80).default("مرحبا بك في متجرنا"),
  sections: z.object({
    faq: z
      .object({
        enabled: z.boolean().default(true),
        items: z.array(faqItemSchema).max(8).default(DEFAULT_FAQ),
      })
      .default({ enabled: true, items: DEFAULT_FAQ }),
    reviews: z
      .object({
        enabled: z.boolean().default(false),
        items: z.array(reviewItemSchema).max(10).default([]),
      })
      .default({ enabled: false, items: [] }),
    social: socialLinksSchema.default({ enabled: true }),
    trust: z
      .object({
        enabled: z.boolean().default(true),
        badges: z.array(z.enum(TRUST_BADGE_KEYS)).default([...TRUST_BADGE_KEYS]),
      })
      .default({ enabled: true, badges: [...TRUST_BADGE_KEYS] }),
  }).default({}),
});

export type StorefrontConfig = z.infer<typeof storefrontConfigSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;

type RawFaqItem = { q: string; a: string };
type RawReviewItem = { name: string; text: string; rating: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRawFaqItem(value: unknown): value is RawFaqItem {
  return isRecord(value) &&
    typeof value["q"] === "string" &&
    Boolean(value["q"].trim()) &&
    typeof value["a"] === "string";
}

function isRawReviewItem(value: unknown): value is RawReviewItem {
  return isRecord(value) &&
    typeof value["name"] === "string" &&
    Boolean(value["name"].trim()) &&
    typeof value["text"] === "string" &&
    Boolean(value["text"].trim()) &&
    typeof value["rating"] === "number" &&
    Number.isInteger(value["rating"]) &&
    value["rating"] >= 1 &&
    value["rating"] <= 5;
}

function isPresetKey(value: unknown): value is PresetKey {
  return typeof value === "string" && PRESET_KEYS.some((key) => key === value);
}

function isStorefrontLanguage(value: unknown): value is StorefrontLanguage {
  return typeof value === "string" && STOREFRONT_LANGUAGES.some((key) => key === value);
}

function isTrustBadgeKey(value: unknown): value is TrustBadgeKey {
  return typeof value === "string" && TRUST_BADGE_KEYS.some((key) => key === value);
}

export function parseStorefrontConfig(raw: unknown, storeName = ""): StorefrontConfig {
  const fallbackTitle = storeName.trim() || "مرحباً بك في متجرنا";

  if (!isRecord(raw)) {
    return {
      preset: "noir",
      language: STOREFRONT_LANGUAGE_DEFAULT,
      hero_title: fallbackTitle,
      hero_subtitle: "اطلب الآن والدفع عند الاستلام",
      hero_button: "تسوق الآن",
      bar_enabled: true,
      bar_text: "مرحبا بك في متجرنا",
      sections: {
        faq: { enabled: true, items: DEFAULT_FAQ },
        reviews: { enabled: false, items: [] },
        social: { enabled: true, whatsapp: "", instagram: "", facebook: "", tiktok: "" },
        trust: { enabled: true, badges: [...TRUST_BADGE_KEYS] },
      },
    };
  }

  const obj = raw;
  const rawPreset = obj["preset"];
  const preset: PresetKey = isPresetKey(rawPreset) ? rawPreset : "noir";

  const rawLanguage = obj["language"];
  const language: StorefrontLanguage = isStorefrontLanguage(rawLanguage)
    ? rawLanguage
    : STOREFRONT_LANGUAGE_DEFAULT;

  const rawTitle = obj["hero_title"];
  const hero_title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim().slice(0, 80)
      : fallbackTitle;

  const rawSubtitle = obj["hero_subtitle"];
  const hero_subtitle =
    typeof rawSubtitle === "string" && rawSubtitle.trim()
      ? rawSubtitle.trim().slice(0, 160)
      : "اطلب الآن والدفع عند الاستلام";

  const rawButton = obj["hero_button"];
  const hero_button =
    typeof rawButton === "string" && rawButton.trim()
      ? rawButton.trim().slice(0, 30)
      : "تسوق الآن";

  const rawBarEnabled = obj["bar_enabled"];
  const bar_enabled = typeof rawBarEnabled === "boolean" ? rawBarEnabled : true;

  const rawBarText = obj["bar_text"];
  const bar_text =
    typeof rawBarText === "string" && rawBarText.trim()
      ? rawBarText.trim().slice(0, 80)
      : "مرحبا بك في متجرنا";

  const sec = isRecord(obj["sections"]) ? obj["sections"] : {};
  const rawFaq = isRecord(sec["faq"]) ? sec["faq"] : {};

  // FAQ: capped at 8 items
  const rawFaqItems: unknown[] = Array.isArray(rawFaq["items"]) ? rawFaq["items"] : DEFAULT_FAQ;
  const faqItems: FaqItem[] = rawFaqItems
    .filter(isRawFaqItem)
    .slice(0, 8)
    .map((item) => ({
      q: item.q.trim().slice(0, 80),
      a: item.a.trim().slice(0, 300),
    }));

  const rawFaqEnabled = rawFaq["enabled"];
  const faq = {
    enabled: typeof rawFaqEnabled === "boolean" ? rawFaqEnabled : true,
    items: faqItems.length > 0 ? faqItems : DEFAULT_FAQ,
  };

  // Reviews: max 10, ratings 1-5 only, outside 1-5 rejected
  const rawReviewsConfig = isRecord(sec["reviews"]) ? sec["reviews"] : {};
  const rawReviews: unknown[] = Array.isArray(rawReviewsConfig["items"]) ? rawReviewsConfig["items"] : [];
  const reviewItems: ReviewItem[] = rawReviews
    .filter(isRawReviewItem)
    .slice(0, 10)
    .map((review) => ({
      name: review.name.trim().slice(0, 60),
      text: review.text.trim().slice(0, 300),
      rating: review.rating,
    }));

  const rawReviewsEnabled = rawReviewsConfig["enabled"];
  const reviews = {
    enabled: typeof rawReviewsEnabled === "boolean" ? rawReviewsEnabled : false,
    items: reviewItems,
  };

  // Social
  const rawSocial = isRecord(sec["social"]) ? sec["social"] : {};
  const social = {
    enabled: typeof rawSocial["enabled"] === "boolean" ? rawSocial["enabled"] : true,
    whatsapp: typeof rawSocial["whatsapp"] === "string" ? rawSocial["whatsapp"].trim() : undefined,
    instagram: typeof rawSocial["instagram"] === "string" ? rawSocial["instagram"].trim() : undefined,
    facebook: typeof rawSocial["facebook"] === "string" ? rawSocial["facebook"].trim() : undefined,
    tiktok: typeof rawSocial["tiktok"] === "string" ? rawSocial["tiktok"].trim() : undefined,
  };

  // Trust badges
  const rawTrust = isRecord(sec["trust"]) ? sec["trust"] : {};
  const rawBadges: readonly unknown[] = Array.isArray(rawTrust["badges"])
    ? rawTrust["badges"]
    : TRUST_BADGE_KEYS;
  const validBadges = rawBadges.filter(isTrustBadgeKey);
  const trust = {
    enabled: typeof rawTrust["enabled"] === "boolean" ? rawTrust["enabled"] : true,
    badges: validBadges.length > 0 ? validBadges : [...TRUST_BADGE_KEYS],
  };

  return {
    preset,
    language,
    hero_title,
    hero_subtitle,
    hero_button,
    bar_enabled,
    bar_text,
    sections: {
      faq,
      reviews,
      social,
      trust,
    },
  };
}

export function presetStyles(preset: PresetKey) {
  const p = HERO_PRESETS[preset] ?? HERO_PRESETS.noir;
  return {
    hero: {
      background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
      color: p.textColor,
    },
    button: {
      backgroundColor: p.buttonBg,
      color: p.buttonText,
    },
  };
}
