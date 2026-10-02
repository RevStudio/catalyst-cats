// Offline cache for the standalone web build (not used on portals).
// HTML/navigation: network-first (so updates ship immediately); static assets: cache-first.
const CACHE = 'catalyst-cats-1790941905885';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
const put = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('sw.js');
  if (isPage) {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
});
