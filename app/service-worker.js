/* service-worker.js — Carnet EPS
   BIBLE règle 5 : versionné, network-first sur le document/manifest (jamais de
   version morte), cache-first sur les assets, purge des vieux caches à l'activation.
   ⚠ Incrémenter VERSION à chaque déploiement (synchroniser avec VERSION_APP de main.js).
   Non enregistré sur localhost (voir main.js, décision D008). */

const VERSION = '0.11.0';
const CACHE = `carnet-eps-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './css/responsive.css',
  './js/main.js',
  './js/state.js',
  './js/ui.js',
  './js/io.js',
  './js/metier.js',
  './js/media.js',
  './js/modules/sauvegarde.js',
  './js/modules/reglages.js',
  './js/modules/eleves.js',
  './js/modules/edt.js',
  './js/modules/sequences.js',
  './js/modules/appel.js',
  './js/modules/inaptitudes.js',
  './js/modules/notes.js',
  './js/modules/accueil.js',
  './js/modules/documents.js',
  './data/exemple_eleves_pronote.csv',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const estDocument = req.mode === 'navigate' || url.pathname.endsWith('manifest.webmanifest');

  if (estDocument) {
    // network-first : on sert le réseau, le cache n'est qu'un filet hors ligne.
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
          return rep;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // cache-first : les assets sont invalidés par changement de VERSION.
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((rep) => {
            const copie = rep.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
            return rep;
          })
      )
    );
  }
});
