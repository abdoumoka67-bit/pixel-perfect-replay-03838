import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = unknown[];

const META_ID = "123456789012345";

function stubFbq(): { calls: Call[]; fn: (...args: unknown[]) => void } {
  const calls: Call[] = [];
  const fn = (...args: unknown[]) => {
    calls.push(args);
  };
  (window as unknown as { fbq?: unknown }).fbq = fn;
  return { calls, fn };
}

function injectedScripts(): string[] {
  return Array.from(document.head.querySelectorAll("script"))
    .map((s) => s.textContent ?? "")
    .filter((text) => text.includes("connect.facebook.net"));
}

describe("pixel tracking", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    vi.resetModules();
  });

  it("loads the Meta pixel once and records a page view", async () => {
    const { calls } = stubFbq();
    const { initPixels } = await import("./pixels");

    initPixels({ meta_pixel_id: META_ID, tiktok_pixel_id: null });

    const scripts = injectedScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain(`fbq('init','${META_ID}')`);
    expect(scripts[0]).toContain("fbevents.js");
    expect(calls[0]).toEqual(["track", "PageView"]);

    // A second mount must not inject the same pixel again.
    initPixels({ meta_pixel_id: META_ID, tiktok_pixel_id: null });
    expect(injectedScripts()).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it("rejects malformed ids without touching the page", async () => {
    const { calls } = stubFbq();
    const { initPixels } = await import("./pixels");

    initPixels({ meta_pixel_id: "not-a-pixel", tiktok_pixel_id: null });

    expect(injectedScripts()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("sends commerce params and a shared event id for deduplication", async () => {
    const { calls } = stubFbq();
    const { initPixels, trackPixel } = await import("./pixels");

    initPixels({ meta_pixel_id: META_ID, tiktok_pixel_id: null });
    trackPixel(
      "Purchase",
      { id: "product-1", name: "White dress", value: 5500, quantity: 2 },
      { eventId: "orx-1042" },
    );

    const [, name, params, options] = calls.at(-1) as [
      string,
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(name).toBe("Purchase");
    expect(params).toMatchObject({
      content_ids: ["product-1"],
      content_name: "White dress",
      content_type: "product",
      value: 5500,
      currency: "DZD",
      num_items: 2,
    });
    expect(options).toEqual({ eventID: "orx-1042" });
  });

  it("sends only hashed buyer identifiers for advanced matching", async () => {
    const { webcrypto } = await import("node:crypto");
    if (!globalThis.crypto?.subtle) {
      vi.stubGlobal("crypto", webcrypto);
    }
    const { calls } = stubFbq();
    const { initPixels, identifyPixelCustomer } = await import("./pixels");

    initPixels({ meta_pixel_id: META_ID, tiktok_pixel_id: null });
    await identifyPixelCustomer({ phone: "0551234567", name: "Ali Ben" });

    const identify = calls.find((c) => c[0] === "init" && c[1] === META_ID && c[2]);
    expect(identify).toBeTruthy();
    const data = identify?.[2] as Record<string, string>;
    // 64 hex chars = SHA-256, and nothing reversible leaves the browser.
    expect(data.ph).toMatch(/^[a-f0-9]{64}$/);
    expect(data.fn).toMatch(/^[a-f0-9]{64}$/);
    expect(data.ln).toMatch(/^[a-f0-9]{64}$/);
    expect(data.country).toBe("dz");
    expect(JSON.stringify(data)).not.toContain("0551234567");
    expect(JSON.stringify(data)).not.toContain("Ali");
  });
});
