// System notifications for incoming orders.
//
// Two layers:
//  1. `showOrderNotification` — paints a notification while the app is still
//     alive (foreground/background tab) using the Notification API.
//  2. `subscribeOrderPush` — registers the device for Web Push so the
//     `send-order-push` Edge Function can notify it with the app fully closed.

import { supabase } from "@/integrations/supabase/client";

export type OrderNotification = {
  title: string;
  body: string;
  icon?: string | undefined;
  tag?: string | undefined;
  url?: string | undefined;
};

const FALLBACK_ICON = "/icons/icon-192.png";

// Public VAPID key (safe to ship — every Web Push site exposes it). The build
// env wins when present; the constant keeps push working on hosts that do not
// inject VITE_* variables (e.g. the Lovable publisher ignoring `.env`).
const VAPID_PUBLIC_KEY =
  ((import.meta.env["VITE_VAPID_PUBLIC_KEY"] ?? "") as string) ||
  "BE2AL0rpyGobAXJlE5K4rNvNbGlbBsGtj5GEUUEow2q5GOGgxr2yaxsvRy4ve54mmEaWRitNitid5vbfMLZyJlU";

export function pushNotificationsConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Registers this device for background pushes (works with the app closed) and
 * stores the subscription for the Edge Function. Safe to call repeatedly.
 */
export async function subscribeOrderPush(storeId: string, language: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  if (!orderNotificationsSupported() || Notification.permission !== "granted") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };
      try {
        subscription = await registration.pushManager.subscribe(options);
      } catch {
        // A previous subscription may be bound to another VAPID key.
        const stale = await registration.pushManager.getSubscription();
        await stale?.unsubscribe().catch(() => undefined);
        subscription = await registration.pushManager.subscribe(options);
      }
    }

    const keys = subscription.toJSON().keys;
    const p256dh = keys?.["p256dh"];
    const auth = keys?.["auth"];
    if (!p256dh || !auth) return false;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return false;

    // The endpoint is unique by digest, so replace the row instead of upserting.
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    const { error } = await supabase.from("push_subscriptions").insert({
      store_id: storeId,
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      language: language === "en" || language === "fr" ? language : "ar",
      user_agent: navigator.userAgent.slice(0, 180),
    });
    return !error;
  } catch {
    return false;
  }
}

export function orderNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function orderNotificationPermission(): NotificationPermission | "unsupported" {
  if (!orderNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestOrderNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!orderNotificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notification; silently no-ops without permission or support. */
export async function showOrderNotification(order: OrderNotification): Promise<void> {
  if (orderNotificationPermission() !== "granted") return;

  const options: NotificationOptions = {
    body: order.body,
    icon: order.icon || FALLBACK_ICON,
    // Android renders `badge` as a monochrome silhouette, so keep the app mark.
    badge: FALLBACK_ICON,
    data: { url: order.url || "/dashboard/orders" },
    ...(order.tag ? { tag: order.tag } : {}),
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(order.title, options);
      return;
    }
    new Notification(order.title, options);
  } catch {
    // Some browsers reject notifications outside a service worker; the in-app
    // toast remains the fallback, so there is nothing else to do here.
  }
}
