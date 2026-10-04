// Offline cache for the standalone web build (not used on portals).
// HTML/navigation and unversioned files: network-first (so updates ship immediately); versioned assets: cache-first.
const CACHE = 'catalyst-cats-1791116304953';
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
/** network fetch that revalidates instead of trusting the browser HTTP cache (GitHub Pages sends max-age=600) */
const fresh = (req) => fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // live files (update check, remote config) always come straight from the network and are never cached
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/remote-config.json')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('sw.js');
  if (isPage) {
    e.respondWith(fresh(req).then((res) => put(req, res)).catch(() => caches.match(req)));
    return;
  }
  // immutable URLs (content-hash query ?v=..., Vite-hashed bundles): cache-first; everything else (fonts, audio, ...)
  // keeps a stable name across releases, so it is network-first with the cache only as the offline fallback
  const immutable = url.searchParams.has('v') || /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(js|css)$/.test(url.pathname);
  if (!immutable) {
    e.respondWith(fresh(req).then((res) => put(req, res)).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
});
