const CACHE_NAME = 'spellbook-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=7',
  '/js/state.js?v=7',
  '/js/api.js?v=7',
  '/js/caster.js?v=7',
  '/js/slots.js?v=7',
  '/js/spells.js?v=7',
  '/js/details.js?v=7',
  '/js/app.js?v=7',
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


