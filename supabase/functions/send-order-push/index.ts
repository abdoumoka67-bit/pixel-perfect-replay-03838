// Supabase Edge Function: send-order-push
//
// Delivers a Web Push notification to every subscribed dashboard device of a
// store, so a new order still reaches the phone when the PWA is fully closed.
//
// Deploy with:  supabase functions deploy send-order-push --no-verify-jwt
// Required secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET
// Optional:
//   APP_URL (used for the fallback notification icon)
//
// Call it from a Database Webhook on `orders` (event: INSERT) and send the same
// PUSH_WEBHOOK_SECRET in the `x-webhook-secret` header.

import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@oranix.app";
const HOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";

type Language = "ar" | "en" | "fr";

type OrderRecord = {
  id?: string;
  store_id?: string;
  order_number?: number | string;
  customer_name?: string;
  product_name?: string;
  wilaya_name?: string;
  total?: number | string;
};

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  language: Language;
};

const TEXT = {
  ar: {
    title: (n?: number | string) => (n ? `طلب جديد #${n}` : "طلب جديد"),
    money: (v: number) => `${v.toLocaleString("fr-DZ")} دج`,
    customer: "زبون",
  },
  en: {
    title: (n?: number | string) => (n ? `New order #${n}` : "New order"),
    money: (v: number) => `DZ ${v.toLocaleString("fr-DZ")}`,
    customer: "Customer",
  },
  fr: {
    title: (n?: number | string) => (n ? `Nouvelle commande #${n}` : "Nouvelle commande"),
    money: (v: number) => `DZ ${v.toLocaleString("fr-DZ")}`,
    customer: "Client",
  },
} as const;

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Turns a stored bucket path into a short-lived URL usable as notification icon. */
async function signedLogo(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/product-images/${encoded}`, {
      method: "POST",
      headers: restHeaders,
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!res.ok) return undefined;
    const data = await res.json() as { signedURL?: string; signedUrl?: string };
    const signed = data.signedURL ?? data.signedUrl;
    if (!signed) return undefined;
    return `${SUPABASE_URL}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!HOOK_SECRET || req.headers.get("x-webhook-secret") !== HOOK_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "missing_vapid_keys" }, 500);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "missing_supabase_env" }, 500);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Database Webhooks send { type, table, record }; direct calls may send the
  // order itself or just { order_id }.
  let record = (body.record ?? body.order ?? body) as OrderRecord;
  if (body.order_id && !record?.store_id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=id,store_id,order_number,customer_name,product_name,wilaya_name,total&id=eq.${body.order_id}`,
      { headers: restHeaders },
    );
    const rows = (await res.json()) as OrderRecord[];
    record = rows[0] ?? {};
  }

  const storeId = record?.store_id;
  if (!storeId) return json({ error: "missing_store_id" }, 400);

  const [storeRes, subsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/stores?select=name,logo_url&id=eq.${storeId}`, { headers: restHeaders }),
    fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,language&store_id=eq.${storeId}`,
      { headers: restHeaders },
    ),
  ]);

  if (!subsRes.ok) return json({ error: "subscriptions_read_failed", status: subsRes.status }, 500);

  const store = ((await storeRes.json().catch(() => [])) as { name?: string; logo_url?: string | null }[])[0];
  const subscriptions = (await subsRes.json()) as Subscription[];
  if (!subscriptions.length) return json({ sent: 0, failed: 0, removed: 0 });

  const icon = (await signedLogo(store?.logo_url)) ?? (APP_URL ? `${APP_URL}/icons/icon-192.png` : undefined);
  const amount = Number(record.total ?? 0);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const lang: Language = sub.language === "en" || sub.language === "fr" ? sub.language : "ar";
      const copy = TEXT[lang];
      const name = record.customer_name?.trim() || copy.customer;
      const parts = [name, record.wilaya_name, copy.money(amount)].filter(Boolean);

      const payload = JSON.stringify({
        title: `${copy.title(record.order_number)}${store?.name ? ` — ${store.name}` : ""}`,
        body: parts.join(" · "),
        icon,
        url: "/dashboard/orders",
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 600, urgency: "high" },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
        else failed += 1;
      }
    }),
  );

  if (stale.length) {
    await Promise.all(
      stale.map((endpoint) =>
        fetch(
          `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
          { method: "DELETE", headers: restHeaders },
        ).catch(() => undefined),
      ),
    );
  }

  return json({ sent, failed, removed: stale.length });
});
