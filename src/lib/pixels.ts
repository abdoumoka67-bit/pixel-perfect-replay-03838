// Meta Pixel for merchant storefronts (Pro). Browser only.
// The ID comes from the database already validated (digits only) and is
// re-checked here before being placed in a script.
import { isValidMetaPixelId, normalizeDzPhone } from "./commerce";

type Fn = (...args: unknown[]) => void;
type PixelWindow = Window & {
  fbq?: Fn;
  __oranixPixels?: Array<{ at: number; event: string; detail: unknown }>;
};

export type PixelIds = { meta_pixel_id: string | null };

export type PixelEvent = "ViewContent" | "InitiateCheckout" | "Purchase";

export type PixelProduct = { id: string; name: string; value: number; quantity?: number };

/** Extra options: same id on browser + server = one conversion. */
export type PixelOptions = { eventId?: string };

const loaded = { meta: "" };
let debug = false;

/** `?pixel_debug=1` turns on a readable log so merchants can verify tracking. */
export function isPixelDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (debug) return true;
  try {
    if (new URLSearchParams(window.location.search).get("pixel_debug") === "1") {
      debug = true;
    }
  } catch {
    // ignore malformed URLs
  }
  return debug;
}

function log(event: string, detail: unknown) {
  if (!isPixelDebug()) return;
  const w = window as PixelWindow;
  w.__oranixPixels = w.__oranixPixels ?? [];
  w.__oranixPixels.push({ at: Date.now(), event, detail });
  console.info(`[oranix pixel] ${event}`, detail);
}

function inject(code: string) {
  const s = document.createElement("script");
  s.text = code;
  document.head.appendChild(s);
}

async function sha256(value: string): Promise<string> {
  if (!value) return "";
  try {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // http:// origins have no Web Crypto: skip matching instead of failing the order.
    return "";
  }
}

/** Loads the pixel once and records a page view. Call on every storefront page mount. */
export function initPixels(ids: PixelIds) {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  const meta = ids.meta_pixel_id?.trim() ?? "";

  if (!meta || !isValidMetaPixelId(meta)) return;

  if (loaded.meta !== meta) {
    inject(
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');`,
    );
    loaded.meta = meta;
    log("meta:init", { id: meta });
  }
  w.fbq?.("track", "PageView");
  log("meta:PageView", {});
}

/**
 * Hashing the buyer's phone/name raises the match rate with Meta.
 * The raw values never leave the browser: only SHA-256 hex digests are sent.
 */
export async function identifyPixelCustomer(input: {
  phone?: string;
  name?: string;
  email?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (!loaded.meta) return;

  const phone = normalizeDzPhone(input.phone ?? "").replace(/\D/g, "");
  const e164 = phone ? `213${phone.replace(/^0/, "")}` : "";
  const fullName = (input.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const [firstName = "", ...rest] = fullName ? fullName.split(" ") : [];
  const lastName = rest.join(" ");
  const email = (input.email ?? "").trim().toLowerCase();

  const [ph, fn, ln, em] = await Promise.all([
    sha256(e164),
    sha256(firstName),
    sha256(lastName),
    sha256(email),
  ]);
  if (!ph && !fn && !em) return;

  const w = window as PixelWindow;
  w.fbq?.("init", loaded.meta, {
    ...(ph ? { ph } : {}),
    ...(fn ? { fn } : {}),
    ...(ln ? { ln } : {}),
    ...(em ? { em } : {}),
    country: "dz",
  });
  log("identify", { phone: Boolean(ph), name: Boolean(fn), email: Boolean(em) });
}

/** Sends a commerce event to the loaded pixel (no-op when none). */
export function trackPixel(event: PixelEvent, p: PixelProduct, opts: PixelOptions = {}) {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  const eventId = opts.eventId?.trim() || undefined;

  if (loaded.meta) {
    w.fbq?.(
      "track",
      event,
      {
        content_ids: [p.id],
        content_name: p.name,
        content_type: "product",
        value: p.value,
        currency: "DZD",
        ...(p.quantity ? { num_items: p.quantity } : {}),
      },
      ...(eventId ? [{ eventID: eventId }] : []),
    );
  }
  log(event, { ...p, eventId: eventId ?? null, meta: Boolean(loaded.meta) });
}
