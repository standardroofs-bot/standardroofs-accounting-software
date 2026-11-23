// ==============================================================================
// Standard Roofs Books (SR-Books) - Enterprise Lightweight PWA Service Worker
// Enables offline app shell, quick launch, and background asset caching
// ==============================================================================

const CACHE_NAME = "sr-books-pwa-v2.6";
const STATIC_ASSETS = [
  "/my-attendance",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Install Event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Non-fatal asset pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first for dynamic API & data, Cache-first for icons & static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET and chrome-extension schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Static Assets: Cache-first with network fallback
  if (url.pathname.startsWith("/icons/") || url.pathname.includes("manifest")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.status === 200) {
              const resClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Dynamic Navigation & API: Network-first with cached shell fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === "navigate") {
          return caches.match("/my-attendance");
        }
        return new Response("Offline - Standard Roofs Books", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      });
    })
  );
});
