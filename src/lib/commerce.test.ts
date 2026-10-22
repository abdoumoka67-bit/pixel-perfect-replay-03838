import { describe, expect, it } from "vitest";
import { isValidDzPhone, orderTotal, shippingPrice, subscriptionState } from "./commerce";

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
