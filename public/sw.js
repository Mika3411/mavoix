const CACHE_NAME = "ma-voix-v13";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/picturetitle.png",
];

function shouldBypassCache(request, requestUrl) {
  const pathname = requestUrl.pathname;
  const acceptHeader = request.headers.get("accept") || "";

  return (
    request.cache === "no-store" ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/ma-voix-update.json" ||
    pathname.toLowerCase().endsWith(".apk") ||
    acceptHeader.includes("text/event-stream")
  );
}

function shouldStoreResponse(response) {
  if (!response || !response.ok) return false;

  const cacheControl = response.headers.get("cache-control") || "";
  return !cacheControl.toLowerCase().includes("no-store");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
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

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassCache(request, requestUrl)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (shouldStoreResponse(response)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/", responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match("/") || caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (shouldStoreResponse(networkResponse)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return networkResponse;
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const appClient = clientList.find((client) =>
          client.url.startsWith(self.location.origin)
        );

        if (appClient) {
          if ("navigate" in appClient) {
            appClient.navigate(targetUrl);
          }
          return appClient.focus();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
