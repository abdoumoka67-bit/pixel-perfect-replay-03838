import { describe, expect, it } from "vitest";
import {
  MAX_TEAM_MEMBERS,
  MAX_TEAM_USERS,
  canOpen,
  effectiveTier,
  isValidDzPhone,
  orderLimitState,
  orderTotal,
  shippingPrice,
  subscriptionState,
} from "./commerce";

describe("Algerian phone validation", () => {
  it("accepts 10-digit numbers starting with 05, 06 or 07", () => {
    expect(isValidDzPhone("0550123456")).toBe(true);
    expect(isValidDzPhone("0661234567")).toBe(true);
    expect(isValidDzPhone("0770 12 34 56")).toBe(true);
  });
  it("rejects other prefixes and lengths", () => {
    expect(isValidDzPhone("0450123456")).toBe(false);
    expect(isValidDzPhone("055012345")).toBe(false);
    expect(isValidDzPhone("05501234567")).toBe(false);
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

describe("7-day trial and read-only mode", () => {
  const created = new Date("2026-01-01T00:00:00Z");
  const trialEnd = new Date(created.getTime() + 7 * 864e5).toISOString();
  it("is active during the trial without a warning on day 3", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-03T00:00:00Z"));
    expect(s.isActive).toBe(true);
    expect(s.showWarning).toBe(false);
  });
  it("warns two days before the trial ends", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-06T00:00:00Z"));
    expect(s.showWarning).toBe(true);
  });
  it("becomes read-only after 7 days without payment", () => {
    const s = subscriptionState({ trial_ends_at: trialEnd, paid_until: null }, new Date("2026-01-08T00:00:01Z"));
    expect(s.isActive).toBe(false);
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

describe("Start and Pro plans", () => {
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
    const store = { trial_ends_at: "2026-01-08T00:00:00Z", paid_until: null, plan_tier: "start" };
    expect(effectiveTier(store, new Date("2026-01-03T00:00:00Z"))).toBe("pro");
  });
  it("after paying for Start, the store is on Start", () => {
    const store = { trial_ends_at: "2026-01-08T00:00:00Z", paid_until: "2026-02-08T00:00:00Z", plan_tier: "start" };
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
