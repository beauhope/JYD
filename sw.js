/* ================================
   MyTodo PWA Service Worker (PROD)
   - GitHub Pages safe
   - Offline friendly
   - Update flow ready
================================ */

const VERSION = "mytodo-v4";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/auth.js",
  "./js/firebase.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/mysvglogo.png",

  // إذا عندك خط Cairo محلي (مثلاً woff2 داخل fonts)
  // عدّل الاسم حسب الملف الحقيقي عندك:
  "./fonts/Cairo-Regular.woff2",
  "./fonts/Cairo-Bold.woff2"
];

/* -------------------------------
   Install: Pre-cache (safe)
-------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);

    // addAll أحياناً يفشل إذا ملف واحد 404
    // لذا نخليها safe: نضيف كل ملف لوحده
    await Promise.all(
      ASSETS.map(async (url) => {
        try {
          const req = new Request(url, { cache: "reload" });
          const res = await fetch(req);
          if (res.ok) await cache.put(req, res);
        } catch (e) {
          // نتجاهل أي ملف فشل (أفضل من كسر التثبيت كامل)
        }
      })
    );

    self.skipWaiting();
  })());
});

/* -------------------------------
   Activate: clean old caches
-------------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith(VERSION))
        .map((k) => caches.delete(k))
    );

    await self.clients.claim();
  })());
});

/* -------------------------------
   Skip Waiting trigger from UI
-------------------------------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* -------------------------------
   Fetch strategies
-------------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // نفس الأصل فقط
  const sameOrigin = url.origin === self.location.origin;

  // Navigation (HTML صفحات)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Files: css/js => stale-while-revalidate
  if (sameOrigin && (url.pathname.endsWith(".css") || url.pathname.endsWith(".js"))) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Fonts / Icons / Images => cache-first
  if (
    sameOrigin &&
    (url.pathname.includes("/fonts/") ||
      url.pathname.includes("/icons/") ||
      url.pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?|ttf)$/))
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default: try cache then network
  event.respondWith(cacheFirst(req));
});

/* -------------------------------
   Strategies
-------------------------------- */
async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || caches.match("./index.html");
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const cache = await caches.open(RUNTIME_CACHE);
  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("", { status: 504 });
}
