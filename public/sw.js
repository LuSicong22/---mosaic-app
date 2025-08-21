const CACHE_NAME = "mosaic-editor-v3";
const BASE_URL = self.registration.scope.replace(/\/$/, "");

// Only cache truly static app shell files. Avoid caching index.html eagerly
// to prevent serving stale HTML that references old hashed assets.
const urlsToCache = [
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/favicon-196.png`,
  `${BASE_URL}/apple-icon-180.png`,
];

self.addEventListener("install", (event) => {
  // Skip waiting so the new SW takes over ASAP
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Network-first strategy for navigations (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Optionally keep a fresh copy of index.html for offline fallback
          const cloned = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(`${BASE_URL}/index.html`, cloned));
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(`${BASE_URL}/index.html`);
          return cached || Response.error();
        })
    );
    return;
  }

  // Cache-first for static assets (CSS/JS/images) with network fallback
  if (
    request.method === "GET" &&
    new URL(request.url).origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});
