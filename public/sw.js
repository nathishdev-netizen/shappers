// Minimal service worker: only makes the app installable and keeps the icon/
// manifest/login shell available offline. Member/payment/attendance data is
// never cached here — this is a live gym console, not a static site, and
// serving stale data from a cache would be actively wrong.

const CACHE = "shappers-shell-v1";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GETs for the static shell assets above — every
  // other request (pages, Supabase calls, everything else) passes straight
  // through to the network untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !SHELL_ASSETS.includes(url.pathname)) {
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
