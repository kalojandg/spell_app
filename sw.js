const CACHE_NAME = 'spellbook-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/state.js',
  '/js/api.js',
  '/js/caster.js',
  '/js/slots.js',
  '/js/spells.js',
  '/js/details.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // За API заявки - network first
  if (event.request.url.includes('dnd5eapi.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // За static assets - cache first
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});


