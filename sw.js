/* Offline ishlash uchun service worker.
   Yangi kontent qo'shganda VERSION raqamini oshiring. */
const VERSION = "v1.2.2";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const SHELL_FILES = [
  "./",
  "index.html",
  "css/app.css",
  "js/i18n.js",
  "js/lang-en.js",
  "js/app.js",
  "js/tests.js",
  "js/tm-tools.js",
  "js/account.js",
  "js/rooms.js",
  "js/battle.js",
  "js/bt-en.js",
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
  "fonts/onest-cyrillic-ext-wght-normal.woff2",
  "privacy.html",
  "terms.html"
];

// Cloudflare Pages "x.html" so'rovini "/x" ga yo'naltiradi (308). Yo'naltirilgan javobni
// keshdan sahifa sifatida berib bo'lmaydi (brauzer xato beradi), shuning uchun toza nusxa saqlanadi.
const clean = async (res) => (res && res.redirected
  ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers })
  : res);
// Yo'naltirilgan sahifa ikkala manzil ostida saqlanadi ("/sim/x.html" va "/sim/x"): brauzer 308 ni
// o'z xotirasidan olib internetsiz ham "/sim/x" ga o'tishi mumkin.
const addAllClean = async (c, urls) => {
  const reqs = urls.map((u) => new Request(u));
  const ress = await Promise.all(reqs.map((r) => fetch(r).then(async (res) => {
    if (!res.ok) throw new TypeError("precache " + res.status + " " + r.url);
    return { to: res.redirected ? res.url : null, res: await clean(res) };
  })));
  await Promise.all(reqs.map(async (r, i) => {
    const { to, res } = ress[i];
    if (to) await c.put(new Request(to), res.clone());
    await c.put(r, res);
  }));
};

// Barcha kontent (matn, rasm) birinchi ochilishdayoq yuklab olinadi: keyin internetsiz ishlaydi.
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await addAllClean(c, SHELL_FILES);
    try {
      const list = await (await fetch("data/precache.json", { cache: "no-store" })).json();
      await addAllClean(c, list);
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
        if (res && res.status === 200 && !req.headers.has("range")) { const copy = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {}); }   // xato (404, 500) va bo'lak (206, PDF) javoblar keshga yozilmaydi
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
        if (res && res.ok) { const copy = res.clone(); clean(copy).then((x) => caches.open(RUNTIME).then((c) => c.put(req, x))).catch(() => {}); }
        return res;
      }).catch(async () => clean((await caches.match(req)) || (req.mode === "navigate" ? await caches.match("index.html") : undefined)))
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
