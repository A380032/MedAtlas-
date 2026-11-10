/* Offline ishlash uchun service worker.
   Yangi kontent qo'shganda VERSION raqamini oshiring. */
const VERSION = "v1.0.0";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const SHELL_FILES = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
  "js/tests.js",
  "js/account.js",
  "js/rooms.js",
  "js/admin.js",
  "vendor/supabase.min.js",
  "manifest.webmanifest",
  "data/precache.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "fonts/onest-latin-wght-normal.woff2",
  "fonts/onest-latin-ext-wght-normal.woff2",
  "fonts/onest-cyrillic-wght-normal.woff2",
  "fonts/onest-cyrillic-ext-wght-normal.woff2"
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
  if (url.origin !== location.origin) return;   // Supabase, Telegram va boshqa tashqi so'rovlar keshlanmaydi

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

  // Sahifa, kod va dizayn: avval internetdan (eski-yangi fayllar aralashmasligi uchun), bo'lmasa xotiradan
  const isCode = req.mode === "navigate" || /\.(js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (isCode) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, copy)); }
        return res;
      }).catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("index.html") : undefined))
    );
    return;
  }

  // Rasmlar va shriftlar: avval xotiradan, fonda yangilanadi
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
