import { describe, expect, it } from "vitest";
import {
  DEFAULT_FAQ_BY_LANGUAGE,
  HERO_PRESETS,
  TRUST_BADGE_KEYS,
  parseStorefrontConfig,
  reviewItemSchema,
} from "./storefront-theme";

describe("storefront theme config", () => {
  it("empty {} -> English defaults (default language)", () => {
    const config = parseStorefrontConfig({}, "متجر النخبة");
    expect(config.preset).toBe("noir");
    expect(config.language).toBe("en");
    expect(config.hero_title).toBe("متجر النخبة");
    expect(config.hero_subtitle).toBe("Order now and pay on delivery");
    expect(config.hero_button).toBe("Shop now");
    expect(config.bar_enabled).toBe(true);
    expect(config.bar_text).toBe("Welcome to our store");
    expect(config.sections.faq.enabled).toBe(true);
    expect(config.sections.faq.items).toEqual(DEFAULT_FAQ_BY_LANGUAGE.en);
    expect(config.sections.reviews.enabled).toBe(false);
    expect(config.sections.reviews.items).toEqual([]);
    expect(config.sections.social.enabled).toBe(true);
    expect(config.sections.trust.enabled).toBe(true);
    expect(config.sections.trust.badges).toEqual([...TRUST_BADGE_KEYS]);
  });

  it("Arabic language -> Arabic defaults", () => {
    const config = parseStorefrontConfig({ language: "ar" }, "متجر النخبة");
    expect(config.language).toBe("ar");
    expect(config.hero_subtitle).toBe("اطلب الآن والدفع عند الاستلام");
    expect(config.hero_button).toBe("تسوق الآن");
    expect(config.bar_text).toBe("مرحبا بك في متجرنا");
    expect(config.sections.faq.items).toEqual(DEFAULT_FAQ_BY_LANGUAGE.ar);
  });

  it("falls back to default title if no store name provided for empty {}", () => {
    const config = parseStorefrontConfig({});
    expect(config.hero_title).toBe("Welcome to our store");
  });

  it("invalid preset -> \"noir\"", () => {
    const config1 = parseStorefrontConfig({ preset: "unknown_color" }, "متجري");
    expect(config1.preset).toBe("noir");

    const config2 = parseStorefrontConfig({ preset: 12345 }, "متجري");
    expect(config2.preset).toBe("noir");

    const config3 = parseStorefrontConfig({ preset: null }, "متجري");
    expect(config3.preset).toBe("noir");
  });

  it("FAQ capped at 8", () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => ({
      q: `سؤال رقم ${i + 1}`,
      a: `جواب رقم ${i + 1}`,
    }));

    const config = parseStorefrontConfig({
      sections: {
        faq: {
          enabled: true,
          items: tenItems,
        },
      },
    });

    expect(config.sections.faq.items.length).toBe(8);
    expect(config.sections.faq.items[0]?.q).toBe("سؤال رقم 1");
    expect(config.sections.faq.items[7]?.q).toBe("سؤال رقم 8");
  });

  it("reviews rating outside 1-5 rejected", () => {
    const reviewsWithInvalid = [
      { name: "أحمد", text: "ممتاز جداً", rating: 5 },
      { name: "كريم", text: "جيد", rating: 4 },
      { name: "خالد", text: "سيء", rating: 0 }, // rejected (< 1)
      { name: "سعيد", text: "فوق التقييم", rating: 6 }, // rejected (> 5)
      { name: "مراد", text: "تقييم كسري", rating: 4.5 }, // rejected (not integer)
      { name: "ياسين", text: "سلبي", rating: -2 }, // rejected (negative)
    ];

    const config = parseStorefrontConfig({
      sections: {
        reviews: {
          enabled: true,
          items: reviewsWithInvalid,
        },
      },
    });

    expect(config.sections.reviews.items.length).toBe(2);
    expect(config.sections.reviews.items.map((r) => r.name)).toEqual(["أحمد", "كريم"]);

    // Schema level validation also rejects ratings outside 1-5
    expect(() => reviewItemSchema.parse({ name: "علي", text: "رأي", rating: 0 })).toThrow();
    expect(() => reviewItemSchema.parse({ name: "علي", text: "رأي", rating: 6 })).toThrow();
    expect(reviewItemSchema.parse({ name: "علي", text: "رأي", rating: 1 })).toEqual({
      name: "علي",
      text: "رأي",
      rating: 1,
    });
  });

  it("has valid style properties for all 6 presets", () => {
    expect(Object.keys(HERO_PRESETS)).toHaveLength(6);
    for (const key of Object.keys(HERO_PRESETS) as (keyof typeof HERO_PRESETS)[]) {
      const preset = HERO_PRESETS[key];
      expect(preset.from).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.to).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.buttonBg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.buttonText).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
