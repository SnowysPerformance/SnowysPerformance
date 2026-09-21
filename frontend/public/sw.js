// Minimal service worker — Chrome/Android require an active one before they
// will treat this site as an installable app (the thing that lets people
// add it to their home screen with one tap). It intentionally does no
// caching of its own: this app's data changes constantly, so a stale
// cached page or API response would be worse than no offline support at
// all. Every request just falls through to normal network handling.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op on purpose — let the browser handle every request normally.
});
