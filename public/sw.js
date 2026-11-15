// Minimal pass-through service worker.
//
// It caches nothing on purpose: its only job is to satisfy the Android install
// criteria so Chrome can fire `beforeinstallprompt`, while every request keeps
// going to the network and the app always receives the latest deploy.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No respondWith: the browser performs the request normally.
});

// Server-sent web pushes (used once a push backend is wired up).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }
  const url = payload.url || "/dashboard/orders";
  event.waitUntil(
    self.registration.showNotification(payload.title || "oranix", {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

// Click on a system notification: focus the dashboard tab or open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard/orders";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        const path = new URL(client.url).pathname;
        if (path.startsWith("/dashboard") && "focus" in client) {
          if ("navigate" in client) await client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
