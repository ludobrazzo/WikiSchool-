const CACHE_NAME = "wikischool-v1";
const assetsToCache = [
  "/",
  "/index.html",
  "/archivio.html",
  "/styles.css",
  "/script.js",
  "/script_archivio.js",
  "/manifest.json"
];

// Installazione: salviamo i file principali nella cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching file principali...");
      return cache.addAll(assetsToCache);
    })
  );
});

// Attivazione: eliminiamo eventuali cache vecchie se aggiorniamo l'app
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: quando l'app chiede un file, proviamo a darglielo dalla cache, altrimenti lo scarichiamo da internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
