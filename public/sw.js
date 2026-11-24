// ==============================================================================
// Standard Roofs Books (SR-Books) - Enterprise Self-Healing PWA Service Worker v3.0
// Guarantees zero stale chunk errors, instant updates, and offline resilience
// ==============================================================================

const CACHE_NAME = "sr-books-pwa-v3.0";
const IMMUTABLE_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Offline Standalone Fallback HTML (No external chunk dependencies)
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Standard Roofs Books — Reconnecting</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(37,99,235,0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 26px; }
    h2 { font-size: 18px; font-weight: 800; margin: 0 0 8px; color: #fff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
    .btn { background: #2563eb; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
    .btn:hover { background: #1d4ed8; }
    .status { margin-top: 16px; font-size: 11px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚡</div>
    <h2>Reconnecting to SR-Books...</h2>
    <p>The network connection is momentarily reconnecting. The app will auto-resume as soon as the server responds.</p>
    <button class="btn" onclick="window.location.reload()">Retry Now</button>
    <div class="status" id="stat">Checking connection every 3s...</div>
  </div>
  <script>
    var poll = setInterval(function() {
      fetch('/api/health', { cache: 'no-store' }).then(function(r) {
        if (r.ok) {
          clearInterval(poll);
          window.location.reload();
        }
      }).catch(function() {});
    }, 3000);
  </script>
</body>
</html>`;

// Install: Cache only immutable static brand assets (NO HTML routes)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(IMMUTABLE_ASSETS).catch((err) => {
        console.warn("[SW] Non-fatal asset pre-cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Immediately purge all older caches (v2.6, v1, etc.)
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

// Fetch Strategy:
// 1. Icons / manifest -> Cache-First
// 2. Chunks (/_next/static/) -> Network-First (Never cache 404s, never mask errors)
// 3. HTML Navigation -> Network-First, offline standalone page ONLY if truly offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-HTTP(S) & non-GET
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 1. Static Icons & Manifest
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

  // 2. Next.js Static Chunks: Always pass directly to network, no synthetic fallback
  if (url.pathname.startsWith("/_next/")) {
    return; // Let browser fetch directly with native HTTP caching
  }

  // 3. Navigation (HTML Pages): Network-first with standalone self-reconnecting fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(OFFLINE_FALLBACK_HTML, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
    return;
  }
});
