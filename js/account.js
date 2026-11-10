/* Akkaunt (Google / Telegram) va ma'lumotlarni bulutga saqlash — Supabase.
   Kirmagan foydalanuvchi uchun ilova avvalgidek ishlaydi; bu modul faqat kirilganda ishga tushadi. */
(() => {
  "use strict";
  const URL_ = "https://tcyskjcdxgppdqnlkucc.supabase.co";
  const KEY = "sb_publishable_CLa-jwgcIO3M2T31VO9UpQ_N1a0Rcds";   // ochiq (publishable) kalit — maxfiy emas
  const BOT = "alvoramed_bot";
  const EXC = /^tq:(tm:sess|tm:last|theme)$/;
  let A = null, sb = null, loading = null, user = null, timer = null, queue = Promise.resolve();
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } }
  };
  const run = (f) => (queue = queue.then(f).catch((e) => console.warn("sync:", e?.message || e)));

  /* ---------- Kutubxona va mijoz ---------- */
  const lib = () => (loading ||= new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement("script");
    s.src = "vendor/supabase.min.js";
    s.onload = res;
    s.onerror = () => { loading = null; rej(new Error("lib")); };
    document.head.appendChild(s);
  }));
  async function client() {
    await lib();
    if (!sb) {
      sb = window.supabase.createClient(URL_, KEY, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      sb.auth.onAuthStateChange((ev, sess) => {
        const was = user?.id;
        user = sess?.user || null;
        setTimeout(() => {
          paintBtn();
          if (user && user.id !== was) { pull(); loadPhoto(); }
          if (!user && was) { setPhoto(""); ls.del("tqsync:last"); ls.del("tqsync:dirty"); ls.del("tqsync:at"); }
          if ((location.hash || "").startsWith("#/profil")) A?.refresh?.();
        }, 0);
      });
      const { data } = await sb.auth.getSession();
      user = data.session?.user || null;
    }
    return sb;
  }
  const hasStoredSession = () => { try { for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true; } catch { /* */ } return false; };

  /* ---------- Yuqori paneldagi tugma ---------- */
  const photo = () => { try { return localStorage.getItem("tqacc:photo") || ""; } catch { return ""; } };
  const setPhoto = (v) => { try { v ? localStorage.setItem("tqacc:photo", v) : localStorage.removeItem("tqacc:photo"); } catch { /* */ } };
  const avatarSrc = () => photo() || user?.user_metadata?.avatar_url || "";
  async function loadPhoto() {
    if (!user || !sb || !navigator.onLine) return;
    try {
      const r = await sb.from("profiles").select("photo").eq("id", user.id).maybeSingle();
      if (!r.error && r.data) { const v = r.data.photo || ""; if (v !== photo()) { setPhoto(v); paintBtn(); } }
    } catch { /* oflayn */ }
  }
  function paintBtn() {
    const b = document.getElementById("accBtn");
    if (!b) return;
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    if (user) {
      const src = avatarSrc();
      b.innerHTML = `<span class="acc-dot">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : esc((name || "?").trim()[0] || "?").toUpperCase()}</span>`;
      b.setAttribute("aria-label", "Profil: " + name);
    } else { b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>`; b.setAttribute("aria-label", "Kirish"); }
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Sinxronlash ---------- */
  function localKeys() {
    const out = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("tq:") && !EXC.test(k)) out[k] = localStorage.getItem(k); } } catch { /* */ }
    return out;
  }
  const parse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  const lastOf = (e) => (Array.isArray(e) ? e[e.length - 1] : 0);
  function mergeAny(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (Array.isArray(a) && Array.isArray(b)) {
      const out = [], seen = new Set();
      for (const x of [...a, ...b]) {
        const id = x && typeof x === "object" && x.id != null ? "id:" + x.id : JSON.stringify(x);
        if (!seen.has(id)) { seen.add(id); out.push(x); }
      }
      return out;
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const out = { ...b };
      for (const k of Object.keys(a)) out[k] = k in b ? mergeAny(a[k], b[k]) : a[k];
      return out;
    }
    return a;
  }
  function mergeKey(k, a, b) {
    const n = k.slice(3);
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (n === "tm:hist" && Array.isArray(a) && Array.isArray(b)) {
      const m = new Map();
      [...b, ...a].forEach((h) => m.set(h.at + ":" + h.m + ":" + h.n, h));
      return [...m.values()].sort((x, y) => x.at - y.at).slice(-400);
    }
    if (n.startsWith("tm:st:") || n.startsWith("tm:know:")) {
      const o = { ...b };
      for (const q of Object.keys(a)) if (!o[q] || lastOf(a[q]) >= lastOf(o[q])) o[q] = a[q];
      return o;
    }
    if (n === "res") {
      const o = { ...b };
      for (const q of Object.keys(a)) if (!o[q] || String(a[q].at || "") >= String(o[q].at || "")) o[q] = a[q];
      return o;
    }
    if (n === "plan" && Array.isArray(a) && Array.isArray(b)) {
      const m = new Map(b.map((x) => [x.id, x]));
      for (const x of a) { const y = m.get(x.id); m.set(x.id, y && y.done && !x.done ? y : x); }
      return [...m.values()];
    }
    if ((n.startsWith("best:") || n.startsWith("bookpos:")) && typeof a === "number" && typeof b === "number") return Math.max(a, b);
    return mergeAny(a, b);
  }
  function writeKeys(obj, removeMissing) {
    if (removeMissing) { for (const k of Object.keys(localKeys())) if (!(k in obj)) ls.del(k); }
    for (const [k, v] of Object.entries(obj)) ls.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const setSynced = (t) => { ls.set("tqsync:last", t); ls.set("tqsync:dirty", "0"); ls.set("tqsync:at", String(Date.now())); };

  async function pushInner(depth = 0) {
    if (!user || !sb || !navigator.onLine) return;
    const data = { v: 1, keys: localKeys() };
    const last = ls.get("tqsync:last");
    let res;
    if (last) {
      res = await sb.from("user_sync").update({ data, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("updated_at", last).select("updated_at");
      if (res.error) throw res.error;
      if (!res.data.length) { if (depth < 2) return pullInner(depth + 1); return; }
    } else {
      res = await sb.from("user_sync").insert({ user_id: user.id, data }).select("updated_at");
      if (res.error) { if (res.error.code === "23505" && depth < 2) return pullInner(depth + 1); throw res.error; }
    }
    setSynced(res.data[0].updated_at);
    paintStatus();
  }
  async function pullInner(depth = 0) {
    if (!user || !sb || !navigator.onLine) return;
    const r = await sb.from("user_sync").select("data,updated_at").eq("user_id", user.id).maybeSingle();
    if (r.error) throw r.error;
    const last = ls.get("tqsync:last"), dirty = ls.get("tqsync:dirty") === "1";
    if (!r.data) { ls.del("tqsync:last"); return pushInner(depth); }
    const cloud = r.data.data?.keys || {};
    if (r.data.updated_at === last) { if (dirty) return pushInner(depth); paintStatus(); return; }
    if (last && !dirty) {            // boshqa qurilmada yangilangan, bu yerda o'zgarish yo'q
      writeKeys(cloud, true); setSynced(r.data.updated_at); paintStatus(); A?.refresh?.(); return;
    }
    // ikkala tomonda ham o'zgarish bor (yoki birinchi kirish): birlashtirish
    const loc = localKeys(), merged = {};
    for (const k of new Set([...Object.keys(loc), ...Object.keys(cloud)])) {
      const m = mergeKey(k, loc[k] === undefined ? undefined : parse(loc[k]), cloud[k] === undefined ? undefined : parse(cloud[k]));
      if (m !== undefined) merged[k] = m;
    }
    writeKeys(merged, false);
    ls.set("tqsync:last", r.data.updated_at); ls.set("tqsync:dirty", "1");
    await pushInner(depth);
    A?.toast?.("Ma’lumotlaringiz bulutga saqlandi");
    A?.refresh?.();
  }
  const pull = () => run(() => pullInner());
  const push = () => run(() => pushInner());
  function touch(key) {
    if (!user) return;
    if (EXC.test("tq:" + key)) return;
    ls.set("tqsync:dirty", "1");
    clearTimeout(timer);
    timer = setTimeout(push, 5000);
  }
  function paintStatus() {
    const el = document.getElementById("accSync");
    if (!el) return;
    const at = Number(ls.get("tqsync:at") || 0);
    el.textContent = at ? "Oxirgi saqlash: " + new Date(at).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "Hali saqlanmagan";
  }

  /* ---------- Kirish usullari ---------- */
  async function googleLogin() {
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + "#/profil" } });
      if (error) throw error;
    } catch (e) { A.toast("Google bilan kirib bo‘lmadi. Internetni tekshiring"); console.warn(e); }
  }
  async function onTelegram(u) {
    try {
      A.toast("Telegram tekshirilmoqda…");
      const c = await client();
      const r = await fetch(URL_ + "/functions/v1/telegram-auth", { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify(u) });
      const j = await r.json();
      if (!r.ok || !j.token_hash) throw new Error(j.error || "xato");
      const { error } = await c.auth.verifyOtp({ token_hash: j.token_hash, type: "magiclink" });
      if (error) throw error;
    } catch (e) { A.toast("Telegram orqali kirib bo‘lmadi: " + (e.message || "xato")); console.warn(e); }
  }
  function telegramWidget(box) {
    window.onTelegramAuth = onTelegram;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "14");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    s.setAttribute("data-request-access", "write");
    box.appendChild(s);
  }

  /* ---------- Profil sahifasi ---------- */
  function privacy() {
    A.sheet(`<h3>Maxfiylik</h3>
      <p class="small" style="margin:0 0 8px">Hisobga kirganingizda quyidagilar saqlanadi: ismingiz, profil rasmingiz (Google yoki Telegramdan), Telegram username va ilovadagi natijalaringiz (reja, yutuqlar, ballar, test natijalari, belgilar).</p>
      <p class="small" style="margin:0 0 8px">Telegram orqali kirganda telefon raqamingiz olinmaydi. Ma’lumotlaringiz boshqa foydalanuvchilarga ko‘rsatilmaydi va sotilmaydi.</p>
      <p class="small" style="margin:0">“Akkauntni o‘chirish” tugmasi hisobingizni va bulutdagi barcha ma’lumotlaringizni butunlay o‘chiradi. Telefondagi nusxa saqlanib qoladi.</p>
      <div class="acts"><button class="btn primary" data-x="close">Tushunarli</button></div>`);
  }
  const G = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3A12 12 0 1 1 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>`;

  async function page(api) {
    A = api;
    A.setChrome("Profil", true, "home");
    const online = navigator.onLine;
    if (hasStoredSession() || user) { try { await client(); } catch { /* oflayn */ } }
    if (user) return pageIn();
    A.view.innerHTML = `<div class="hello"><h2>Kirish</h2><p class="muted">Hisobga kirsangiz, reja, yutuqlar va test natijalaringiz bulutga saqlanadi va boshqa telefonda ham ko‘rinadi.</p></div>
      <div class="acc-card">
        ${online ? `<button class="acc-google" id="gBtn">${G}<span>Google bilan kirish</span></button>
        <div class="acc-or"><span>yoki</span></div>
        <div id="tgBox" class="acc-tg"><small class="muted">Telegram tugmasi yuklanmoqda…</small></div>
        <p class="small muted" style="margin:10px 0 0">Telefon raqami bilan kirish tez orada qo‘shiladi.</p>`
        : A.emptyState(A.ICX.warn, "Internet kerak", "Kirish uchun internetga ulaning. Qolgan bo‘limlar internetsiz ishlayveradi.")}
      </div>
      <p class="small muted" style="margin:14px 2px">Kirmasdan ham ilova avvalgidek ishlaydi. <a href="#" id="pvLink">Maxfiylik</a></p>`;
    A.$("#pvLink")?.addEventListener("click", (e) => { e.preventDefault(); privacy(); });
    if (online) {
      A.$("#gBtn").addEventListener("click", googleLogin);
      const box = A.$("#tgBox");
      box.innerHTML = "";
      telegramWidget(box);
      client().catch(() => {});
    }
  }

  function shrink(file, size) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!side) return rej(new Error("img"));
        const c = document.createElement("canvas"); c.width = c.height = size;
        c.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        let q = 0.85, out = c.toDataURL("image/jpeg", q);
        while (out.length > 60000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        out.length < 80000 ? res(out) : rej(new Error("big"));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("fmt")); };
      img.src = url;
    });
  }

  function pageIn() {
    const m = user.user_metadata || {};
    const name = m.full_name || m.name || "Foydalanuvchi";
    const prov = user.app_metadata?.provider === "telegram" ? "Telegram" : user.app_metadata?.provider === "google" ? "Google" : "Hisob";
    const sub = m.telegram_username ? "@" + m.telegram_username : (user.app_metadata?.provider === "google" ? user.email : "");
    A.view.innerHTML = `<div class="acc-me">
        <button class="acc-av acc-av-btn" id="avBtn" type="button" aria-label="Profil rasmini o‘zgartirish">${avatarSrc() ? `<img src="${esc(avatarSrc())}" alt="" referrerpolicy="no-referrer">` : esc(name[0] || "?").toUpperCase()}<span class="acc-cam" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4zM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/></svg></span></button>
        <input type="file" id="avFile" accept="image/*" hidden>
        <div><h2 style="margin:0">${esc(name)}</h2><p class="muted small" style="margin:2px 0 0">${prov}${sub ? " · " + esc(sub) : ""}</p></div></div>
      <div class="acc-card">
        <div class="setting-row" style="border:0;padding-top:0"><span><b>Bulutga saqlash</b><br><small class="muted" id="accSync"></small></span><button class="btn" id="syncNow">Hozir saqlash</button></div>
        <p class="small muted" style="margin:0">Reja, yutuqlar, ballar, test natijalari va belgilar avtomatik saqlanadi. Boshqa telefonda shu hisobga kirsangiz, hammasi shu yerda bo‘ladi.</p>
      </div>
      <div class="tm-acts" style="margin-top:14px">
        <button class="btn" id="avChange">Rasmni o‘zgartirish</button>
        ${photo() ? `<button class="btn" id="avDel">Rasmni olib tashlash</button>` : ""}
        <button class="btn" id="outBtn">Chiqish</button>
        <button class="btn" id="pvBtn">Maxfiylik</button>
        <button class="btn danger" id="delBtn">Akkauntni o‘chirish</button></div>`;
    paintStatus();
    A.$("#syncNow").addEventListener("click", async () => { A.toast("Saqlanmoqda…"); ls.set("tqsync:dirty", "1"); await pull(); await push(); paintStatus(); A.toast("Saqlandi"); });
    const pick = () => A.$("#avFile").click();
    A.$("#avBtn").addEventListener("click", pick);
    A.$("#avChange").addEventListener("click", pick);
    A.$("#avFile").addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      if (!navigator.onLine) { A.toast("Rasm yuklash uchun internet kerak"); return; }
      try {
        A.toast("Rasm yuklanmoqda…");
        const url = await shrink(f, 256);
        const { error } = await sb.from("profiles").update({ photo: url, updated_at: new Date().toISOString() }).eq("id", user.id);
        if (error) throw error;
        setPhoto(url); paintBtn(); pageIn(); A.toast("Profil rasmi yangilandi");
      } catch { A.toast("Rasmni yuklab bo‘lmadi. Boshqa rasm tanlang"); }
    });
    A.$("#avDel")?.addEventListener("click", async () => {
      try {
        const { error } = await sb.from("profiles").update({ photo: null, updated_at: new Date().toISOString() }).eq("id", user.id);
        if (error) throw error;
        setPhoto(""); paintBtn(); pageIn(); A.toast("Rasm olib tashlandi");
      } catch { A.toast("Olib tashlab bo‘lmadi. Internetni tekshiring"); }
    });
    A.$("#pvBtn").addEventListener("click", privacy);
    A.$("#outBtn").addEventListener("click", async () => {
      if (ls.get("tqsync:dirty") === "1") { await push(); }
      await sb.auth.signOut(); user = null; paintBtn(); A.toast("Chiqdingiz"); location.hash = "#/";
    });
    A.$("#delBtn").addEventListener("click", () => {
      const sh = A.sheet(`<h3>Akkaunt o‘chirilsinmi?</h3><p class="muted small" style="margin:0">Hisobingiz va bulutdagi barcha ma’lumotlaringiz butunlay o‘chadi. Bu amalni qaytarib bo‘lmaydi. Telefondagi nusxa saqlanib qoladi.</p>
        <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn danger" id="delYes">Ha, o‘chirish</button></div>`);
      sh.el.querySelector("#delYes").addEventListener("click", async () => {
        const { error } = await sb.rpc("delete_my_account");
        sh.close();
        if (error) { A.toast("O‘chirib bo‘lmadi. Keyinroq urinib ko‘ring"); return; }
        ["tqsync:last", "tqsync:dirty", "tqsync:at"].forEach(ls.del);
        try { await sb.auth.signOut(); } catch { /* */ }
        user = null; paintBtn(); A.toast("Akkaunt o‘chirildi"); location.hash = "#/";
      });
    });
  }

  /* ---------- Ishga tushirish ---------- */
  function boot(api) {
    A = api;
    paintBtn();
    document.getElementById("accBtn")?.addEventListener("click", () => { location.hash = "#/profil"; });
    if (hasStoredSession() || /[?&]code=/.test(location.search)) client().then(() => { paintBtn(); if (user) { pull(); loadPhoto(); } }).catch(() => {});
    window.addEventListener("online", () => { if (user) { pull(); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && user) pull(); });
  }
  window.ACC = { boot, page, touch, privacy, me: () => (user ? { name: user.user_metadata?.full_name || user.user_metadata?.name || "Foydalanuvchi", photo: avatarSrc() } : null), _t: { mergeKey } };
})();
