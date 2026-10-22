// Roshana service worker.
//  - /_next/static (hashed, immutable): cache-first
//  - page navigations: network-first, cached copy only when offline
//  - other same-origin GETs (icons, manifest): stale-while-revalidate
//  - cross-origin requests (the API) and non-GETs are never touched or cached
// The cache name carries the build id (?v=) so a deploy replaces the old shell.
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `roshana-${VERSION}`;
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Sent on sign-out so cached pages never outlive the session on a shared device.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

const cacheable = (res) => res.ok && res.type === "basic" && !res.redirected;
const put = (request, res) => cacheable(res) && caches.open(CACHE).then((c) => c.put(request, res.clone()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => (put(request, res), res))),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => (put(request, res), res))
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request).then((res) => (put(request, res), res)).catch(() => hit);
      return hit || network;
    }),
  );
});
