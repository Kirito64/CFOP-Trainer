// Makes the app open with no internet. The build fills in VERSION and FILES (every file in
// dist/client, see offlineApp() in vite.config.ts) and serves this as /sw.js. Data already
// lives in IndexedDB and sync catches up when the connection comes back, so only the app's
// own files need caching here.

const VERSION = __VERSION__;
const FILES = __FILES__;
const PREFIX = "cfop-app-";
const CACHE = PREFIX + VERSION;
const FONTS = "cfop-fonts";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Keep the previous version too: a tab still running it may lazy-load one of its chunks,
      // and those are gone from the server after a deploy. Cache keys come back oldest first.
      const versions = (await caches.keys()).filter((k) => k.startsWith(PREFIX));
      await Promise.all(versions.slice(0, -2).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    // Every page is the same single-page app, so any navigation gets the cached page at /.
    // A new deploy installs in the background and shows up the next time the app opens.
    const key = request.mode === "navigate" ? "/" : request;
    // The server sends Vary: Origin, and scripts are requested with an Origin header the cached
    // copies don't have. Built files never change under the same name, so Vary doesn't matter.
    event.respondWith(caches.match(key, { ignoreVary: true }).then((hit) => hit ?? fetch(request)));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok || res.type === "opaque") void cache.put(request, res.clone());
        return res;
      }),
    );
  }
});
