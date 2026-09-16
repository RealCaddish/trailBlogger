/* Trail Blogger service worker.
 * App shell and data: network first, cache fallback (so updates show up
 * right away but the site still opens offline). Photos: cache first.
 * Map tiles are never cached here (too many, and the tile servers ask us not to).
 */
const VERSION = 'tb-v2-1';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './logo/logo-96.png', './logo/logo-192.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.includes('/api/')) return;
  if (/tile\.openstreetmap|opentopomap|arcgisonline/.test(url.hostname)) return;

  const isPhoto = url.pathname.includes('/data/trail_images/') || url.pathname.includes('/data/images/');
  if (isPhoto) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname === 'unpkg.com')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
