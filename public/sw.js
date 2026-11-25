// ==============================================================================
// Standard Roofs Books (SR-Books) - Enterprise PWA Service Worker v3.2
// Pure native navigation with zero synthetic interception & zero chunk failures
// ==============================================================================

const CACHE_NAME = "sr-books-pwa-v3.2";
const STATIC_BRAND_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Install: Cache only brand assets (icons, manifest)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_BRAND_ASSETS).catch((err) => {
        console.warn("[SW] Asset pre-cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Immediately purge all older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Purging outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Never hijack HTML navigation or Next.js static chunks
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Cache-First for static brand icons and manifest ONLY
  if (url.pathname.startsWith("/icons/") || url.pathname.includes("manifest")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((res) => {
            if (res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
        );
      })
    );
    return;
  }

  // ALL OTHER REQUESTS (HTML pages, API calls, _next/static chunks):
  // Let browser fetch natively via standard HTTP network. Never intercept or serve synthetic screens!
});
