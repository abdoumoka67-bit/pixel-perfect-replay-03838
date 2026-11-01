// Meta Pixel + TikTok Pixel for merchant storefronts (Pro). Browser only.
// IDs come from the database already validated (digits / Latin letters only) and are
// re-checked here before being placed in a script.
import { isValidMetaPixelId, isValidTiktokPixelId } from "./commerce";

type Fn = (...args: unknown[]) => void;
type Ttq = { page: Fn; track: Fn };
type PixelWindow = Window & { fbq?: Fn; ttq?: Ttq };

export type PixelIds = { meta_pixel_id: string | null; tiktok_pixel_id: string | null };

const loaded = { meta: "", tiktok: "" };

function inject(code: string) {
  const s = document.createElement("script");
  s.text = code;
  document.head.appendChild(s);
}

/** Loads the pixels once and records a page view. Call on every storefront page mount. */
export function initPixels(ids: PixelIds) {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  const meta = ids.meta_pixel_id?.trim() ?? "";
  const tiktok = ids.tiktok_pixel_id?.trim() ?? "";

  if (meta && isValidMetaPixelId(meta)) {
    if (loaded.meta !== meta) {
      inject(
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');`,
      );
      loaded.meta = meta;
    }
    w.fbq?.("track", "PageView");
  }

  if (tiktok && isValidTiktokPixelId(tiktok)) {
    if (loaded.tiktok !== tiktok) {
      inject(
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok.toUpperCase()}');}(window,document,'ttq');`,
      );
      loaded.tiktok = tiktok;
    }
    w.ttq?.page();
  }
}

export type PixelProduct = { id: string; name: string; value: number; quantity?: number };

const TIKTOK_EVENT = { ViewContent: "ViewContent", InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment" } as const;

/** Sends a commerce event to every loaded pixel (no-op when none). */
export function trackPixel(event: keyof typeof TIKTOK_EVENT, p: PixelProduct) {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  if (loaded.meta) {
    w.fbq?.("track", event, {
      content_ids: [p.id],
      content_name: p.name,
      content_type: "product",
      value: p.value,
      currency: "DZD",
      ...(p.quantity ? { num_items: p.quantity } : {}),
    });
  }
  if (loaded.tiktok) {
    w.ttq?.track(TIKTOK_EVENT[event], {
      content_id: p.id,
      content_name: p.name,
      content_type: "product",
      value: p.value,
      currency: "DZD",
      quantity: p.quantity ?? 1,
    });
  }
}
