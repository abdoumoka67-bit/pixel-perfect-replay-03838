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
