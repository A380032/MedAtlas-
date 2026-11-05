/* Offline ishlash uchun service worker.
   Yangi kontent qo'shganda VERSION raqamini oshiring. */
const VERSION = "v0.9.13";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const SHELL_FILES = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
  "manifest.webmanifest",
  "data/precache.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Barcha kontent (matn, rasm) birinchi ochilishdayoq yuklab olinadi: keyin internetsiz ishlaydi.
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(SHELL_FILES);
    try {
      const list = await (await fetch("data/precache.json", { cache: "no-store" })).json();
      await c.addAll(list);
    } catch (_) { /* tarmoq uzilsa, qolganlari ko'rilganda keshlanadi */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Ma'lumot fayllari: avval internetdan (yangi kontent uchun), bo'lmasa xotiradan
  if (url.origin === location.origin && url.pathname.includes("/data/")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Qolgan hamma narsa (dizayn, kod, shriftlar): avval xotiradan, fonda yangilanadi
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined));
      return hit || net;
    })
  );
});
