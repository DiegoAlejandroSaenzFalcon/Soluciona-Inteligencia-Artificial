self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname === '/api/estado') return;
  if (e.request.method !== 'GET') return;
  if (url.pathname === '/' || url.pathname === '/cocina' || url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clon = r.clone();
        caches.open('panel-v1').then(c => c.put(e.request, clon));
        return r;
      }).catch(() => caches.match(e.request))
    );
  }
});