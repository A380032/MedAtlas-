/* Akkaunt (Google / Telegram) va ma'lumotlarni bulutga saqlash — Supabase.
   v1.0 dan boshlab ilovadan foydalanish uchun hisobga kirish majburiy (kirish ekrani: gate). */
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
        if (ev === "PASSWORD_RECOVERY") setTimeout(() => newPassSheet(true), 300);
        const was = user?.id;
        user = sess?.user || null;
        setTimeout(() => {
          paintBtn();
          if (user && user.id !== was) { pull(); loadPhoto(); }
          if (!user && was) { setPhoto(""); setProf({}); ls.del("tqsync:last"); ls.del("tqsync:dirty"); ls.del("tqsync:at"); }
          if (user && user.id !== was) { touchDevice(true); checkAdmin(); }
          const gated = document.body.classList.contains("gated");
          if ((user && gated) || (!user && was)) A?.refresh?.();
          else if (/^#\/(profil|sozlamalar)/.test(location.hash || "")) A?.refresh?.();
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
  const prof = () => { try { return JSON.parse(localStorage.getItem("tqacc:prof") || "{}") || {}; } catch { return {}; } };
  const setProf = (o) => { try { localStorage.setItem("tqacc:prof", JSON.stringify(o)); } catch { /* */ } };
  const avatarSrc = () => photo() || user?.user_metadata?.avatar_url || "";
  const provName = () => user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.user_metadata?.telegram_username ? "@" + user.user_metadata.telegram_username : "") || "Foydalanuvchi";
  const displayName = () => (prof().name || "").trim() || provName();
  async function loadPhoto() {
    if (!user || !sb || !navigator.onLine) return;
    try {
      const r = await sb.from("profiles").select("photo,name,faculty,course,role,role_note").eq("id", user.id).maybeSingle();
      if (r.error || !r.data) return;
      const d = r.data, before = JSON.stringify([photo(), prof()]);
      setPhoto(d.photo || "");
      setProf({ name: d.name || "", faculty: d.faculty || "", course: d.course || "", role: d.role || "", note: d.role_note || "" });
      if (before !== JSON.stringify([photo(), prof()])) { paintBtn(); if (/^#\/(profil|sozlamalar)/.test(location.hash || "")) A?.refresh?.(); }
    } catch { /* oflayn */ }
  }
  function paintBtn() {
    const b = document.getElementById("accBtn");
    if (!b) return;
    const name = user ? displayName() : "";
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
    el.textContent = at ? "Oxirgi saqlash: " + new Date(at).toLocaleString(window.I18N.locale(), { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "Hali saqlanmagan";
  }

  /* ---------- Kirish usullari ---------- */
  async function googleLogin() {
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + "#/" } });
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


  /* ---------- Email + parol bilan kirish ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneOf = (v) => { if (/[@a-z]/i.test(v)) return null; let d = String(v).replace(/\D/g, ""); if (d.length === 9) d = "998" + d; return /^[0-9]{9,15}$/.test(d) ? d : null; };
  const fnPost = (name, body, token) => fetch(URL_ + "/functions/v1/" + name, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  const pwBlock = () => `<form class="acc-pw" id="pwForm" novalidate>
      <label class="field" id="pwNameBox" hidden>Ismingiz<input id="pwName" maxlength="60" autocomplete="name" placeholder="Ism Familiya"></label>
      <label class="field"><span id="pwIdLbl">Email yoki telefon raqam</span><input id="pwEmail" type="text" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="email@gmail.com yoki +998 90 123 45 67"></label>
      <label class="field">Parol<input id="pwPass" type="password" autocomplete="current-password" placeholder="Kamida 6 ta belgi"></label>
      <button class="btn primary acc-pw-go" id="pwGo" type="submit">Kirish</button>
      <div class="acc-pw-links"><a href="#" id="pwMode">Ro‘yxatdan o‘tish</a><a href="#" id="pwForgot">Parolni unutdim</a></div>
    </form><div class="acc-or"><span>yoki</span></div>`;
  function bindPw(root) {
    let reg = false;
    const q = (s) => root.querySelector(s);
    const go = q("#pwGo"), pass = q("#pwPass");
    const msg = (e) => {
      const m = String(e?.message || e || "");
      if (/invalid login|invalid credentials/i.test(m)) return "Email yoki parol noto‘g‘ri";
      if (/already|registered/i.test(m)) return "Bu email bilan hisob bor. “Kirish”ni bosing";
      if (/rate|too many|seconds/i.test(m)) return "Juda ko‘p urinish. Biroz kutib qayta urinib ko‘ring";
      if (/password/i.test(m)) return "Parol kamida 6 ta belgidan iborat bo‘lsin";
      if (/confirm/i.test(m)) return "Email tasdiqlanmagan";
      return "Kirib bo‘lmadi. Internetni tekshiring";
    };
    q("#pwMode").addEventListener("click", (e) => {
      e.preventDefault(); reg = !reg;
      q("#pwNameBox").hidden = !reg;
      q("#pwIdLbl").textContent = reg ? "Email" : "Email yoki telefon raqam";
      go.textContent = reg ? "Ro‘yxatdan o‘tish" : "Kirish";
      q("#pwMode").textContent = reg ? "Hisobim bor, kirish" : "Ro‘yxatdan o‘tish";
      pass.autocomplete = reg ? "new-password" : "current-password";
    });
    q("#pwForgot").addEventListener("click", async (e) => {
      e.preventDefault();
      const email = q("#pwEmail").value.trim();
      if (phoneOf(email)) { A.toast("Telegram hisobi uchun: Telegram orqali kirib, Profildan yangi parol o‘rnating"); return; }
      if (!EMAIL_RE.test(email)) { A.toast("Avval email manzilingizni yozing"); return; }
      try {
        const c = await client();
        const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        A.toast("Parolni tiklash havolasi emailingizga yuborildi");
      } catch (er) { A.toast(msg(er)); }
    });
    q("#pwForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = q("#pwEmail").value.trim(), pw = pass.value;
      const ph = reg ? null : phoneOf(email);
      if (!ph && !EMAIL_RE.test(email)) { A.toast(reg ? "Email manzilni to‘g‘ri yozing" : "Email yoki telefon raqamni to‘g‘ri yozing"); return; }
      if (pw.length < 6) { A.toast("Parol kamida 6 ta belgidan iborat bo‘lsin"); return; }
      if (!navigator.onLine) { A.toast("Kirish uchun internet kerak"); return; }
      go.disabled = true;
      try {
        const c = await client();
        if (ph) {
          const r = await fnPost("phone-auth", { action: "login", phone: ph, password: pw });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.access_token) throw new Error("invalid login credentials");
          const { error } = await c.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
          if (error) throw error;
        } else if (reg) {
          const nm = q("#pwName").value.trim();
          const { data, error } = await c.auth.signUp({ email, password: pw, options: { data: nm ? { full_name: nm } : {} } });
          if (error) throw error;
          if (!data.session) { A.toast("Hisob ochildi. Emailingizni tasdiqlang yoki “Kirish”ni bosing"); }
        } else {
          const { error } = await c.auth.signInWithPassword({ email, password: pw });
          if (error) throw error;
        }
      } catch (er) { A.toast(msg(er)); console.warn(er); }
      go.disabled = false;
    });
  }

  /* Yangi parol o'rnatish (tiklash havolasidan kelganda yoki profil sozlamalaridan) */
  function newPassSheet(recovery) {
    const m = user?.user_metadata || {};
    const tg = !recovery && !!(m.telegram_id || user?.app_metadata?.provider === "telegram");
    const sh = A.sheet(`<h3>${recovery ? "Yangi parol" : tg ? "Telefon raqam va parol" : "Parol o‘rnatish"}</h3>
      <p class="muted small" style="margin:0">${recovery ? "Yangi parolni yozing." : tg ? "Telegramga ulangan telefon raqamingizni va o‘zingiz o‘ylagan parolni yozing. Keyin Telegramsiz ham, shu raqam va parol bilan kira olasiz." : "Yangi parolni yozing. Keyin shu parol bilan ham kira olasiz."}</p>
      <div class="pf-form">
        ${tg ? `<label class="field">Telefon raqam<input id="npPhone" type="tel" inputmode="tel" autocomplete="username" placeholder="+998 90 123 45 67"></label>` : ""}
        <label class="field">Parol<input id="npPass" type="password" autocomplete="new-password" placeholder="Kamida 6 ta belgi"></label>
      </div>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="npSave">Saqlash</button></div>`);
    sh.el.querySelector("#npSave").addEventListener("click", async () => {
      const ph = tg ? phoneOf(sh.el.querySelector("#npPhone").value) : null;
      const pw = sh.el.querySelector("#npPass").value;
      if (tg && !ph) { A.toast("Telefon raqamni to‘g‘ri yozing"); return; }
      if (pw.length < 6) { A.toast("Parol kamida 6 ta belgidan iborat bo‘lsin"); return; }
      if (!navigator.onLine) { A.toast("Saqlash uchun internet kerak"); return; }
      try {
        const c = await client();
        if (tg) {
          const { data: ss } = await c.auth.getSession();
          const r = await fnPost("phone-auth", { action: "set", phone: ph }, ss.session?.access_token);
          if (r.status === 409) { A.toast("Bu raqam boshqa hisobga ulangan"); return; }
          if (!r.ok) throw new Error("save");
        }
        const { error } = await c.auth.updateUser({ password: pw });
        if (error) throw error;
        sh.close(); A.toast(tg ? "Saqlandi. Endi telefon raqam va parol bilan kira olasiz" : "Parol saqlandi");
        if (recovery) { history.replaceState(null, "", location.pathname + "#/"); A.refresh?.(); }
      } catch (er) {
        A.toast(/same/i.test(er?.message || "") ? "Yangi parol eskisidan farq qilsin" : "Saqlab bo‘lmadi. Qayta urinib ko‘ring");
      }
    });
  }

  /* ---------- Profil sahifasi ---------- */
  function privacy() {
    A.sheet(`<h3>Maxfiylik</h3>
      <p class="small" style="margin:0 0 8px">Hisobga kirganingizda quyidagilar saqlanadi: ismingiz, profil rasmingiz (Google yoki Telegramdan), Telegram username va ilovadagi natijalaringiz (reja, yutuqlar, ballar, test natijalari, belgilar).</p>
      <p class="small" style="margin:0 0 8px">Telegram orqali kirganda telefon raqamingiz olinmaydi. O‘quv natijalaringizni faqat o‘zingiz ko‘rasiz. Konsiliumda esa xonadagilarga ismingiz, rasmingiz, fakultet va kursingiz ko‘rinadi. Ma’lumotlar sotilmaydi.</p>
      <p class="small" style="margin:0 0 8px">Foydalanuvchilar sonini hisoblash uchun qurilmangiz noma’lum raqam bilan (platforma, brauzer, ilova versiyasi) sanaladi.</p>
      <p class="small" style="margin:0 0 8px"><a href="privacy.html" target="_blank" rel="noopener">To‘liq maxfiylik siyosati</a></p>
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
    A.view.innerHTML = `<div class="acc-login"><h3>Hisobga kirish</h3>
        <p class="small muted" style="margin:0 0 10px">Kirsangiz, reja, yutuqlar va test natijalaringiz bulutga saqlanadi va boshqa qurilmada ham ko‘rinadi. Konsilium ham faqat hisob bilan ishlaydi.</p>
        ${online ? `${pwBlock()}<button class="acc-google" id="gBtn">${G}<span>Google bilan kirish</span></button>
        <div class="acc-or"><span>yoki</span></div>
        <div id="tgBox" class="acc-tg"><small class="muted">Telegram tugmasi yuklanmoqda…</small></div>`
        : `<p class="small muted" style="margin:0">Kirish uchun internetga ulaning.</p>`}
        <p class="small muted" style="margin:10px 0 0"><a href="#" id="pvLink">Maxfiylik</a></p></div>`;
    A.$("#pvLink")?.addEventListener("click", (e) => { e.preventDefault(); privacy(); });
    if (online) {
      bindPw(A.view);
      A.$("#gBtn").addEventListener("click", googleLogin);
      const box = A.$("#tgBox");
      box.innerHTML = "";
      telegramWidget(box);
      client().catch(() => {});
    }
  }

  /* ---------- Rasmni kesish ---------- */
  function cropper(file, onDone) {
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); A.toast("Bu rasmni ochib bo‘lmadi"); };
    img.onload = () => {
      const V = 280, iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw || !ih) { A.toast("Bu rasmni ochib bo‘lmadi"); return; }
      const sh = A.sheet(`<h3>Rasmni joylashtiring</h3><p class="muted small" style="margin:0">Barmog‘ingiz bilan suring, pastdagi chiziq bilan kattalashtiring.</p>
        <div class="crop-wrap"><canvas id="crC" width="${V}" height="${V}"></canvas></div>
        <input type="range" id="crZ" min="1" max="3" step="0.01" value="1" aria-label="Kattalashtirish">
        <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="crOk">Tayyor</button></div>`);
      const cv = sh.el.querySelector("#crC"), ctx = cv.getContext("2d"), zr = sh.el.querySelector("#crZ");
      const base = Math.max(V / iw, V / ih);
      let z = 1, ox = (V - iw * base) / 2, oy = (V - ih * base) / 2;
      const clamp = () => { const w = iw * base * z, h = ih * base * z; ox = Math.min(0, Math.max(V - w, ox)); oy = Math.min(0, Math.max(V - h, oy)); };
      const draw = () => { clamp(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, V, V); ctx.drawImage(img, ox, oy, iw * base * z, ih * base * z); };
      draw();
      let drag = null;
      cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; const k = V / cv.getBoundingClientRect().width; ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; draw(); });
      const end = () => { drag = null; };
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      zr.addEventListener("input", () => {
        const nz = parseFloat(zr.value), cx = (V / 2 - ox) / z, cy = (V / 2 - oy) / z;
        z = nz; ox = V / 2 - cx * z; oy = V / 2 - cy * z; draw();
      });
      sh.el.querySelector("#crOk").addEventListener("click", () => {
        const o = document.createElement("canvas"); o.width = o.height = 256;
        o.getContext("2d").drawImage(cv, 0, 0, V, V, 0, 0, 256, 256);
        let q = 0.85, out = o.toDataURL("image/jpeg", q);
        while (out.length > 60000 && q > 0.4) { q -= 0.1; out = o.toDataURL("image/jpeg", q); }
        URL.revokeObjectURL(url); sh.close(); onDone(out);
      });
    };
    img.src = url;
  }

  /* ---------- Profilni tahrirlash ---------- */
  const FACULTIES = ["Davolash ishi", "Pediatriya", "Tibbiy-profilaktika", "Stomatologiya", "Farmatsiya", "Tibbiy pedagogika", "Xalqaro fakultet", "Oliy hamshiralik ishi"];
  const trF = (s) => (s && window.t && window.I18N?.lang !== "uz" ? window.t(s) : s);   // fakultet nomi tanlangan tilda
  function editProfile() {
    const pf = prof();
    const sel = (v, o) => (v === o ? " selected" : "");
    const courses = ["1-kurs", "2-kurs", "3-kurs", "4-kurs", "5-kurs", "6-kurs", "Magistratura", "Ordinatura", "Boshqa"];
    const sh = A.sheet(`<h3>Profilni tahrirlash</h3>
      <div class="pf-form">
        <label class="field">Ismingiz<input id="pfName" maxlength="60" value="${esc(pf.name || "")}" placeholder="${esc(provName())}" autocomplete="off"></label>
        <label class="field">Kimsiz?
          <select id="pfRole"><option value="">Ko‘rsatmayman</option><option value="talaba"${sel(pf.role, "talaba")}>Talaba</option><option value="oqituvchi"${sel(pf.role, "oqituvchi")}>O‘qituvchi</option><option value="boshqa"${sel(pf.role, "boshqa")}>Boshqa</option></select></label>
        <label class="field" id="pfNoteBox" ${pf.role === "boshqa" ? "" : "hidden"}>Kim ekaningizni yozing<input id="pfNote" maxlength="60" value="${esc(pf.note || "")}" placeholder="masalan, shifokor, rezident" autocomplete="off"></label>
        <label class="field">Fakultet<input id="pfFac" list="pfFacList" maxlength="80" value="${esc(trF(pf.faculty || ""))}" placeholder="Tanlang yoki yozing" autocomplete="off"><datalist id="pfFacList">${FACULTIES.map((f) => `<option value="${esc(trF(f))}">`).join("")}</datalist></label>
        <label class="field">Kurs
          <select id="pfCourse"><option value="">Ko‘rsatmayman</option>${courses.map((c) => `<option value="${esc(c)}"${sel(pf.course, c)}>${c}</option>`).join("")}</select></label>
        <p class="small muted" style="margin:0">Hammasi ixtiyoriy. Kirish usulingiz (Google yoki Telegram) bu yerda o‘zgarmaydi.</p>
      </div>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="pfSave">Saqlash</button></div>`);
    const q = (id) => sh.el.querySelector(id);
    q("#pfRole").addEventListener("change", () => { q("#pfNoteBox").hidden = q("#pfRole").value !== "boshqa"; });
    q("#pfSave").addEventListener("click", async () => {
      if (!navigator.onLine) { A.toast("Saqlash uchun internet kerak"); return; }
      const role = q("#pfRole").value || null;
      const row = {
        name: q("#pfName").value.trim().slice(0, 60) || null,
        faculty: q("#pfFac").value.trim().slice(0, 80) || null,
        course: q("#pfCourse").value || null,
        role,
        role_note: role === "boshqa" ? (q("#pfNote").value.trim().slice(0, 60) || null) : null,
        updated_at: new Date().toISOString()
      };
      const { error } = await sb.from("profiles").update(row).eq("id", user.id);
      if (error) { A.toast("Saqlab bo‘lmadi. Qayta urinib ko‘ring"); return; }
      setProf({ name: row.name || "", faculty: row.faculty || "", course: row.course || "", role: row.role || "", note: row.role_note || "" });
      sh.close(); paintBtn(); pageIn(); A.toast("Profil saqlandi");
    });
  }

  function pageIn() {
    const m = user.user_metadata || {};
    const name = displayName(), pf = prof();
    const prov = (m.telegram_id || user.app_metadata?.provider === "telegram") ? "Telegram" : user.app_metadata?.provider === "google" ? "Google" : "Hisob";
    const sub = m.telegram_username ? "@" + m.telegram_username : (user.app_metadata?.provider === "google" ? user.email : "");
    A.view.innerHTML = `<div class="acc-me">
        <button class="acc-av acc-av-btn" id="avBtn" type="button" aria-label="Profil rasmini o‘zgartirish">${avatarSrc() ? `<img src="${esc(avatarSrc())}" alt="" referrerpolicy="no-referrer">` : esc(name[0] || "?").toUpperCase()}<span class="acc-cam" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4zM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/></svg></span></button>
        <input type="file" id="avFile" accept="image/*" hidden>
        <div style="min-width:0"><h2 style="margin:0">${esc(name)}</h2><p class="muted small" style="margin:2px 0 0">${prov}${sub ? " · " + esc(sub) : ""}</p>
          ${(pf.role || pf.faculty || pf.course) ? `<div class="acc-info">${pf.role ? `<span>${esc(pf.role === "talaba" ? "Talaba" : pf.role === "oqituvchi" ? "O‘qituvchi" : (pf.note || "Boshqa"))}</span>` : ""}${pf.faculty ? `<span>${esc(pf.faculty)}</span>` : ""}${pf.course ? `<span>${esc(pf.course)}</span>` : ""}</div>` : ""}</div>
        <button class="btn acc-edit" id="editBtn">Tahrirlash</button></div>
      <div class="acc-sync"><span>Bulutga saqlash · <span id="accSync"></span></span><button class="btn" id="syncNow">Saqlash</button></div>
      <details class="acc-more"><summary>Hisob sozlamalari</summary>
        <div class="tm-acts">
          <button class="btn" id="avChange">Rasmni o‘zgartirish</button>
          ${photo() ? `<button class="btn" id="avDel">Rasmni olib tashlash</button>` : ""}
          <button class="btn" id="pwSet">Parol o‘rnatish</button>
          <button class="btn" id="pvBtn">Maxfiylik</button>
          <button class="btn" id="outBtn">Chiqish</button>
          <button class="btn danger" id="delBtn">Akkauntni o‘chirish</button></div></details>`;
    paintStatus();
    A.$("#syncNow").addEventListener("click", async () => { A.toast("Saqlanmoqda…"); ls.set("tqsync:dirty", "1"); await pull(); await push(); paintStatus(); A.toast("Saqlandi"); });
    const pick = () => A.$("#avFile").click();
    A.$("#avBtn").addEventListener("click", pick);
    A.$("#avChange").addEventListener("click", pick);
    A.$("#avFile").addEventListener("change", (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      if (!navigator.onLine) { A.toast("Rasm yuklash uchun internet kerak"); return; }
      cropper(f, async (url) => {
        try {
          const { error } = await sb.from("profiles").update({ photo: url, updated_at: new Date().toISOString() }).eq("id", user.id);
          if (error) throw error;
          setPhoto(url); paintBtn(); pageIn(); A.toast("Profil rasmi yangilandi");
        } catch { A.toast("Rasmni saqlab bo‘lmadi. Qayta urinib ko‘ring"); }
      });
    });
    A.$("#editBtn").addEventListener("click", editProfile);
    A.$("#avDel")?.addEventListener("click", async () => {
      try {
        const { error } = await sb.from("profiles").update({ photo: null, updated_at: new Date().toISOString() }).eq("id", user.id);
        if (error) throw error;
        setPhoto(""); paintBtn(); pageIn(); A.toast("Rasm olib tashlandi");
      } catch { A.toast("Olib tashlab bo‘lmadi. Internetni tekshiring"); }
    });
    A.$("#pvBtn").addEventListener("click", privacy);
    A.$("#pwSet").addEventListener("click", () => newPassSheet(false));
    A.$("#outBtn").addEventListener("click", async () => {
      if (ls.get("tqsync:dirty") === "1") { await push(); }
      await sb.auth.signOut(); user = null; ls.del("tqacc:admin"); paintBtn(); A.toast("Chiqdingiz");
      if (location.hash === "#/" || !location.hash) A.refresh?.(); else location.hash = "#/";
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
        user = null; ls.del("tqacc:admin"); paintBtn(); A.toast("Akkaunt o‘chirildi");
        if (location.hash === "#/" || !location.hash) A.refresh?.(); else location.hash = "#/";
      });
    });
  }

  /* ---------- Kirish ekrani (hisobsiz foydalanib bo'lmaydi) ---------- */
  const signed = () => !!user || hasStoredSession();
  const LOGO = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
  const FEAT = [
    [LOGO + '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>', "Qo‘llanmalar", "8+ fan, rasm va sxemalar bilan"],
    [LOGO + '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/></svg>', "Test markazi", "3 700+ savol, xatolar ustida ishlash"],
    [LOGO + '<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/></svg>', "Simulyatorlar", "Virtual bemor va laboratoriya"],
    [LOGO + '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.9c2 .6 3.2 2.2 3.5 5.1"/></svg>', "Konsilium", "Jonli muhokama va maruza"]
  ];
  async function gate(api) {
    A = api;
    const v = A.view;
    v.classList.remove("wide");
    const shell = (inner) => {
      v.innerHTML = `<div class="gate">
        <div class="gate-hero"><img src="icons/icon-192.png" alt="" width="72" height="72"><h1>ALVORA <b>Med</b></h1>
          <p>Tibbiyot talabalari uchun qo‘llanma, test, simulyator va jonli muhokama bir joyda.</p></div>
        <ul class="gate-feat">${FEAT.map(([i, t, d]) => `<li><span class="gi">${i}</span><span><b>${t}</b><small>${d}</small></span></li>`).join("")}</ul>
        <div class="gate-card">${inner}</div>
        <p class="gate-legal small muted">Kirish orqali <a href="terms.html" target="_blank" rel="noopener">Foydalanish shartlari</a> va <a href="privacy.html" target="_blank" rel="noopener">Maxfiylik siyosati</a>ga rozilik bildirasiz.</p>
      </div>`;
    };
    if (/[?&]code=/.test(location.search)) {
      shell(`<h2>Kirilmoqda…</h2><p class="small muted">Google hisobingiz tekshirilmoqda.</p>`);
      try { await client(); } catch { /* */ }
      if (user) { history.replaceState(null, "", location.pathname + (location.hash || "#/")); return A.refresh?.(); }
    }
    if (!navigator.onLine) {
      shell(`<h2>Internet kerak</h2><p class="small muted">Birinchi marta kirish uchun internetga ulaning. Keyin kitoblar, testlar va simulyatorlar internetsiz ham ochiladi.</p>
        <button class="btn primary" id="gRetry">Qayta urinish</button>`);
      v.querySelector("#gRetry").addEventListener("click", () => A.refresh?.());
      window.addEventListener("online", () => { if (document.body.classList.contains("gated")) A.refresh?.(); }, { once: true });
      return;
    }
    shell(`<h2>Kirish yoki ro‘yxatdan o‘tish</h2>
      <p class="small muted">Birinchi kirishda hisob o‘zi ochiladi. Natijalaringiz bulutga saqlanadi va boshqa qurilmada ham ko‘rinadi.</p>
      ${pwBlock()}
      <button class="acc-google" id="gBtn">${G}<span>Google bilan kirish</span></button>
      <div class="acc-or"><span>yoki</span></div>
      <div id="tgBox" class="acc-tg"><small class="muted">Telegram tugmasi yuklanmoqda…</small></div>`);
    bindPw(v);
    v.querySelector("#gBtn").addEventListener("click", googleLogin);
    const box = v.querySelector("#tgBox");
    box.innerHTML = "";
    telegramWidget(box);
    client().catch(() => {});
  }

  /* ---------- Qurilma va faollik (faqat statistika uchun, shaxsiy ma'lumotsiz) ---------- */
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  function devInfo() {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const platform = ios ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Boshqa";
    const browser = /Telegram/i.test(ua) ? "Telegram" : /YaBrowser/.test(ua) ? "Yandex" : /SamsungBrowser/.test(ua) ? "Samsung" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Boshqa";
    const standalone = !!(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone);
    return { platform, browser, standalone };
  }
  async function touchDevice(force) {
    if (!user || !sb || !navigator.onLine) return;
    const key = user.id.slice(0, 8) + ":" + today() + ":" + (window.I18N?.lang || "uz");
    if (!force && ls.get("tqdev:day") === key && Date.now() - Number(ls.get("tqdev:at") || 0) < 6 * 3600e3) return;
    let id = ls.get("tqdev:id");
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) { id = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)); ls.set("tqdev:id", id); }
    const d = devInfo();
    try {
      const { error } = await sb.rpc("touch_device", { p_id: id, p_platform: d.platform, p_browser: d.browser, p_standalone: d.standalone, p_version: window.APP_VERSION || "", p_lang: window.I18N?.lang || "uz" });
      if (!error) { ls.set("tqdev:day", key); ls.set("tqdev:at", String(Date.now())); }
    } catch { /* */ }
  }
  const isAdmin = () => !!user && ls.get("tqacc:admin") === user.id;
  async function checkAdmin() {
    if (!user || !sb || !navigator.onLine) return;
    try {
      const { data, error } = await sb.rpc("is_admin");
      if (error) return;
      if (data) ls.set("tqacc:admin", user.id); else ls.del("tqacc:admin");
    } catch { /* */ }
  }

  /* ---------- Ishga tushirish ---------- */
  function boot(api) {
    A = api;
    paintBtn();
    document.getElementById("accBtn")?.addEventListener("click", () => { location.hash = "#/sozlamalar"; });
    if (hasStoredSession() || /[?&]code=/.test(location.search)) client().then(() => { paintBtn(); if (user) { pull(); loadPhoto(); touchDevice(); checkAdmin(); } else if (!signed()) A.refresh?.(); }).catch(() => {});
    window.addEventListener("online", () => { if (user) { pull(); touchDevice(); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && user) { pull(); touchDevice(); } });
  }
  window.ACC = { boot, page, gate, signed, isAdmin, touch, privacy, ctx: async () => { if (hasStoredSession() || user) { try { await client(); } catch { /* oflayn */ } } return { sb, user, url: URL_, key: KEY }; }, me: () => (user ? { name: displayName(), photo: avatarSrc() } : null), _t: { mergeKey, cropper, editProfile } };
})();
