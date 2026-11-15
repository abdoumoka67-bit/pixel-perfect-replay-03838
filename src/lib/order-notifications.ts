// System notifications for incoming orders.
//
// The dashboard already plays a chime and shows an in-app toast; this layer is
// only for phones where the installed app sits in the background and the toast
// would be invisible. It uses the Notification API directly (no push backend),
// so it works while the app/tab is still alive. Real notifications for a fully
// closed app need Web Push + VAPID keys on a server.

export type OrderNotification = {
  title: string;
  body: string;
  icon?: string | undefined;
  tag?: string | undefined;
  url?: string | undefined;
};

const FALLBACK_ICON = "/icons/icon-192.png";

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
