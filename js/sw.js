const CACHE_NAME = "mytodo-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./css/style.css",

  "./js/app.js",
  "./js/auth.js",
  "./js/firebase.js",

  "./fonts/Cairo-Regular.ttf",
  "./fonts/Cairo-Bold.ttf"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.error("Cache failed:", err))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
