import { z } from "zod";

export const PRESET_KEYS = ["noir", "charcoal_gold", "midnight", "emerald", "plum", "minimal"] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

/** Interface language of a store, saved with its storefront settings. */
export const STOREFRONT_LANGUAGES = ["ar", "fr", "en"] as const;
export type StorefrontLanguage = (typeof STOREFRONT_LANGUAGES)[number];
export const STOREFRONT_LANGUAGE_DEFAULT: StorefrontLanguage = "en";

export const ARABIC_FONTS = [
  { id: "tajawal", name: "Tajawal", family: "'Tajawal', sans-serif" },
  { id: "cairo", name: "Cairo", family: "'Cairo', sans-serif" },
  { id: "almarai", name: "Almarai", family: "'Almarai', sans-serif" },
  { id: "readex", name: "Readex Pro", family: "'Readex Pro', sans-serif" },
  { id: "alexandria", name: "Alexandria", family: "'Alexandria', sans-serif" },
  { id: "changa", name: "Changa", family: "'Changa', sans-serif" },
  { id: "noto-arabic", name: "Noto Sans Arabic", family: "'Noto Sans Arabic', sans-serif" },
  { id: "rubik", name: "Rubik", family: "'Rubik', sans-serif" },
  { id: "ibm-arabic", name: "IBM Plex Sans Arabic", family: "'IBM Plex Sans Arabic', sans-serif" },
  { id: "amiri", name: "Amiri", family: "'Amiri', serif" },
] as const;

export const LATIN_FONTS = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "jakarta", name: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif" },
  { id: "outfit", name: "Outfit", family: "'Outfit', sans-serif" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif" },
  { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
  { id: "syne", name: "Syne", family: "'Syne', sans-serif" },
  { id: "playfair", name: "Playfair Display", family: "'Playfair Display', serif" },
  { id: "dm-sans", name: "DM Sans", family: "'DM Sans', sans-serif" },
  { id: "manrope", name: "Manrope", family: "'Manrope', sans-serif" },
] as const;

/** Every font a storefront may store in `font_family` (Arabic first, then Latin). */
export const STOREFRONT_FONTS = [
  "Tajawal",
  "Cairo",
  "Almarai",
  "Readex Pro",
  "Alexandria",
  "Changa",
  "Noto Sans Arabic",
  "Rubik",
  "IBM Plex Sans Arabic",
  "Amiri",
  "Inter",
  "Plus Jakarta Sans",
  "Outfit",
  "Poppins",
  "Montserrat",
  "Space Grotesk",
  "Syne",
  "Playfair Display",
  "DM Sans",
  "Manrope",
] as const;
export const HERO_TITLE_SIZES = ["sm", "base", "lg", "xl", "2xl"] as const;
export const ELEMENT_ALIGNMENTS = ["start", "center", "end"] as const;
export const BUTTON_SIZES = ["sm", "md", "lg"] as const;
export const BUTTON_RADII = ["none", "md", "lg", "full"] as const;

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

/** Default FAQ per language, used until the merchant edits their own questions. */
export const DEFAULT_FAQ_BY_LANGUAGE: Record<StorefrontLanguage, { q: string; a: string }[]> = {
  ar: [
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
  ],
  en: [
    {
      q: "How much is delivery to my wilaya?",
      a: "Delivery varies by wilaya (home or office). The price appears as soon as you select your wilaya in the order form.",
    },
    {
      q: "How do I pay?",
      a: "Cash on delivery: you pay in cash when the parcel arrives.",
    },
    {
      q: "When will my order arrive?",
      a: "After we call you and confirm the order, we hand it to the delivery company. Timing varies by wilaya.",
    },
    {
      q: "How do I know my order was placed?",
      a: "A confirmation page shows your order number, then we call you to confirm.",
    },
  ],
  fr: [
    {
      q: "Combien coûte la livraison dans ma wilaya ?",
      a: "La livraison varie selon la wilaya (à domicile ou au bureau). Le prix s'affiche dès que vous choisissez votre wilaya dans le formulaire.",
    },
    {
      q: "Comment payer ?",
      a: "Paiement à la livraison : vous payez en espèces à la réception du colis.",
    },
    {
      q: "Quand ma commande arrivera-t-elle ?",
      a: "Après confirmation par téléphone, nous confions la commande au transporteur. Le délai varie selon la wilaya.",
    },
    {
      q: "Comment savoir si ma commande est enregistrée ?",
      a: "Une page de confirmation affiche votre numéro de commande, puis nous vous appelons pour confirmer.",
    },
  ],
};

/** Arabic defaults, kept for backwards compatibility. */
export const DEFAULT_FAQ = DEFAULT_FAQ_BY_LANGUAGE.ar;

/** Default storefront texts per language (used when the merchant left them empty). */
export const STOREFRONT_DEFAULTS: Record<
  StorefrontLanguage,
  { welcomeTitle: string; heroSubtitle: string; heroButton: string; barText: string }
> = {
  ar: {
    welcomeTitle: "مرحباً بك في متجرنا",
    heroSubtitle: "اطلب الآن والدفع عند الاستلام",
    heroButton: "تسوق الآن",
    barText: "مرحبا بك في متجرنا",
  },
  en: {
    welcomeTitle: "Welcome to our store",
    heroSubtitle: "Order now and pay on delivery",
    heroButton: "Shop now",
    barText: "Welcome to our store",
  },
  fr: {
    welcomeTitle: "Bienvenue dans notre boutique",
    heroSubtitle: "Commandez maintenant et payez à la livraison",
    heroButton: "Acheter maintenant",
    barText: "Bienvenue dans notre boutique",
  },
};

/** Trust badge labels per language. */
export const TRUST_BADGE_LABELS: Record<StorefrontLanguage, Record<TrustBadgeKey, string>> = {
  ar: {
    cod: "الدفع عند الاستلام",
    delivery_58: "توصيل لـ 58 ولاية",
    exchange: "إمكانية الاستبدال",
    original: "منتجات أصلية",
    support: "خدمة زبائن عبر واتساب",
  },
  en: {
    cod: "Cash on delivery",
    delivery_58: "Delivery to 58 wilayas",
    exchange: "Exchange available",
    original: "Original products",
    support: "WhatsApp customer support",
  },
  fr: {
    cod: "Paiement à la livraison",
    delivery_58: "Livraison dans les 58 wilayas",
    exchange: "Échange possible",
    original: "Produits originaux",
    support: "Service client via WhatsApp",
  },
};

export function trustBadgeLabel(key: TrustBadgeKey, language: StorefrontLanguage): string {
  return TRUST_BADGE_LABELS[language][key];
}

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

/** Button radii accepted by the order form config (no `lg`, per the form contract). */
export const FORM_BUTTON_RADII = ["none", "md", "full"] as const;

/** Field that can be hidden and/or made optional from the order form. */
export const formFieldSchema = z.object({
  enabled: z.boolean().default(true),
  required: z.boolean().default(true),
});

/** Field that can only be hidden (the value is optional whenever shown). */
export const formOptionalFieldSchema = z.object({
  enabled: z.boolean().default(true),
});

/**
 * Order-form overrides stored inside `storefront_config.form_config`.
 * Colors and texts stay optional so an unset config keeps the storefront theme.
 */
export const formConfigSchema = z
  .object({
    card_bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    card_border: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    input_bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    button_bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    button_text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    button_radius: z.enum(FORM_BUTTON_RADII).optional(),
    button_label: z.string().trim().max(50).optional(),
    guarantee_text: z.string().trim().max(100).optional(),
    fields: z
      .object({
        full_name: formFieldSchema.default({}),
        phone: formFieldSchema.default({}),
        confirm_phone: formOptionalFieldSchema.default({ enabled: false }),
        backup_phone: formOptionalFieldSchema.default({ enabled: false }),
        wilaya_commune: formFieldSchema.default({}),
        address: formOptionalFieldSchema.default({ enabled: true }),
        delivery_type: formOptionalFieldSchema.default({ enabled: true }),
        notes: formOptionalFieldSchema.default({ enabled: false }),
      })
      .default({}),
  })
  .default({});

export type FormConfig = z.infer<typeof formConfigSchema>;

export const storefrontConfigSchema = z.object({
  preset: z.enum(PRESET_KEYS).default("noir"),
  language: z.enum(STOREFRONT_LANGUAGES).default(STOREFRONT_LANGUAGE_DEFAULT),
  hero_title: z.string().trim().max(80).default(""),
  hero_subtitle: z.string().trim().max(160).default("اطلب الآن والدفع عند الاستلام"),
  hero_button: z.string().trim().max(30).default("تسوق الآن"),
  hero_bg_type: z.enum(["color", "image"]).default("color"),
  hero_image_url: z.string().trim().max(500).optional(),
  hero_bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#111111"),
  hero_text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  hero_overlay_opacity: z.number().int().min(0).max(90).default(40),
  font_family: z.enum(STOREFRONT_FONTS).default("Tajawal"),
  title_size: z.enum(HERO_TITLE_SIZES).default("xl"),
  text_align: z.enum(ELEMENT_ALIGNMENTS).default("center"),
  button_bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  button_text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#111111"),
  button_size: z.enum(BUTTON_SIZES).default("md"),
  button_radius: z.enum(BUTTON_RADII).default("lg"),
  button_align: z.enum(ELEMENT_ALIGNMENTS).default("center"),
  bar_enabled: z.boolean().default(true),
  bar_text: z.string().trim().max(80).default("مرحبا بك في متجرنا"),
  bar_bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#111111"),
  bar_text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
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
  form_config: formConfigSchema.default({}),
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
  const defaultLanguage = STOREFRONT_LANGUAGE_DEFAULT;
  const defaultTexts = STOREFRONT_DEFAULTS[defaultLanguage];
  const defaultDesign = {
    hero_bg_type: "color" as const,
    hero_image_url: undefined,
    hero_bg_color: "#111111",
    hero_text_color: "#FFFFFF",
    hero_overlay_opacity: 40,
    font_family: "Tajawal" as const,
    title_size: "xl" as const,
    text_align: "center" as const,
    button_bg_color: "#FFFFFF",
    button_text_color: "#111111",
    button_size: "md" as const,
    button_radius: "lg" as const,
    button_align: "center" as const,
    bar_bg_color: "#111111",
    bar_text_color: "#FFFFFF",
  };

  if (!isRecord(raw)) {
    const fallbackTitle = storeName.trim() || defaultTexts.welcomeTitle;
    return {
      preset: "noir",
      language: defaultLanguage,
      hero_title: fallbackTitle,
      hero_subtitle: defaultTexts.heroSubtitle,
      hero_button: defaultTexts.heroButton,
      ...defaultDesign,
      bar_enabled: true,
      bar_text: defaultTexts.barText,
      form_config: formConfigSchema.parse({}),
      sections: {
        faq: { enabled: true, items: DEFAULT_FAQ_BY_LANGUAGE[defaultLanguage] },
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

  const texts = STOREFRONT_DEFAULTS[language];
  const fallbackTitle = storeName.trim() || texts.welcomeTitle;
  const defaultFaq = DEFAULT_FAQ_BY_LANGUAGE[language];

  const rawTitle = obj["hero_title"];
  const hero_title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim().slice(0, 80)
      : fallbackTitle;

  const rawSubtitle = obj["hero_subtitle"];
  const hero_subtitle =
    typeof rawSubtitle === "string" && rawSubtitle.trim()
      ? rawSubtitle.trim().slice(0, 160)
      : texts.heroSubtitle;

  const rawButton = obj["hero_button"];
  const hero_button =
    typeof rawButton === "string" && rawButton.trim()
      ? rawButton.trim().slice(0, 30)
      : texts.heroButton;

  const rawHeroImage = obj["hero_image_url"];
  const candidateHeroImage = typeof rawHeroImage === "string" ? rawHeroImage.trim().slice(0, 500) : "";
  const hero_image_url =
    (/^https?:\/\/[^\s"'<>]+$/i.test(candidateHeroImage) || /^[A-Za-z0-9._/-]+$/.test(candidateHeroImage))
      ? candidateHeroImage || undefined
      : undefined;
  const isHexColor = (value: unknown): value is string =>
    typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
  const hero_bg_type = obj["hero_bg_type"] === "image" ? "image" : "color";
  const hero_bg_color = isHexColor(obj["hero_bg_color"]) ? obj["hero_bg_color"] : HERO_PRESETS[preset].from;
  const hero_text_color = isHexColor(obj["hero_text_color"]) ? obj["hero_text_color"] : HERO_PRESETS[preset].textColor;
  const rawOverlay = obj["hero_overlay_opacity"];
  const hero_overlay_opacity =
    typeof rawOverlay === "number" && Number.isFinite(rawOverlay)
      ? Math.min(90, Math.max(0, Math.round(rawOverlay)))
      : defaultDesign.hero_overlay_opacity;
  const font_family =
    typeof obj["font_family"] === "string" &&
    STOREFRONT_FONTS.some((font) => font === obj["font_family"])
      ? (obj["font_family"] as (typeof STOREFRONT_FONTS)[number])
      : defaultDesign.font_family;
  const title_size =
    typeof obj["title_size"] === "string" &&
    HERO_TITLE_SIZES.some((size) => size === obj["title_size"])
      ? (obj["title_size"] as (typeof HERO_TITLE_SIZES)[number])
      : defaultDesign.title_size;
  const text_align =
    typeof obj["text_align"] === "string" &&
    ELEMENT_ALIGNMENTS.some((align) => align === obj["text_align"])
      ? (obj["text_align"] as (typeof ELEMENT_ALIGNMENTS)[number])
      : defaultDesign.text_align;
  const button_bg_color = isHexColor(obj["button_bg_color"]) ? obj["button_bg_color"] : HERO_PRESETS[preset].buttonBg;
  const button_text_color = isHexColor(obj["button_text_color"]) ? obj["button_text_color"] : HERO_PRESETS[preset].buttonText;
  const button_size =
    typeof obj["button_size"] === "string" &&
    BUTTON_SIZES.some((size) => size === obj["button_size"])
      ? (obj["button_size"] as (typeof BUTTON_SIZES)[number])
      : defaultDesign.button_size;
  const button_radius =
    typeof obj["button_radius"] === "string" &&
    BUTTON_RADII.some((radius) => radius === obj["button_radius"])
      ? (obj["button_radius"] as (typeof BUTTON_RADII)[number])
      : defaultDesign.button_radius;
  const button_align =
    typeof obj["button_align"] === "string" &&
    ELEMENT_ALIGNMENTS.some((align) => align === obj["button_align"])
      ? (obj["button_align"] as (typeof ELEMENT_ALIGNMENTS)[number])
      : defaultDesign.button_align;
  const bar_bg_color = isHexColor(obj["bar_bg_color"]) ? obj["bar_bg_color"] : defaultDesign.bar_bg_color;
  const bar_text_color = isHexColor(obj["bar_text_color"]) ? obj["bar_text_color"] : defaultDesign.bar_text_color;

  const rawBarEnabled = obj["bar_enabled"];
  const bar_enabled = typeof rawBarEnabled === "boolean" ? rawBarEnabled : true;

  const rawBarText = obj["bar_text"];
  const bar_text =
    typeof rawBarText === "string" && rawBarText.trim()
      ? rawBarText.trim().slice(0, 80)
      : texts.barText;

  const sec = isRecord(obj["sections"]) ? obj["sections"] : {};
  const rawFaq = isRecord(sec["faq"]) ? sec["faq"] : {};

  // FAQ: capped at 8 items
  const rawFaqItems: unknown[] = Array.isArray(rawFaq["items"]) ? rawFaq["items"] : defaultFaq;
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
    items: faqItems.length > 0 ? faqItems : defaultFaq,
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

  const parsedFormConfig = formConfigSchema.safeParse(obj["form_config"]);
  const form_config = parsedFormConfig.success ? parsedFormConfig.data : formConfigSchema.parse({});

  return {
    preset,
    language,
    hero_title,
    hero_subtitle,
    hero_button,
    hero_bg_type,
    hero_image_url,
    hero_bg_color,
    hero_text_color,
    hero_overlay_opacity,
    font_family,
    title_size,
    text_align,
    button_bg_color,
    button_text_color,
    button_size,
    button_radius,
    button_align,
    bar_enabled,
    bar_text,
    bar_bg_color,
    bar_text_color,
    form_config,
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
