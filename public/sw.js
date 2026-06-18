const CACHE_NAME = "polaria-ai-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
  "/maskable-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const isStaticAsset =
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.startsWith("/_next/static/") ||
      requestUrl.pathname.startsWith("/images/") ||
      requestUrl.pathname.endsWith(".svg") ||
      requestUrl.pathname.endsWith(".png") ||
      requestUrl.pathname.endsWith(".jpg") ||
      requestUrl.pathname.endsWith(".jpeg") ||
      requestUrl.pathname.endsWith(".webp") ||
      requestUrl.pathname.endsWith(".css") ||
      requestUrl.pathname.endsWith(".js"));

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
