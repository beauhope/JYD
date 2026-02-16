const VERSION = "v1.0.0";
const STATIC_CACHE = "static-" + VERSION;
const DYNAMIC_CACHE = "dynamic-" + VERSION;

/* ================================
   FILES TO CACHE
================================ */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./css/style.css",

  "./js/app.js",
  "./js/auth.js",
  "./js/firebase.js",

  "./fonts/Cairo-Regular.ttf",
  "./fonts/Cairo-Bold.ttf",

  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* ================================
   INSTALL
================================ */
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

/* ================================
   ACTIVATE
================================ */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!key.includes(VERSION)) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

/* ================================
   FETCH STRATEGY
================================ */
self.addEventListener("fetch", event => {

  const request = event.request;

  /* 🔥 لا نكاش Firebase */
  if (request.url.includes("firebase") ||
      request.url.includes("googleapis")) {
    return;
  }

  /* =========================
     HTML → Network First
  ========================= */
  if (request.headers.get("accept")?.includes("text/html")) {

    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  /* =========================
     Fonts → Cache First
  ========================= */
  if (request.url.includes(".ttf") ||
      request.url.includes(".woff") ||
      request.url.includes(".woff2")) {

    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request);
      })
    );

    return;
  }

  /* =========================
     CSS / JS → Stale While Revalidate
  ========================= */
  if (request.url.includes(".css") ||
      request.url.includes(".js")) {

    event.respondWith(
      caches.match(request).then(cached => {

        const fetchPromise = fetch(request)
          .then(networkResponse => {
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, networkResponse.clone()));
            return networkResponse;
          });

        return cached || fetchPromise;
      })
    );

    return;
  }

  /* =========================
     Default
  ========================= */
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request);
    })
  );

});


/* ================================
   SKIP WAITING LISTENER
================================ */
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
