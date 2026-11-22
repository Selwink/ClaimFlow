/* Garantieclaims — service worker.
   De pagina zelf: altijd eerst van het netwerk (zodat updates meteen binnenkomen),
   bij geen verbinding uit de cache. De database (Supabase) gaat nooit via de cache. */
const CACHE = "garantieclaims-v1";
const BESTANDEN = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")){
    e.respondWith(fetch(req).then(res => {
      const kopie = res.clone();
      caches.open(CACHE).then(c => c.put("index.html", kopie));
      return res;
    }).catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
