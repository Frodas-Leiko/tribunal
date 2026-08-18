/* Tribunal – minimaler Offline-Service-Worker (Runtime-Caching, kein Framework) */

// B-33: Der Cache trägt die Kennung des Builds. Sie steht in der Adresse, mit der
// `main.tsx` diesen Worker registriert (`sw.js?v=…`), und ändert sich mit jedem
// Build – damit bekommt jeder Build seinen eigenen Cache, und `activate` kehrt
// jeden älteren aus. Ein fester Name täte das nie: Die Filterung unten fände nie
// einen abweichenden Namen, und der Bestand des Vorgängers bliebe für immer liegen.
// Ohne Kennung ist dieser Worker ein Überbleibsel: Vor B-33 wurde `sw.js` ohne
// Abfrage registriert, und in der Entwicklung registriert `main.tsx` gar nicht mehr.
// Ein Worker, der seinen Build nicht kennt, darf auch keinen Cache besitzen – er
// reicht jede Anfrage durch, bis die Abmeldung greift.
const BUILD = new URL(self.location.href).searchParams.get('v');
const CACHE = BUILD ? `tribunal-${BUILD}` : null;

// Aus dem Cache beantwortet wird ohne Rückfrage nur, was unveränderlich ist: Vite
// schreibt nach `assets/` ausschließlich inhaltsgehashte Namen – ändert sich der
// Inhalt, ändert sich die Adresse. Alles andere (index.html, Manifest, Icons)
// behält seine Adresse und muss aus dem Netz kommen, solange es eines gibt.
const UNVERAENDERLICH = /\/assets\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/**
 * Netz zuerst, Cache als Rückfalllinie: online immer der Stand des Servers,
 * offline die letzte gesehene Fassung (R7 – die App läuft ohne Netz vollständig).
 * `schluessel` weicht nur bei Navigationen von `req` ab: Sie werden alle unter
 * derselben Startseite abgelegt, damit die Rückfalllinie eine Adresse hat.
 */
async function netzZuerst(req, schluessel = req) {
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const copy = resp.clone();
      const cache = await caches.open(CACHE);
      await cache.put(schluessel, copy);
    }
    return resp;
  } catch (fehler) {
    const cached = await caches.match(schluessel);
    if (cached) return cached;
    // Weder Netz noch Cache: Der Fehler wird durchgereicht. Eine erfundene
    // Antwort wäre schlimmer als eine sichtbar fehlgeschlagene Anfrage.
    throw fehler;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Überbleibsel ohne eigenen Cache: durchreichen, nichts ablegen.
  if (CACHE === null) return;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  if (req.mode === 'navigate') {
    event.respondWith(netzZuerst(req, './index.html'));
    return;
  }

  if (UNVERAENDERLICH.test(new URL(req.url).pathname)) {
    event.respondWith(caches.match(req).then((cached) => cached || netzZuerst(req)));
    return;
  }

  event.respondWith(netzZuerst(req));
});
