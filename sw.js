const CACHE_NAME = 'spellbook-v8';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=8',
  './js/state.js?v=8',
  './js/api.js?v=8',
  './js/caster.js?v=8',
  './js/slots.js?v=8',
  './js/spells.js?v=8',
  './js/details.js?v=8',
  './js/app.js?v=8',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
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
