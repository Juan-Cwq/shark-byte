// Service worker: keeps the app shell, roadmaps, and last alerts available offline.
// Pages and /api/alerts are network-first (fresh when online, cached copy when offline);
// hashed /_next/static assets are cache-first because their URLs change on every deploy.

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const DATA = `data-${VERSION}`;
const SHELL = ["/", "/alerts", "/manifest.webmanifest", "/mdc-logo.png", "/mdc-campus-hero.jpg"];

// Fetches a page, caches it, and caches the JS/CSS/font files its HTML references.
async function precachePage(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return;
  const pages = await caches.open(PAGES);
  await pages.put(url, res.clone());
  if (!(res.headers.get("content-type") || "").includes("text/html")) return;
  const html = await res.text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const assetCache = await caches.open(ASSETS);
  await Promise.all(
    assets.map((a) =>
      assetCache.match(a).then((hit) => hit || fetch(a).then((r) => (r.ok ? assetCache.put(a, r) : undefined)))
    )
  );
}

async function precacheAll(urls) {
  await Promise.all(urls.map((u) => precachePage(u).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAll(SHELL).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = [PAGES, ASSETS, DATA];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page sends the roadmap URLs (from the pathways data) once it loads.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRECACHE" && Array.isArray(event.data.urls)) {
    event.waitUntil(precacheAll(event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/"))));
  }
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request, { ignoreVary: true })) || (fallbackUrl && (await caches.match(fallbackUrl)));
    if (!hit) throw err;
    // Tag cached responses so the page can say it's showing a saved copy.
    const headers = new Headers(hit.headers);
    headers.set("x-sw-cache", "1");
    return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(ASSETS)).put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  // Sign-in routes and the session check carry user data and must never be cached.
  if (url.pathname.startsWith("/auth/") || url.pathname === "/login") return;

  if (url.pathname === "/api/alerts") {
    event.respondWith(networkFirst(request, DATA));
  } else if (url.pathname.startsWith("/api/")) {
    return; // other API calls are live-only; the UI handles their failure
  } else if (url.pathname.startsWith("/_next/static/") || /\.(png|jpe?g|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES, "/"));
  } else {
    event.respondWith(networkFirst(request, PAGES));
  }
});
