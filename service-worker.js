// service-worker.js
const CACHE_VERSION = "mytodo-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// عدّل القائمة حسب ملفات مشروعك الفعلية
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase.js",
  "./js/auth.js",
  "./manifest.webmanifest"
];

// تثبيت: خزّن الملفات الأساسية
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// تفعيل: نظّف الكاش القديم
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// جلب:
// - ملفات الواجهة: cache-first
// - أي شيء خارجي (gstatic/firebase): runtime cache
// - fallback للأوفلاين إلى index.html لو طلب تنقّل
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // فقط GET
  if (req.method !== "GET") return;

  // تنقّل صفحات (Refresh / فتح رابط)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // نفس الأصل (beauhope.github.io) => cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // موارد خارجية (Firebase CDN / gstatic) => runtime cache
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // يخزّن حتى لو كانت Opaque
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // لو فشل وما عندنا كاش
        return cached || Response.error();
      }
    })
  );
});