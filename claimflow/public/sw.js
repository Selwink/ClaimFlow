/* ClaimFlow service worker: shows phone notifications. It does not cache pages,
   so every visit loads the current version. On activation it also clears caches left by the old register app. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("push", (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = { tekst: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.titel || "ClaimFlow", {
    body: m.tekst || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: m.tag || undefined,
    renotify: !!m.tag,
    data: { url: m.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const vensters = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of vensters) {
      if (new URL(v.url).origin === self.location.origin && "focus" in v) {
        await v.navigate(url).catch(() => undefined);
        return v.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
