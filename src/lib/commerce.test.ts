import { describe, expect, it } from "vitest";
import {
  MAX_TEAM_MEMBERS,
  MAX_TEAM_USERS,
  calculateSubscriptionPrice,
  canOpen,
  cleanDomainName,
  effectiveTier,
  evaluateCustomerTrust,
  isValidDomainName,
  isValidDzPhone,
  languageDocumentAttributes,
  normalizeLanguage,
  orderLimitState,
  orderTotal,
  shippingPrice,
  subscriptionState,
  suggestedStoreSlug,
} from "./commerce";

describe("language preference", () => {
  it("falls back to Arabic for unknown or missing values", () => {
    expect(normalizeLanguage(null)).toBe("ar");
    expect(normalizeLanguage("zz")).toBe("ar");
    expect(normalizeLanguage("fr")).toBe("fr");
    expect(normalizeLanguage("EN")).toBe("ar");
  });
  it("Arabic is RTL with the Tajawal font", () => {
    expect(languageDocumentAttributes("ar")).toEqual({ lang: "ar", dir: "rtl", fontClass: "font-tajawal" });
  });
  it("French and English are LTR with the SF Pro font stack", () => {
    expect(languageDocumentAttributes("fr")).toEqual({ lang: "fr", dir: "ltr", fontClass: "font-sans" });
    expect(languageDocumentAttributes("en")).toEqual({ lang: "en", dir: "ltr", fontClass: "font-sans" });
  });
});

describe("Algerian phone validation", () => {
  it("accepts 10-digit numbers starting with 05, 06 or 07", () => {
    expect(isValidDzPhone("0550123456")).toBe(true);
    expect(isValidDzPhone("0661234567")).toBe(true);
    expect(isValidDzPhone("0770 12 34 56")).toBe(true);
  });
  it("accepts international Algerian numbers with the +213 prefix", () => {
    expect(isValidDzPhone("+213 550 12 34 56")).toBe(true);
    expect(isValidDzPhone("213550123456")).toBe(true);
  });
  it("rejects other prefixes and lengths", () => {
    expect(isValidDzPhone("0450123456")).toBe(false);
    expect(isValidDzPhone("055012345")).toBe(false);
    expect(isValidDzPhone("05501234567")).toBe(false);
  });
});

describe("customer trust radar (Spam Link Shredder)", () => {
  const order = (phone: string, status: string, minutesAgo: number) => ({
    customer_phone: phone,
    status,
    created_at: new Date(Date.parse("2026-01-01T10:00:00Z") - minutesAgo * 60_000).toISOString(),
  });

  it("high: at least one delivered order and zero cancellations", () => {
    const tiers = [
      order("0550123456", "delivered", 48 * 60),
      order("0550123456", "delivered", 1440),
    ];
    const t = evaluateCustomerTrust(tiers, "0550 12 34 56");
    expect(t.tier).toBe("high");
    expect(t.totalOrders).toBe(2);
    expect(t.delivered).toBe(2);
    expect(t.cancelled).toBe(0);
  });

  it("neutral: first-time buyer", () => {
    const tiers = [order("0661234567", "new", 30)];
    expect(evaluateCustomerTrust(tiers, "0661234567").tier).toBe("neutral");
    expect(evaluateCustomerTrust([], "0661234567").tier).toBe("neutral");
  });

  it("risky: cancellations outweigh delivered orders", () => {
    const tiers = [order("0770123456", "cancelled", 48 * 60)];
    const t = evaluateCustomerTrust(tiers, "0770123456");
    expect(t.tier).toBe("risky");
  });

  it("spam: rapid duplicate orders within 15 minutes", () => {
    const tiers = [
      order("0555112233", "new", 10),
      order("0555112233", "new", 5),
    ];
    const t = evaluateCustomerTrust(tiers, "0555112233");
    expect(t.tier).toBe("spam");
    expect(t.rapidDuplicates).toBe(true);
  });

  it("spam: repeated cancellations even without rapid duplicates", () => {
    const tiers = [
      order("0555112244", "cancelled", 96 * 60),
      order("0555112244", "cancelled", 48 * 60),
      order("0555112244", "delivered", 24 * 60),
    ];
    const t = evaluateCustomerTrust(tiers, "0555112244");
    expect(t.tier).toBe("spam");
    expect(t.rapidDuplicates).toBe(false);
  });

  it("orders from other phones and malformed phones are ignored", () => {
    const tiers = [
      order("0559110033", "cancelled", 30),
      order("", "delivered", 40),
    ];
    const t = evaluateCustomerTrust(tiers, "0550112233");
    expect(t.tier).toBe("neutral");
    expect(t.totalOrders).toBe(0);
  });
});

describe("delivery price", () => {
  const defaults = { default_home_price: 700, default_desk_price: 450 };
  const rates = [{ wilaya_code: 16, home_price: 400, desk_price: null }];
  it("uses the custom wilaya rate when set", () => {
    expect(shippingPrice(16, "home", rates, defaults)).toBe(400);
  });
  it("returns null when the delivery type is disabled for that wilaya", () => {
    expect(shippingPrice(16, "desk", rates, defaults)).toBeNull();
  });
  it("falls back to store defaults for other wilayas", () => {
    expect(shippingPrice(31, "desk", rates, defaults)).toBe(450);
  });
  it("total = price x quantity + shipping", () => {
    expect(orderTotal(3500, 2, 400)).toBe(7400);
  });
});

describe("suggested store slug", () => {
  it("uses a valid latin slug from the store name or email", () => {
    expect(suggestedStoreSlug("Lina Store", "seller@example.com", "12345678")).toBe("lina-store");
    expect(suggestedStoreSlug("متجر", "seller@example.com", "12345678")).toBe("seller");
  });

  it("falls back to a stable unique slug when the name and email are not usable", () => {
    expect(suggestedStoreSlug("متجر", null, "1234-5678-90")).toBe("store-12345678");
    expect(suggestedStoreSlug("متجر", "x@example.com", "abcdef12")).toBe("store-abcdef12");
  });
});

describe("10-day trial, grace period and read-only mode", () => {
  const created = new Date("2026-01-01T00:00:00Z");
  const trialEnd = new Date(created.getTime() + 10 * 864e5).toISOString();

  it("keeps full Pro access during the 10-day free trial", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-03T00:00:00Z"));
    expect(s.isActive).toBe(true);
    expect(s.isTrial).toBe(true);
    expect(s.showWarning).toBe(false);
    expect(effectiveTier({ trial_ends_at: trialEnd, paid_until: null, plan_tier: "start" }, new Date("2026-01-03T00:00:00Z"))).toBe("pro");
  });

  it("warns on the last two days of the trial", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-09T00:00:00Z"));
    expect(s.showWarning).toBe(true);
    expect(s.daysLeft).toBe(2);

    const lastDay = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-10T00:00:00Z"));
    expect(lastDay.showWarning).toBe(true);
    expect(lastDay.daysLeft).toBe(1);
  });

  it("enters a 7-day grace period after the trial expires without payment", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-15T00:00:00Z"));
    expect(s.isGracePeriod).toBe(true);
    expect(s.isActive).toBe(false);
    expect(s.daysLeft).toBeGreaterThan(0);
  });

  it("stays active when a paid period extends past the trial", () => {
    const s = subscriptionState(
      { trial_ends_at: trialEnd, paid_until: "2026-03-01T00:00:00Z" },
      new Date("2026-02-01T00:00:00Z"),
    );
    expect(s.isActive).toBe(true);
    expect(s.isTrial).toBe(false);
  });
});

describe("custom domain add-on", () => {
  it("accepts normal domains", () => {
    expect(isValidDomainName("storename.com")).toBe(true);
    expect(isValidDomainName("shop.lina.dz")).toBe(true);
    expect(isValidDomainName("https://My-Shop.com/")).toBe(true);
  });
  it("rejects single labels, symbols and bad hyphens", () => {
    expect(isValidDomainName("localhost")).toBe(false);
    expect(isValidDomainName("-bad.com")).toBe(false);
    expect(isValidDomainName("bad..com")).toBe(false);
  });
  it("sanitizes a pasted URL", () => {
    expect(cleanDomainName("https://StoreName.com/path")).toBe("storename.com");
  });
});

describe("Start and Pro plans", () => {
  it("prices 1 to 5 months at the monthly rate", () => {
    expect(calculateSubscriptionPrice("start", 1)).toBe(1700);
    expect(calculateSubscriptionPrice("start", 2)).toBe(3400);
    expect(calculateSubscriptionPrice("pro", 3)).toBe(10200);
    expect(calculateSubscriptionPrice("pro", 5)).toBe(17000);
  });
  it("the 6-month promo is pay 5, get one free", () => {
    expect(calculateSubscriptionPrice("start", 6)).toBe(8500);
    expect(calculateSubscriptionPrice("pro", 6)).toBe(17000);
  });
  it("rejects out-of-range durations", () => {
    expect(calculateSubscriptionPrice("start", 0)).toBe(0);
    expect(calculateSubscriptionPrice("start", 7)).toBe(0);
    expect(calculateSubscriptionPrice("pro", 1.5)).toBe(0);
  });

  it("Start accepts up to 300 orders a month", () => {
    expect(orderLimitState("start", 299).reached).toBe(false);
    expect(orderLimitState("start", 300).reached).toBe(true);
    expect(orderLimitState("start", 120).remaining).toBe(180);
  });
  it("Start warns the merchant from 250 orders", () => {
    expect(orderLimitState("start", 249).nearLimit).toBe(false);
    expect(orderLimitState("start", 250).nearLimit).toBe(true);
  });
  it("Pro has unlimited orders", () => {
    const s = orderLimitState("pro", 5000);
    expect(s.reached).toBe(false);
    expect(s.limit).toBeNull();
  });
  it("Pro allows 5 users: the owner plus 4 members", () => {
    expect(MAX_TEAM_USERS).toBe(5);
    expect(MAX_TEAM_MEMBERS).toBe(4);
  });
  it("the free trial gets Pro features", () => {
    const store = { trial_ends_at: "2026-01-12T00:00:00Z", paid_until: null, plan_tier: "start" };
    expect(effectiveTier(store, new Date("2026-01-03T00:00:00Z"))).toBe("pro");
  });
  it("after paying for Start, the store is on Start", () => {
    const store = { trial_ends_at: "2026-01-12T00:00:00Z", paid_until: "2026-02-12T00:00:00Z", plan_tier: "start" };
    expect(effectiveTier(store, new Date("2026-01-20T00:00:00Z"))).toBe("start");
  });
  it("analytics are for the owner and managers, not confirmation agents", () => {
    expect(canOpen("owner", "analytics")).toBe(true);
    expect(canOpen("manager", "analytics")).toBe(true);
    expect(canOpen("agent", "analytics")).toBe(false);
  });
  it("only the owner manages the team and billing", () => {
    expect(canOpen("manager", "team")).toBe(false);
    expect(canOpen("manager", "billing")).toBe(false);
    expect(canOpen("owner", "team")).toBe(true);
  });
});

import { areaForPath, isValidMetaPixelId, isValidTiktokPixelId } from "./commerce";

describe("Ad pixel IDs", () => {
  it("accepts a Meta Pixel ID of 10 to 20 digits", () => {
    expect(isValidMetaPixelId("123456789012345")).toBe(true);
    expect(isValidMetaPixelId("")).toBe(true);
  });
  it("rejects a Meta Pixel ID with letters or too short", () => {
    expect(isValidMetaPixelId("12345abc90")).toBe(false);
    expect(isValidMetaPixelId("123456789")).toBe(false);
  });
  it("accepts a TikTok Pixel ID of Latin letters and digits", () => {
    expect(isValidTiktokPixelId("cabc12345defg678")).toBe(true);
  });
  it("rejects a TikTok Pixel ID with symbols", () => {
    expect(isValidTiktokPixelId("<script>alert1</script>")).toBe(false);
  });
});

describe("Team page access by address", () => {
  it("an agent cannot open the team, activity or settings pages", () => {
    expect(canOpen("agent", areaForPath("/dashboard/team"))).toBe(false);
    expect(canOpen("agent", areaForPath("/dashboard/activity"))).toBe(false);
    expect(canOpen("agent", areaForPath("/dashboard/settings/"))).toBe(false);
  });
  it("an agent can open orders; a manager can open activity but not billing", () => {
    expect(canOpen("agent", areaForPath("/dashboard/orders"))).toBe(true);
    expect(canOpen("manager", areaForPath("/dashboard/activity"))).toBe(true);
    expect(canOpen("manager", areaForPath("/dashboard/billing"))).toBe(false);
  });
});
