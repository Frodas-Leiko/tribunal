/* Tribunal – minimaler Offline-Service-Worker (Runtime-Caching, kein Framework) */
const CACHE = 'tribunal-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // Navigationen: Netz zuerst, offline → gecachte Startseite
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  // Alles andere: Cache zuerst, sonst Netz + nachcachen
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
    )
  );
});
