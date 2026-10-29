/**
 * Tribeca Jets Command Center — Service Worker (#35 Offline / PWA)
 *
 * Security & data integrity rules:
 * 1. NEVER cache or intercept `/api/*` requests. Charter desk records,
 *    financial ledgers, and private documents are permission-scoped and
 *    must never persist in browser CacheStorage across sessions.
 * 2. Pre-cache core brand icons and the `/offline` editorial fallback route.
 * 3. Cache immutable `/_next/static/*` and `/dashboard/icons|img/*` assets
 *    using Stale-While-Revalidate so the UI shell loads briskly.
 * 4. For page navigations (`request.mode === "navigate"`), use Network-First
 *    and fall back to `/offline` when the network is unreachable.
 */

const CACHE_VERSION = "tj-pwa-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/dashboard/img/logo.svg",
  "/dashboard/img/logo_black.svg",
  "/dashboard/img/logo_icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {
        // Ignore individual precache failures during dev builds
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((oldKey) => caches.delete(oldKey)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_PWA_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

function isStaticShellAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/dashboard/icons/") ||
    pathname.startsWith("/dashboard/img/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls or auth endpoints
  if (url.pathname.startsWith("/api/")) return;

  // Document navigation: Network-First -> /offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cachedOffline = await cache.match(OFFLINE_URL);
        if (cachedOffline) return cachedOffline;
        return new Response(
          "<!doctype html><html><head><meta charset='utf-8'><title>Offline — Command Center</title></head><body style='font-family:sans-serif;background:#FAF9F6;color:#18181B;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'><div style='text-align:center;max-width:420px;padding:24px;'><p style='font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#78716C;margin:0 0 8px;'>Connection Lost</p><h1 style='font-size:20px;font-weight:600;margin:0 0 12px;'>You are currently offline</h1><p style='font-size:13px;color:#57534E;line-height:1.6;margin:0 0 20px;'>Live charter desk data requires an active connection. Reconnect and reload to continue.</p><button onclick='window.location.reload()' style='background:#18181B;color:#fff;border:none;padding:10px 18px;border-radius:4px;font-size:12px;cursor:pointer;'>Retry Connection</button></div></body></html>",
          {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }),
    );
    return;
  }

  // Static UI shell assets: Stale-While-Revalidate
  if (isStaticShellAsset(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      }),
    );
  }
});

