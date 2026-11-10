import { describe, expect, it } from "vitest";
import { attributionFromJson, attributionLabel, hasAttribution, parseAttribution } from "./attribution";

describe("ad attribution", () => {
  it("reads UTMs and platform click ids", () => {
    const a = parseAttribution(
      "?utm_source=facebook&utm_medium=cpc&utm_campaign=sept&fbclid=abc123&ttclid=tt9",
    );
    expect(a).toEqual({
      source: "facebook",
      medium: "cpc",
      campaign: "sept",
      fbclid: "abc123",
      ttclid: "tt9",
    });
  });

  it("accepts a query string without the leading question mark", () => {
    expect(parseAttribution("utm_source=tiktok").source).toBe("tiktok");
  });

  it("keeps the referrer and landing path", () => {
    const a = parseAttribution("", "https://www.instagram.com/", "/m/store/p/dress");
    expect(a.referrer).toBe("https://www.instagram.com/");
    expect(a.landing).toBe("/m/store/p/dress");
  });

  it("ignores empty values and strips control characters", () => {
    const a = parseAttribution("?utm_source=&utm_campaign=a%00b");
    expect(a.source).toBeUndefined();
    expect(a.campaign).toBe("ab");
  });

  it("caps very long ids", () => {
    const a = parseAttribution(`?fbclid=${"x".repeat(400)}`);
    expect(a.fbclid).toHaveLength(180);
  });

  it("treats an empty visit as unattributed", () => {
    expect(hasAttribution(parseAttribution(""))).toBe(false);
    expect(parseAttribution("")).toEqual({});
  });

  it("labels a source with its campaign", () => {
    expect(attributionLabel({ source: "tiktok", campaign: "sept" })).toBe("tiktok · sept");
    expect(attributionLabel({ source: "facebook" })).toBe("facebook");
    expect(attributionLabel(null)).toBeNull();
  });

  it("reads an order's stored jsonb and drops unknown keys", () => {
    expect(attributionFromJson({ source: "facebook", campaign: "sept", evil: "x", term: 5 })).toEqual({
      source: "facebook",
      campaign: "sept",
    });
    expect(attributionFromJson({})).toBeNull();
    expect(attributionFromJson(null)).toBeNull();
    expect(attributionFromJson("facebook")).toBeNull();
  });
});
