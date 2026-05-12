const CACHE = 'wordlearn-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './modules/db.js',
  './modules/lists.js',
  './modules/words.js',
  './modules/session.js',
  './modules/stats.js',
  './modules/ui.js',
  './modules/store.js',
  './modules/scheduler.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  try {
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;
    e.respondWith(caches.match(e.request).then(cached => cached ?? fetch(e.request)));
  } catch {}
});
