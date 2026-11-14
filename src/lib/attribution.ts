/**
 * First-touch ad attribution for storefront orders.
 *
 * Ad clicks arrive with UTMs and platform click ids (`fbclid`, `ttclid`, `gclid`).
 * The router is client side, so those params disappear on the next navigation:
 * we persist them once per visitor and attach them to `place_order`, which is
 * the only way to know later which campaign actually produced an order.
 */

export type OrderAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  referrer?: string;
  landing?: string;
};

export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "oranix_attribution";
const MAX_LENGTH = 180;

const QUERY_FIELDS: Array<[string, keyof OrderAttribution]> = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
  ["fbclid", "fbclid"],
  ["ttclid", "ttclid"],
  ["gclid", "gclid"],
];

const KNOWN_KEYS: Array<keyof OrderAttribution> = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "fbclid",
  "ttclid",
  "gclid",
  "referrer",
  "landing",
];

function clean(value: string | null | undefined, max = MAX_LENGTH): string {
  if (!value) return "";
  // Strip control characters so nothing odd reaches the database payload.
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

/** Reads UTMs + click ids out of a query string. Pure, used by tests too. */
export function parseAttribution(
  search: string,
  referrer = "",
  path = "",
): OrderAttribution {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: OrderAttribution = {};
  for (const [param, key] of QUERY_FIELDS) {
    const value = clean(params.get(param));
    if (value) out[key] = value;
  }
  const ref = clean(referrer, 240);
  if (ref) out.referrer = ref;
  const landing = clean(path, 240);
  if (landing) out.landing = landing;
  return out;
}

export function hasAttribution(a: OrderAttribution): boolean {
  return KNOWN_KEYS.some((key) => Boolean(a[key]));
}

/** Keeps only known string keys, so a tampered storage entry cannot leak extra data. */
function sanitize(raw: unknown): OrderAttribution | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const out: OrderAttribution = {};
  for (const key of KNOWN_KEYS) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = clean(value, 240);
      if (trimmed) out[key] = trimmed;
    }
  }
  return hasAttribution(out) ? out : null;
}

function readStored(): { data: OrderAttribution; ts: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: unknown; ts?: unknown };
    const data = sanitize(parsed.data);
    const ts = typeof parsed.ts === "number" ? parsed.ts : 0;
    if (!data || !ts) return null;
    return { data, ts };
  } catch {
    return null;
  }
}

/**
 * Stores the attribution of the current visit. First touch wins: if the visitor
 * already arrived from an ad within the last 30 days we keep that campaign,
 * because that is what should be credited with the order.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const stored = readStored();
  if (stored && Date.now() - stored.ts < ATTRIBUTION_TTL_MS) return;

  const current = parseAttribution(
    window.location.search,
    document.referrer,
    window.location.pathname,
  );
  if (!hasAttribution(current)) return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ts: Date.now(), data: current }),
    );
  } catch {
    // Storage disabled (private mode): the order simply goes un-attributed.
  }
}

/** Returns the attribution to attach to an order, or null when none was captured. */
export function readAttribution(): OrderAttribution | null {
  if (typeof window === "undefined") return null;
  const stored = readStored();
  if (!stored || Date.now() - stored.ts >= ATTRIBUTION_TTL_MS) return null;
  return stored.data;
}

/** Reads the attribution jsonb stored on an order (already sanitized in SQL). */
export function attributionFromJson(value: unknown): OrderAttribution | null {
  return sanitize(value);
}

/** Human label for a source, e.g. "TikTok · september_videos". */
export function attributionLabel(a: OrderAttribution | null): string | null {
  if (!a) return null;
  if (a.source && a.campaign) return `${a.source} · ${a.campaign}`;
  return a.source ?? a.campaign ?? a.medium ?? null;
}
