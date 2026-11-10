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
          if (!user && was) { setPhoto(""); setProf({}); ls.del("tqsync:last"); ls.del("tqsync:dirty"); ls.del("tqsync:at"); }
          if (/^#\/(profil|sozlamalar)/.test(location.hash || "")) A?.refresh?.();
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
    el.textContent = at ? "Oxirgi saqlash: " + new Date(at).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "Hali saqlanmagan";
  }

  /* ---------- Kirish usullari ---------- */
  async function googleLogin() {
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + "#/sozlamalar" } });
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
    A.view.innerHTML = `<div class="acc-login"><h3>Hisobga kirish</h3>
        <p class="small muted" style="margin:0 0 10px">Kirsangiz, reja, yutuqlar va test natijalaringiz bulutga saqlanadi va boshqa qurilmada ham ko‘rinadi. Konsilium ham faqat hisob bilan ishlaydi.</p>
        ${online ? `<button class="acc-google" id="gBtn">${G}<span>Google bilan kirish</span></button>
        <div class="acc-or"><span>yoki</span></div>
        <div id="tgBox" class="acc-tg"><small class="muted">Telegram tugmasi yuklanmoqda…</small></div>`
        : `<p class="small muted" style="margin:0">Kirish uchun internetga ulaning. Qolgan bo‘limlar internetsiz ishlayveradi.</p>`}
        <p class="small muted" style="margin:10px 0 0">Kirmasdan ham ilova avvalgidek ishlaydi. <a href="#" id="pvLink">Maxfiylik</a></p></div>`;
    A.$("#pvLink")?.addEventListener("click", (e) => { e.preventDefault(); privacy(); });
    if (online) {
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
        <label class="field">Fakultet<input id="pfFac" list="pfFacList" maxlength="80" value="${esc(pf.faculty || "")}" placeholder="Tanlang yoki yozing" autocomplete="off"><datalist id="pfFacList">${FACULTIES.map((f) => `<option value="${esc(f)}">`).join("")}</datalist></label>
        <label class="field">Kurs
          <select id="pfCourse"><option value="">Ko‘rsatmayman</option>${courses.map((c) => `<option${sel(pf.course, c)}>${c}</option>`).join("")}</select></label>
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
    const prov = user.app_metadata?.provider === "telegram" ? "Telegram" : user.app_metadata?.provider === "google" ? "Google" : "Hisob";
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
    document.getElementById("accBtn")?.addEventListener("click", () => { location.hash = "#/sozlamalar"; });
    if (hasStoredSession() || /[?&]code=/.test(location.search)) client().then(() => { paintBtn(); if (user) { pull(); loadPhoto(); } }).catch(() => {});
    window.addEventListener("online", () => { if (user) { pull(); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && user) pull(); });
  }
  window.ACC = { boot, page, touch, privacy, ctx: async () => { if (hasStoredSession() || user) { try { await client(); } catch { /* oflayn */ } } return { sb, user, url: URL_, key: KEY }; }, me: () => (user ? { name: displayName(), photo: avatarSrc() } : null), _t: { mergeKey, cropper, editProfile } };
})();
