/* ALVORA Med — Test battle: duel (1 ga 1), xonalar (2–50 kishi), tasodifiy raqib, Elo reyting va ligalar.
   Faqat internet bilan ishlaydi. Savollar va to'g'ri javoblar serverda turadi: telefonga javob kalitisiz keladi,
   tekshirish, vaqt va ball Supabase funksiyalarida hisoblanadi (supabase/migrations/20261124_test_battle_*.sql).
   Sahifalar: #/battle, #/battle/reyting, #/battle/qidiruv, #/battle/m/<id>, #/battle/kod/<KOD>, #/battle/xato/<id>, #/battle/savollar */
(() => {
  "use strict";
  let A = null;
  const BASE = "#/battle";
  const lang = () => (window.I18N?.lang === "en" ? "en" : "uz");
  const T = (s, v) => (window.t ? window.t(s, v) : s.replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    sword: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
    friend: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M18 8v6M15 11h6"/>',
    room: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.9c2 .6 3.2 2.2 3.5 5.1"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    leave: '<path d="M10 17l-5-5 5-5M5 12h11M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-2.5 0-4.5-1-4.5-3a2 2 0 0 1 4-.5L12 9l.5-3.5a2 2 0 0 1 4 .5c0 2-2 3-4.5 3"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>'
  };
  const LEAGUES = [
    { n: "Abituriyent", c: "#a0785a", e: "🎒" },
    { n: "Talaba", c: "#7c8ea3", e: "📘" },
    { n: "Intern", c: "#c9971c", e: "🩺" },
    { n: "Ordinator", c: "#1f9a83", e: "💉" },
    { n: "Shifokor", c: "#3b6fd8", e: "⚕️" },
    { n: "Professor", c: "#8e44ad", e: "👑" }
  ];
  const FLOORS = [0, 1200, 1350, 1500, 1650, 1800];
  const leagueOf = (r) => { let l = 0; for (let i = 0; i < FLOORS.length; i++) if (r >= FLOORS[i]) l = i; return l; };
  // O'yin turlari: har birining o'z reytingi va ligasi bor
  const MODES = [
    { id: "bullet", n: "Bullet", e: "⚡", sizes: [10, 15] },
    { id: "blitz", n: "Blitz", e: "🔥", sizes: [20, 25] },
    { id: "rapid", n: "Rapid", e: "⏳", sizes: [30] }
  ];
  const modeOf = (n) => (n <= 15 ? "bullet" : n <= 25 ? "blitz" : "rapid");
  const MD = (id) => MODES.find((m) => m.id === id) || MODES[1];
  const modeTag = (id) => { const m = MD(id); return `<span class="bt-mtag m-${m.id}">${m.e} ${m.n}</span>`; };
  const STICKERS = ["👍", "👏", "🔥", "💪", "🧠", "😅", "😮", "😎", "🤝", "🎉", "⏱️", "🍀"];
  const SIZES = [10, 15, 20, 25, 30];
  const LIM = { 1: 20, 2: 25, 3: 35, 4: 45, 5: 55 };
  const LET = "ABCDEFGHIJ";
  const COURSES = ["1", "2", "3"];

  /* ---------- Server bilan aloqa ---------- */
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  async function ctx() {
    if (!window.ACC?.ctx) throw Object.assign(new Error("auth"), { code: "auth" });
    const c = await withTimeout(window.ACC.ctx(), 12000);
    if (!c.sb || !c.user) throw Object.assign(new Error("auth"), { code: "auth" });
    return c;
  }
  async function rpc(fn, args = {}) {
    const c = await ctx();
    let r;
    try { r = await withTimeout(c.sb.rpc(fn, args), 15000); } catch { throw Object.assign(new Error("net"), { code: "net" }); }
    if (r.error) {
      const m = String(r.error.message || "");
      const [code, arg] = m.split(":");
      throw Object.assign(new Error(m), { code: code.trim(), arg: (arg || "").trim() });
    }
    return r.data;
  }
  const ERR = {
    busy: "Sizda tugallanmagan o‘yin bor. Avval uni yakunlang.",
    notfound: "O‘yin topilmadi.",
    started: "O‘yin allaqachon boshlangan.",
    full: "Xona to‘lgan.",
    closed: "Bu yopiq xona. Kod yoki havola bilan kiring.",
    kicked: "Siz bu xonadan chiqarilgansiz.",
    expired: "Taklif muddati tugagan.",
    blocked: "Bu foydalanuvchi bilan o‘ynab bo‘lmaydi.",
    no_invites: "Bu foydalanuvchi takliflarni qabul qilmaydi.",
    rate: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.",
    auth: "Avval hisobga kiring.",
    forbidden: "Buning uchun ruxsat yo‘q.",
    notin: "Siz bu o‘yin qatnashchisi emassiz.",
    not_done: "Natijalar o‘yin tugagandan keyin ochiladi.",
    net: "Server javob bermadi. Internetni tekshiring.",
    few_players: "Boshlash uchun kamida 2 kishi kerak."
  };
  const errText = (e) => (e?.code === "few" ? T("Bu tanlovda savollar yetarli emas ({n} ta bor). Kamroq savol yoki kengroq mavzu tanlang.", { n: e.arg || 0 }) : T(ERR[e?.code] || "Xatolik yuz berdi. Internetni tekshirib, qayta urinib ko‘ring."));
  const fail = (e) => {
    if (e?.code === "busy" && e.arg) { A.toast(T(ERR.busy)); location.hash = BASE + "/m/" + e.arg; return; }
    A.toast(errText(e));
  };

  /* ---------- Rasm (profil surati) ---------- */
  const photoCache = new Map();
  const avatar = (p, size = 44, cls = "") => {
    const src = photoCache.get(p.id) || p.av || "";
    const need = !photoCache.has(p.id) && p.ph;
    const lg = LEAGUES[p.lg ?? leagueOf(p.rating || 1000)];
    return `<span class="bt-av ${cls}" style="width:${size}px;height:${size}px;--lc:${lg.c}"${need ? ` data-ph="${esc(p.id)}"` : ""}>${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<b>${esc((p.name || "?").trim()[0] || "?").toUpperCase()}</b>`}</span>`;
  };
  async function fillPhotos(root) {
    const els = [...(root || document).querySelectorAll("[data-ph]")];
    const ids = [...new Set(els.map((e) => e.dataset.ph))].filter((id) => !photoCache.has(id)).slice(0, 40);
    if (ids.length) {
      try {
        const c = await ctx();
        const { data } = await c.sb.from("profiles").select("id,photo").in("id", ids);
        for (const r of data || []) photoCache.set(r.id, r.photo || "");
      } catch { /* */ }
      for (const id of ids) if (!photoCache.has(id)) photoCache.set(id, "");
    }
    for (const el of els) {
      const src = photoCache.get(el.dataset.ph);
      el.removeAttribute("data-ph");
      if (src) el.innerHTML = `<img src="${esc(src)}" alt="">`;
    }
  }

  /* ---------- Kichik yordamchilar ---------- */
  const lgBadge = (r, small) => { const l = LEAGUES[leagueOf(r)]; return `<span class="bt-lg${small ? " sm" : ""}" style="--lc:${l.c}">${l.e} ${esc(T(l.n))}</span>`; };
  const fmtS = (ms) => { const s = Math.round((ms || 0) / 1000); return s >= 60 ? Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") : s + " s"; };
  const num = (x) => { const n = Number(x || 0); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "").replace(".", lang() === "uz" ? "," : "."); };
  const scopeText = (m) => [m.course ? T("{c}-kurs", { c: m.course }) : "", m.sname || T("Barcha fanlar"), m.tname || (m.sname ? T("Barcha mavzular") : "")].filter(Boolean).join(" · ");
  const short = (s, n = 60) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const head = (sub) => `<div class="hello"><h2>${ico(I.sword, 24)} Test battle</h2><p class="muted">${sub}</p></div>`;
  const link = (code) => location.origin + location.pathname + "#/battle/kod/" + code;
  const vib = (p) => { try { navigator.vibrate?.(p); } catch { /* */ } };
  const onBattle = () => (location.hash || "").startsWith(BASE);

  function needLogin() {
    A.view.innerHTML = head("Duel, xonalar va onlayn reyting") +
      A.emptyState(I.sword, "Avval hisobga kiring", "Test battle faqat hisobga kirgan foydalanuvchilar uchun.", `<a class="btn primary" href="#/sozlamalar">Kirish</a>`);
  }
  function needNet(retry) {
    A.view.innerHTML = head("Bu bo‘lim faqat internet bilan ishlaydi.") +
      A.emptyState(A.ICX.warn, "Internet yo‘q", "Internetga ulaning va qayta urinib ko‘ring. Test markazidagi testlar internetsiz ham ishlaydi.", `<button class="btn primary" id="btRetry">Qayta urinish</button>`);
    A.$("#btRetry").addEventListener("click", retry);
  }
  function failBox(e, retry) {
    if (e?.code === "auth") return needLogin();
    A.view.innerHTML = head("Bu bo‘lim faqat internet bilan ishlaydi.") +
      A.emptyState(A.ICX.warn, "Ochilmadi", esc(errText(e)), `<button class="btn primary" id="btRetry">Qayta urinish</button>`);
    A.$("#btRetry").addEventListener("click", retry);
  }

  /* ---------- Sahifa almashganda taymer va kanallarni to'xtatish ---------- */
  let seq = 0, cleanups = [];
  const later = (f) => cleanups.push(f);
  function stopAll() { for (const f of cleanups.splice(0)) { try { f(); } catch { /* */ } } }
  const every = (ms, f) => { const id = setInterval(f, ms); later(() => clearInterval(id)); return id; };

  /* ---------- Katalog (fan va mavzular, savollar soni) ---------- */
  let catCache = null, catAt = 0, catLang = "";
  async function catalog() {
    if (catCache && catLang === lang() && Date.now() - catAt < 60000) return catCache;
    catCache = await rpc("bt_catalog", { p_lang: lang() }); catAt = Date.now(); catLang = lang();
    return catCache;
  }

  /* ---------- Bosh sahifa ---------- */
  const favMode = (me) => {
    const saved = store.get("bt:mode", "");
    if (MODES.some((m) => m.id === saved)) return saved;
    const ms = me?.modes || {};
    let best = "blitz", g = 0;
    for (const m of MODES) if ((ms[m.id]?.rg || 0) > g) { g = ms[m.id].rg; best = m.id; }
    return best;
  };
  function meCard(me, mid) {
    const x = me.modes?.[mid] || { rating: 1000, lg: 0 }, r = x.rating || 1000, l = leagueOf(r), nxt = FLOORS[l + 1];
    const prog = nxt ? pct(r - FLOORS[l], nxt - FLOORS[l]) : 100;
    const duels = (x.wins || 0) + (x.losses || 0) + (x.draws || 0);
    return `<section class="bt-me" style="--lc:${LEAGUES[l].c}">
        <div class="bt-me-top">${avatar({ ...me, lg: l }, 58)}
          <div class="bt-me-t"><b>${esc(me.name || "")}</b><small>${esc(me.uname || T("Universitet tanlanmagan"))}</small>${lgBadge(r)}</div>
          <div class="bt-me-r"><b>${r}</b><small>${esc(T("{m} reytingi", { m: MD(mid).n }))}</small></div></div>
        <div class="bt-lgbar" aria-hidden="true"><i style="width:${prog}%"></i></div>
        <p class="bt-lgnext small muted">${nxt ? esc(T("Keyingi liga — {l}: yana {n} ball", { l: T(LEAGUES[l + 1].n), n: nxt - r })) : esc(T("Eng yuqori liga"))}${x.shield ? " · 🛡 " + esc(T("ligadan tushishdan himoya: {n} o‘yin", { n: x.shield })) : ""}</p>
        ${!x.rg ? `<p class="small muted" style="margin:6px 0 0">${esc(T(r === 1000 ? "Bu turda hali o‘ynamagansiz. Hamma 1000 balldan boshlaydi." : "Bu turda hali o‘ynamagansiz. Boshlang‘ich reyting eng yaqin o‘ynagan turingizdan olindi."))}</p>` : ""}
        <div class="bt-stats">
          <span><b>${x.rank ? "#" + x.rank : "—"}</b><small>umumiy o‘rin</small></span>
          <span><b>${x.rank_uni ? "#" + x.rank_uni : "—"}</b><small>universitetda</small></span>
          <span><b class="g">${x.wins || 0}</b><small>g‘alaba</small></span>
          <span><b class="r">${x.losses || 0}</b><small>mag‘lubiyat</small></span>
          <span><b>${x.draws || 0}</b><small>durang</small></span>
          <span><b>${duels ? pct(x.wins || 0, duels) + "%" : "—"}</b><small>g‘alaba foizi</small></span>
        </div>
        ${x.room_games ? `<p class="small muted" style="margin:8px 0 0">${esc(T("Xonalarda: {g} ta o‘yin, {w} marta 1-o‘rin, {p} marta sovrinli o‘rin", { g: x.room_games, w: x.room_wins, p: x.room_podiums }))}</p>` : ""}
      </section>`;
  }
  const modeTabs = (me, mid, id) => `<div class="bt-modes" id="${id}" role="tablist">${MODES.map((m) => { const x = me?.modes?.[m.id]; return `<button role="tab" data-md="${m.id}" aria-selected="${m.id === mid}" class="m-${m.id}"><span>${m.e} ${m.n}</span><b>${x ? x.rating : "—"}</b><small>${esc(T("{s} savol", { s: m.sizes.join(" / ") }))}</small></button>`; }).join("")}</div>`;
  const t10Rows = (r, tab) => {
    if (tab === "unis") {
      const rows = r?.rows || [];
      return rows.length ? rows.map((u) => `<div class="bt-trow${u.mine ? " me" : ""}"><span class="bt-tpos ${u.pos <= 3 ? "m" + u.pos : ""}">${u.pos}</span>
          <span class="bt-uni-i">${ico(I.room, 20)}</span><span class="bt-tname"><b>${esc(u.name)}</b><small>${esc(T("{n} o‘yinchi", { n: u.players }))}</small></span>
          <span class="bt-tval">${u.score}</span></div>`).join("")
        : `<p class="small muted bt-empty">${esc(T("Hali reytingga kirgan universitet yo‘q. Universitet reytingga kirishi uchun undan kamida 5 o‘yinchi shu turda reytingli o‘yin o‘ynagan bo‘lishi kerak."))}</p>`;
    }
    const rows = r?.rows || [];
    return rows.length ? rows.map((p) => `<button class="bt-trow${p.me ? " me" : ""}" data-u="${esc(p.id)}"><span class="bt-tpos ${p.pos <= 3 ? "m" + p.pos : ""}">${p.pos}</span>${avatar(p, 36)}
        <span class="bt-tname"><b>${esc(p.name)}</b><small>${p.uname ? esc(short(p.uname, 34)) + " · " : ""}${lgBadge(p.rating, true)}</small></span>
        <span class="bt-tval">${p.val}</span></button>`).join("")
      : `<p class="small muted bt-empty">${esc(T("Bu turda hali reytingda hech kim yo‘q. Birinchi bo‘ling!"))}</p>`;
  };
  const t10Me = (r, tab) => {
    if (tab === "unis") {
      if (r?.me) return `<span>${esc(T("Universitetingiz: {p}-o‘rin", { p: r.me.pos }))}</span><b>${r.me.score}</b>`;
      if (!r?.my_uni) return `<a href="#/sozlamalar">${esc(T("Profilda universitetingizni tanlang"))}</a>`;
      return `<span>${esc(T("Universitetingiz hali reytingda emas (kamida 5 o‘yinchi kerak)"))}</span>`;
    }
    if (r?.me) return `<span>${esc(T("Siz: {p}-o‘rin", { p: r.me.pos }))}</span><b>${r.me.val}</b>`;
    return `<span>${esc(T("Bu turda reytingda bo‘lish uchun 1 ta reytingli o‘yin o‘ynang"))}</span>`;
  };

  async function pageHome(my) {
    A.setChrome("Test battle", true, "assyst");
    if (!navigator.onLine) return needNet(() => pageHome(seq));
    let h;
    try { h = await rpc("bt_home", { p_lang: lang() }); } catch (e) { if (my === seq) failBox(e, () => pageHome(seq)); return; }
    if (my !== seq) return;
    const me = h.me || {};
    let mid = favMode(me), t10tab = store.get("bt:t10", "all") === "unis" ? "unis" : "all";
    const t10 = {};
    const act = h.active;
    A.view.innerHTML = head("Bilimingizni jonli bellashuvda sinang: duel, xonalar va onlayn reyting.") + `
      ${act ? `<a class="resume bt-resume" href="${BASE}/m/${esc(act.id)}"><span class="play">${ico(I.sword, 22)}</span><span class="resume-txt"><small>${act.status === "lobby" ? "Kutish xonasida turibsiz" : "Davom etayotgan o‘yin"}</small><strong>Qaytish</strong></span></a>` : ""}
      ${modeTabs(me, mid, "btModes")}
      <div id="btMe">${meCard(me, mid)}</div>
      <div class="bt-acts">
        <button class="bt-act main" id="btFind"><span class="bt-ai">${ico(I.sword, 26)}</span><b>Raqib qidirish</b><small>Tasodifiy onlayn raqib bilan duel</small></button>
        <button class="bt-act" id="btInvite"><span class="bt-ai">${ico(I.friend, 24)}</span><b>Do‘stni chorlash</b><small>Duelga taklif yoki havola</small></button>
        <button class="bt-act" id="btRoom"><span class="bt-ai">${ico(I.room, 24)}</span><b>Xona ochish</b><small>2–50 kishi, ochiq yoki yopiq</small></button>
        <button class="bt-act" id="btCode"><span class="bt-ai">${ico(I.key, 24)}</span><b>Kod bilan kirish</b><small>Do‘stingiz yuborgan kod</small></button>
      </div>
      <section class="bt-t10">
        <div class="sec-head"><h3>${ico(I.trophy, 20)} <span id="t10H"></span></h3><a class="bt-lnk" id="t10All" href="${BASE}/reyting">${esc(T("To‘liq reyting"))} ›</a></div>
        <div class="seg flat" id="t10Tab"><button data-t="all">${esc(T("Umumiy top-10"))}</button><button data-t="unis">${esc(T("Universitetlar top-10"))}</button></div>
        <div id="t10List" class="bt-top"><p class="small muted">Yuklanmoqda…</p></div>
        <div class="bt-mebar static" id="t10Me"></div>
      </section>
      <div class="sec-head"><h3>Ochiq xonalar</h3><span class="small muted" id="btOnl">${esc(T("Hozir onlayn: {n}", { n: h.online || 0 }))}</span></div>
      <div id="btRooms" class="bt-rooms">${roomsHTML(h.rooms || [])}</div>
      <div class="sec-head"><h3>Onlayn o‘yinchilar</h3><button class="bt-lnk" id="btAllOn">Barchasi ›</button></div>
      <div id="btOnline" class="bt-online"><p class="small muted">Yuklanmoqda…</p></div>
      <h3 class="group-label">Sozlamalar</h3>
      <div class="settings bt-set">
        <label class="bt-sw"><span><b>Ko‘rinmas rejim</b><small>Onlayn ro‘yxatda ko‘rinmaysiz</small></span><input type="checkbox" id="btInv" ${h.set?.invisible ? "checked" : ""}></label>
        <label class="bt-sw"><span><b>Takliflarni qabul qilmayman</b><small>Hech kim sizni duelga chorlay olmaydi</small></span><input type="checkbox" id="btNoInv" ${h.set?.no_invites ? "checked" : ""}></label>
      </div>
      <details class="bt-rules"><summary>Qoidalar va ball hisobi</summary>
        <ul class="small">
          <li>Uch xil o‘yin turi bor: ⚡ Bullet — 10 yoki 15 savol, 🔥 Blitz — 20 yoki 25 savol, ⏳ Rapid — 30 savol. Har turning o‘z reytingi, ligasi va statistikasi bor, ular bir-biriga qo‘shilmaydi.</li>
          <li>Hamma qatnashchiga bir xil savollar tushadi, lekin savollar va javob variantlari tartibi har kimda har xil.</li>
          <li>Savolda nechta to‘g‘ri javob borligi yozib qo‘yiladi. Vaqt: 1 javobli — 20 s, 2 javobli — 25 s, 3 javobli — 35 s, 4 javobli — 45 s, 5 javobli — 55 s.</li>
          <li>Ball: (to‘g‘ri belgilangan − xato belgilangan) ÷ to‘g‘ri javoblar soni. Masalan, 3 ta to‘g‘ri javobdan 2 tasini topsangiz — 0,67 ball.</li>
          <li>O‘rin avval to‘plangan ball bo‘yicha, ball teng bo‘lsa umumiy sarflangan vaqt bo‘yicha belgilanadi.</li>
          <li>Reyting Elo tizimida, shaxmatdagidek: o‘zingizdan kuchliroq raqibni yutsangiz ko‘p ball olasiz, kuchsizroqni yutsangiz — kam (lekin kamida +1). Kuchsizroq raqibga yutqazsangiz ko‘proq ball yo‘qotasiz. Teng raqiblar o‘rtasida g‘alaba taxminan +12 ball, har turdagi birinchi 20 o‘yinda esa +20 atrofida.</li>
          <li>Hamma 1000 balldan boshlaydi. Yangi turni birinchi marta o‘ynaganda boshlang‘ich reyting eng yaqin o‘ynagan turingizdan olinadi (masalan, Rapid uchun Blitz), keyin turlar alohida hisoblanadi.</li>
          <li>Bir raqib bilan 7 kunda faqat 2 ta o‘yin reytingga qo‘shiladi (barcha turlar birga hisoblanadi); qolganlari reytingsiz o‘ynaladi.</li>
          <li>Ligalar: Abituriyent → Talaba (1200) → Intern (1350) → Ordinator (1500) → Shifokor (1650) → Professor (1800). Liga oshgani sari qiyin va ko‘p javobli savollar ko‘payadi. Yangi ligaga chiqqach, 3 o‘yin davomida undan tushib ketmaysiz.</li>
          <li>Reyting farqi qanchalik katta bo‘lmasin, istalgan o‘yinchini taklif qilishingiz mumkin. Tasodifiy raqib qidirishda esa reytingi yaqin o‘yinchi topiladi.</li>
          <li>Yozishma yo‘q — faqat stikerlar. O‘yindan chiqib ketgan qatnashchi oxirgi o‘ringa tushadi.</li>
        </ul></details>
      <div class="bt-soon">
        <span class="bt-soon-i">${ico(I.gift, 26)}</span>
        <div><b>Rejada (tez orada)</b><small>Mavsumlar va sovg‘alar (oylik reyting yangilanishi), kunlik musobaqa, maxsus musobaqalar (masalan, 50 savollik), guruh va universitetlar jangi. Foydalanuvchilar ko‘paygach qo‘shiladi.</small></div>
      </div>
      ${h.admin ? `<a class="tm-mode tm-small bt-admin" href="${BASE}/savollar"><span class="tm-ico">${ico(I.db, 24)}</span><span><b>Battle savollari banki</b><small>Faqat siz ko‘rasiz: savollar, javoblar, zaxira nusxa</small></span>${A.chev || ""}</a>` : ""}`;
    fillPhotos(A.view);
    const drawT10 = async () => {
      A.$("#t10H").textContent = T("Reyting · {m}", { m: MD(mid).n });
      A.$("#t10All").href = `${BASE}/reyting?m=${mid}&t=${t10tab}&p=all`;
      A.view.querySelectorAll("#t10Tab [data-t]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.t === t10tab)));
      const box = A.$("#t10List"), meb = A.$("#t10Me");
      const paint = () => {
        const r = t10[mid]?.[t10tab];
        box.innerHTML = t10Rows(r, t10tab); meb.innerHTML = t10Me(r, t10tab);
        box.querySelectorAll("[data-u]").forEach((b) => b.addEventListener("click", () => profileSheet(b.dataset.u)));
        fillPhotos(box);
      };
      if (t10[mid]) return paint();
      box.innerHTML = `<p class="small muted">Yuklanmoqda…</p>`; meb.innerHTML = "";
      const want = mid;
      try { t10[want] = await rpc("bt_top10", { p_mode: want, p_lang: lang() }); } catch (e) { if (my === seq && want === mid) box.innerHTML = `<p class="small muted">${esc(errText(e))}</p>`; return; }
      if (my === seq && want === mid) paint();
    };
    A.view.querySelectorAll("#btModes [data-md]").forEach((b) => b.addEventListener("click", () => {
      mid = b.dataset.md; store.set("bt:mode", mid);
      A.view.querySelectorAll("#btModes [data-md]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      A.$("#btMe").innerHTML = meCard(me, mid); fillPhotos(A.$("#btMe"));
      drawT10();
    }));
    A.view.querySelectorAll("#t10Tab [data-t]").forEach((b) => b.addEventListener("click", () => { t10tab = b.dataset.t; store.set("bt:t10", t10tab); drawT10(); }));
    drawT10();
    A.$("#btFind").addEventListener("click", () => scopeSheet("queue", { gm: mid }).then((p) => { if (p) { store.set("bt:q", p); location.hash = BASE + "/qidiruv"; } }));
    A.$("#btInvite").addEventListener("click", () => friendSheet());
    A.$("#btRoom").addEventListener("click", () => scopeSheet("room", { gm: mid }).then((p) => p && createMatch(p)));
    A.$("#btCode").addEventListener("click", codeSheet);
    A.$("#btAllOn").addEventListener("click", () => friendSheet());
    const setT = (id, key) => A.$(id).addEventListener("change", async (e) => {
      try { await rpc("bt_settings", key === "inv" ? { p_invisible: e.target.checked, p_no_invites: null } : { p_invisible: null, p_no_invites: e.target.checked }); A.toast(T("Saqlandi")); }
      catch (er) { e.target.checked = !e.target.checked; fail(er); }
    });
    setT("#btInv", "inv"); setT("#btNoInv", "noinv");
    bindRooms(A.view);
    drawOnline(my);
    every(15000, async () => {
      if (my !== seq || document.hidden) return;
      try {
        const h2 = await rpc("bt_home", { p_lang: lang() });
        if (my !== seq) return;
        const r = A.$("#btRooms"); if (r) { r.innerHTML = roomsHTML(h2.rooms || []); bindRooms(r); fillPhotos(r); }
        const o = A.$("#btOnl"); if (o) o.textContent = T("Hozir onlayn: {n}", { n: h2.online || 0 });
        drawOnline(my);
      } catch { /* */ }
    });
  }
  const roomsHTML = (rooms) => rooms.length ? rooms.map((r) => `
      <button class="bt-room" data-room="${esc(r.id)}">${avatar(r.owner, 40)}
        <span class="bt-room-t"><b>${esc(r.title || T("{n} xonasi", { n: r.owner?.name || "" }))}</b><small>${modeTag(r.mode || modeOf(r.n_q))} ${esc(scopeText(r))} · ${esc(T("{n} ta savol", { n: r.n_q }))}${r.reveal === "end" ? " · " + esc(T("javoblar oxirida")) : ""}</small></span>
        <span class="bt-room-n">${r.n}/${r.cap}</span></button>`).join("")
    : `<p class="small muted bt-empty">Hozircha ochiq xona yo‘q. Birinchi bo‘lib oching!</p>`;
  function bindRooms(root) {
    root.querySelectorAll("[data-room]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try { const r = await rpc("bt_join", { p_id: b.dataset.room, p_code: null }); location.hash = BASE + "/m/" + r.id; }
      catch (e) { b.disabled = false; fail(e); }
    }));
  }
  async function drawOnline(my) {
    const box = A.$("#btOnline"); if (!box) return;
    let r; try { r = await rpc("bt_online", { p_q: null, p_lang: lang() }); } catch { box.innerHTML = `<p class="small muted">Ro‘yxat yuklanmadi.</p>`; return; }
    if (my !== seq || !A.$("#btOnline")) return;
    const rows = (r.rows || []).slice(0, 14);
    box.innerHTML = rows.length ? rows.map((p) => `<button class="bt-onp" data-prof="${esc(p.id)}">${avatar(p, 50, p.busy ? "busy" : "on")}<small>${esc(short(p.name, 12))}</small></button>`).join("")
      : `<p class="small muted bt-empty">Hozir boshqa onlayn o‘yinchi yo‘q. Do‘stingizga havola yuborib chorlang.</p>`;
    box.querySelectorAll("[data-prof]").forEach((b) => b.addEventListener("click", () => profileSheet(b.dataset.prof)));
    fillPhotos(box);
  }

  /* ---------- Tanlov varag'i: kurs → fan → mavzu → savollar soni (+ xona sozlamalari) ---------- */
  const store = { get: (k, d) => A.store.get(k, d), set: (k, v) => A.store.set(k, v) };
  async function scopeSheet(mode, extra = {}) {
    let cat;
    try { cat = await catalog(); } catch (e) { fail(e); return null; }
    if (!cat.length) { A.toast(T("Battle uchun savollar hali yuklanmagan. Tez orada qo‘shiladi.")); return null; }
    const last = store.get("bt:scope", {});
    const counts = (c) => cat.filter((s) => String(s.course) === c).reduce((n, s) => n + s.n, 0);
    let course = COURSES.includes(String(last.course)) && counts(String(last.course)) ? String(last.course) : (COURSES.find((c) => counts(c)) || "2");
    let subject = last.subject || "", topic = last.topic || "";
    const gm0 = extra.gm || store.get("bt:mode", "");
    let gm = MODES.some((m) => m.id === gm0) ? gm0 : modeOf(SIZES.includes(last.n_q) ? last.n_q : 20);
    let nq = MD(gm).sizes.includes(last.n_q) ? last.n_q : MD(gm).sizes[0];
    const title = mode === "queue" ? "Raqib qidirish" : mode === "room" ? "Xona ochish" : "Duelga chorlash";
    return new Promise((resolve) => {
      let done = false;
      const sh = A.sheet(`<h3>${esc(T(title))}</h3>
        ${extra.who ? `<div class="bt-who">${avatar(extra.who, 36)}<span><b>${esc(extra.who.name)}</b><small>${esc(extra.who.uname || "")}</small></span></div>` : ""}
        <div class="bt-form">
          <div class="field"><span>Kurs</span><div class="seg flat" id="scC">${COURSES.map((c) => `<button data-c="${c}" ${counts(c) ? "" : "disabled"}>${esc(T("{c}-kurs", { c }))}</button>`).join("")}</div></div>
          <label class="field">Fan<select id="scS"></select></label>
          <label class="field" id="scTB">Mavzu<select id="scT"></select></label>
          <div class="field"><span>O‘yin turi</span><div class="seg flat bt-gm" id="scM">${MODES.map((m) => `<button data-m="${m.id}">${m.e} ${m.n}</button>`).join("")}</div></div>
          <div class="field"><span>Savollar soni</span><div class="seg flat" id="scN"></div></div>
          ${mode === "room" ? `
          <div class="field"><span>Xona turi</span><div class="seg flat" id="scV"><button data-v="open">Ochiq (hamma ko‘radi)</button><button data-v="closed">Yopiq (kod bilan)</button></div></div>
          <div class="row2">
            <label class="field">Sig‘im (2–50)<input id="scCap" type="number" min="2" max="50" value="${Number(last.cap) || 20}" inputmode="numeric"></label>
            <label class="field">Qiyinlik<select id="scD"><option value="auto">Avto (liga bo‘yicha)</option><option value="1">Oson</option><option value="2">O‘rta</option><option value="3">Qiyin</option><option value="mix">Aralash</option></select></label>
          </div>
          <div class="field"><span>To‘g‘ri javobni ko‘rsatish</span><div class="seg flat" id="scR"><button data-r="instant">Darhol (javobdan keyin)</button><button data-r="end">O‘yin oxirida</button></div></div>
          <label class="field">Xona nomi (ixtiyoriy)<input id="scTitle" maxlength="60" placeholder="${esc(T("masalan, 312b guruhi"))}" value="${esc(last.title || "")}" autocomplete="off"></label>` : ""}
          <p class="small muted" id="scInfo" style="margin:4px 0 0"></p>
        </div>
        <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="scGo">${esc(T(mode === "queue" ? "Qidirishni boshlash" : mode === "room" ? "Xona ochish" : "Taklif yuborish"))}</button></div>`);
      const q = (s) => sh.el.querySelector(s);
      let vis = last.vis === "open" ? "open" : "closed", rev = last.reveal === "end" ? "end" : "instant";
      if (mode === "room") { q("#scD").value = ["auto", "1", "2", "3", "mix"].includes(last.diff) ? last.diff : "auto"; }
      const pool = () => {
        const subs = cat.filter((s) => String(s.course) === course);
        if (!subject) return subs.reduce((n, s) => n + s.n, 0);
        const s = subs.find((x) => x.id === subject); if (!s) return 0;
        if (!topic) return s.n;
        return (s.topics.find((t) => t.id === topic) || {}).n || 0;
      };
      const draw = () => {
        sh.el.querySelectorAll("#scC [data-c]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.c === course)));
        const subs = cat.filter((s) => String(s.course) === course);
        if (subject && !subs.find((s) => s.id === subject)) { subject = ""; topic = ""; }
        q("#scS").innerHTML = `<option value="">${esc(T("Barcha fanlar ({n} ta savol)", { n: subs.reduce((n, s) => n + s.n, 0) }))}</option>` +
          subs.map((s) => `<option value="${esc(s.id)}"${s.id === subject ? " selected" : ""}>${esc(s.name)} (${s.n})</option>`).join("");
        const sub = subs.find((s) => s.id === subject);
        q("#scTB").hidden = !sub;
        if (sub && topic && !sub.topics.find((t) => t.id === topic)) topic = "";
        q("#scT").innerHTML = sub ? `<option value="">${esc(T("Barcha mavzular"))}</option>` + sub.topics.map((t) => `<option value="${esc(t.id)}"${t.id === topic ? " selected" : ""}>${esc(short(t.name, 70))} (${t.n})</option>`).join("") : "";
        const have = pool(), sizes = MD(gm).sizes;
        if (!sizes.includes(nq)) nq = sizes[0];
        if (nq > have) nq = sizes.filter((n) => n <= have).pop() || sizes[0];
        sh.el.querySelectorAll("#scM [data-m]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.m === gm)));
        q("#scN").innerHTML = sizes.map((n) => `<button data-n="${n}" ${n > have ? "disabled" : ""} aria-selected="${n === nq}">${esc(T("{n} ta savol", { n }))}</button>`).join("");
        q("#scN").querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => { nq = Number(b.dataset.n); draw(); }));
        if (mode === "room") {
          sh.el.querySelectorAll("#scV [data-v]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === vis)));
          sh.el.querySelectorAll("#scR [data-r]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.r === rev)));
        }
        q("#scGo").disabled = nq > have;
        q("#scInfo").textContent = nq > have ? T("{m} uchun bu tanlovda savollar yetarli emas ({n} ta bor). Boshqa tur, kengroq fan yoki mavzu tanlang.", { m: MD(gm).n, n: have })
          : T("{m} reytingiga hisoblanadi. Savollar ilova tilida: {l}. Bu tanlovda {n} ta savol bor.", { m: MD(gm).n, l: lang() === "en" ? "English" : "O‘zbekcha", n: have });
      };
      sh.el.querySelectorAll("#scC [data-c]").forEach((b) => b.addEventListener("click", () => { course = b.dataset.c; subject = ""; topic = ""; draw(); }));
      q("#scS").addEventListener("change", (e) => { subject = e.target.value; topic = ""; draw(); });
      q("#scT").addEventListener("change", (e) => { topic = e.target.value; draw(); });
      sh.el.querySelectorAll("#scM [data-m]").forEach((b) => b.addEventListener("click", () => { gm = b.dataset.m; nq = MD(gm).sizes[0]; draw(); }));
      if (mode === "room") {
        sh.el.querySelectorAll("#scV [data-v]").forEach((b) => b.addEventListener("click", () => { vis = b.dataset.v; draw(); }));
        sh.el.querySelectorAll("#scR [data-r]").forEach((b) => b.addEventListener("click", () => { rev = b.dataset.r; draw(); }));
      }
      draw();
      const obs = new MutationObserver(() => { if (!document.body.contains(sh.el) && !done) { done = true; obs.disconnect(); resolve(null); } });
      obs.observe(document.body, { childList: true });
      q("#scGo").addEventListener("click", () => {
        const p = { lang: lang(), course: Number(course), subject: subject || null, topic: topic || null, n_q: nq };
        if (mode === "room") {
          const cap = Math.max(2, Math.min(50, Number(q("#scCap").value) || 20));
          Object.assign(p, { kind: "room", vis, cap, reveal: rev, diff: q("#scD").value, title: q("#scTitle").value.trim() || null });
        } else if (mode === "duel") Object.assign(p, { kind: "duel", invitee: extra.who?.id || null });
        store.set("bt:scope", { ...last, ...p, invitee: undefined });
        store.set("bt:mode", gm);
        done = true; obs.disconnect(); sh.close(); resolve(p);
      });
    });
  }
  async function createMatch(p) {
    try { const r = await rpc("bt_create", { p }); location.hash = BASE + "/m/" + r.id; }
    catch (e) { fail(e); }
  }

  /* ---------- Kod bilan kirish ---------- */
  function codeSheet() {
    const sh = A.sheet(`<h3>Kod bilan kirish</h3><p class="small muted" style="margin:0">Do‘stingiz yuborgan 6 belgili kodni yozing.</p>
      <label class="field">Kod<input id="cdIn" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"></label>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="cdGo">Kirish</button></div>`);
    const inp = sh.el.querySelector("#cdIn"); setTimeout(() => inp.focus(), 50);
    const go = async () => {
      const c = inp.value.trim().toUpperCase();
      if (c.length < 6) { A.toast(T("Kod 6 belgidan iborat")); return; }
      try { const r = await rpc("bt_join", { p_id: null, p_code: c }); sh.close(); location.hash = BASE + "/m/" + r.id; } catch (e) { fail(e); }
    };
    sh.el.querySelector("#cdGo").addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  /* ---------- Do'stni chorlash: onlayn ro'yxat va ism bo'yicha qidiruv ---------- */
  function friendSheet() {
    const sh = A.sheet(`<h3>Do‘stni chorlash</h3>
      <label class="bt-search">${ico(I.search, 18)}<input id="frQ" placeholder="${esc(T("Ism bo‘yicha qidirish"))}" autocomplete="off"></label>
      <button class="btn bt-linkbtn" id="frLink">${ico(I.share, 18)} Havola orqali chorlash</button>
      <div id="frList" class="bt-flist"><p class="small muted">Yuklanmoqda…</p></div>`);
    const box = sh.el.querySelector("#frList");
    let t = null, n = 0;
    const load = async (qv) => {
      const my = ++n;
      let r; try { r = await rpc("bt_online", { p_q: qv || null, p_lang: lang() }); } catch (e) { box.innerHTML = `<p class="small muted">${esc(errText(e))}</p>`; return; }
      if (my !== n) return;
      const rows = r.rows || [];
      box.innerHTML = rows.length ? rows.map((p) => `<div class="bt-frow">${avatar(p, 42, p.online ? (p.busy ? "busy" : "on") : "")}
          <span class="bt-frow-t"><b>${esc(p.name)}</b><small>${esc(p.uname || "")}${p.uname ? " · " : ""}${p.rating} · ${esc(T(LEAGUES[p.lg].n))}${p.online ? "" : " · " + esc(T("oflayn"))}${p.busy ? " · " + esc(T("o‘yinda")) : ""}</small></span>
          <button class="btn" data-pr="${esc(p.id)}" aria-label="${esc(T("Profil"))}">ⓘ</button>
          <button class="btn primary" data-inv="${esc(p.id)}" ${p.no_inv ? "disabled" : ""}>${esc(T("Chorlash"))}</button></div>`).join("")
        : `<p class="small muted bt-empty">${esc(qv ? T("Hech kim topilmadi") : T("Hozir boshqa onlayn o‘yinchi yo‘q. Ism bo‘yicha qidiring yoki havola yuboring."))}</p>`;
      box.querySelectorAll("[data-inv]").forEach((b) => b.addEventListener("click", () => { const p = rows.find((x) => x.id === b.dataset.inv); sh.close(); inviteFlow(p); }));
      box.querySelectorAll("[data-pr]").forEach((b) => b.addEventListener("click", () => { sh.close(); profileSheet(b.dataset.pr); }));
      fillPhotos(box);
    };
    sh.el.querySelector("#frQ").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => load(e.target.value.trim()), 350); });
    sh.el.querySelector("#frLink").addEventListener("click", async () => { sh.close(); const p = await scopeSheet("duel"); if (p) createMatch(p); });
    load("");
  }
  async function inviteFlow(p) {
    if (!p) return;
    const sc = await scopeSheet("duel", { who: p });
    if (sc) createMatch(sc);
  }

  /* ---------- O'yinchi kartochkasi ---------- */
  async function profileSheet(uid) {
    let p; try { p = await rpc("bt_profile", { p_user: uid, p_lang: lang() }); } catch (e) { fail(e); return; }
    const ms = p.modes || {};
    const sh = A.sheet(`<div class="bt-prof" style="--lc:${LEAGUES[p.lg].c}">${avatar(p, 76)}
        <h3>${esc(p.name)}${p.online ? ` <i class="bt-dot" title="${esc(T("onlayn"))}"></i>` : ""}</h3>
        <p class="small muted" style="margin:0">${esc(p.uname || T("Universitet tanlanmagan"))}</p>
        <div class="bt-pmodes">${MODES.map((m) => { const x = ms[m.id] || { rating: 1000 }; const d = (x.wins || 0) + (x.losses || 0) + (x.draws || 0); return `
          <div class="bt-pmode m-${m.id}"><div class="bt-pmh"><b>${m.e} ${m.n}</b>${x.rg ? lgBadge(x.rating, true) : ""}<span class="bt-pmr">${x.rg ? x.rating : "—"}</span></div>
            <small>${x.rg ? esc(T("{o} · eng yuqori {pk} · {w}G {l}M {d}D · {pc}", { o: x.rank ? T("#{r} o‘rin", { r: x.rank }) : "—", pk: x.peak, w: x.wins || 0, l: x.losses || 0, d: x.draws || 0, pc: d ? pct(x.wins || 0, d) + "%" : "—" })) : esc(T("Bu turda hali reytingli o‘yin yo‘q"))}</small>
            ${x.room_games ? `<small>${esc(T("Xonalarda: {g} ta o‘yin, {w} marta 1-o‘rin, {p} marta sovrinli o‘rin", { g: x.room_games, w: x.room_wins, p: x.room_podiums }))}</small>` : ""}</div>`; }).join("")}</div>
      </div>
      ${p.me ? `<div class="acts"><button class="btn" data-x="close">Yopish</button></div>` : `<div class="acts">
        <button class="btn primary" id="pfDuel" ${p.no_inv || p.blocked ? "disabled" : ""}>${ico(I.sword, 18)} Duelga chorlash</button>
        <button class="btn" id="pfBlock">${ico(I.ban, 18)} ${esc(T(p.blocked ? "Blokdan chiqarish" : "Bloklash"))}</button>
        <button class="btn danger" id="pfRep">${ico(I.flag, 18)} Shikoyat</button></div>
        ${p.no_inv ? `<p class="small muted" style="margin:8px 0 0">Bu foydalanuvchi takliflarni qabul qilmaydi.</p>` : ""}`}`);
    fillPhotos(sh.el);
    sh.el.querySelector("#pfDuel")?.addEventListener("click", () => { sh.close(); inviteFlow(p); });
    sh.el.querySelector("#pfBlock")?.addEventListener("click", async () => {
      try { await rpc("bt_block", { p_user: uid, p_on: !p.blocked }); A.toast(T(p.blocked ? "Blokdan chiqarildi" : "Bloklandi: endi u sizni chorlay olmaydi")); sh.close(); } catch (e) { fail(e); }
    });
    sh.el.querySelector("#pfRep")?.addEventListener("click", () => { sh.close(); reportSheet(uid); });
  }
  function reportSheet(uid) {
    const sh = A.sheet(`<h3>Shikoyat</h3><p class="small muted" style="margin:0">Shikoyat ilova administratoriga yuboriladi.</p>
      <label class="field">Sabab<textarea id="rpT" rows="3" maxlength="400" style="font:inherit;border:1.5px solid var(--line);border-radius:12px;padding:10px;background:var(--bg);color:var(--ink)" placeholder="${esc(T("Nima bo‘ldi?"))}"></textarea></label>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="rpGo">Yuborish</button></div>`);
    sh.el.querySelector("#rpGo").addEventListener("click", async () => {
      const t = sh.el.querySelector("#rpT").value.trim();
      if (t.length < 3) { A.toast(T("Sababni yozing")); return; }
      try {
        const c = await ctx();
        const { error } = await c.sb.from("reports").insert({ reporter: c.user.id, target: uid, reason: ("[Test battle] " + t).slice(0, 400) });
        if (error) throw error;
        sh.close(); A.toast(T("Shikoyat yuborildi. Rahmat!"));
      } catch { A.toast(T("Yuborib bo‘lmadi. Qayta urinib ko‘ring")); }
    });
  }

  /* ---------- Tasodifiy raqib qidirish ---------- */
  async function pageQueue(my) {
    A.setChrome("Raqib qidirish", true, "assyst");
    const p = store.get("bt:q", null);
    if (!p) { location.replace(BASE); return; }
    if (!navigator.onLine) return needNet(() => pageQueue(seq));
    let r;
    try { r = await rpc("bt_queue_join", { p }); } catch (e) { if (my !== seq) return; if (e.code === "busy" && e.arg) { location.replace(BASE + "/m/" + e.arg); return; } failBox(e, () => pageQueue(seq)); return; }
    if (my !== seq) return;
    if (r.match) { location.replace(BASE + "/m/" + r.match); return; }
    const t0 = Date.now();
    A.view.innerHTML = `<div class="bt-search-scr">
        <div class="bt-radar"><i></i><i></i><i></i><span>${ico(I.sword, 34)}</span></div>
        <h2>Raqib qidirilmoqda…</h2>
        <p class="muted">${modeTag(modeOf(p.n_q))} ${esc(scopeText({ course: p.course, sname: findName(p.subject), tname: findTopic(p.subject, p.topic) }))} · ${esc(T("{n} ta savol", { n: p.n_q }))}</p>
        <p class="bt-timer-big" id="qT">0:00</p>
        <p class="small muted" id="qO">Reytingi sizga yaqin onlayn o‘yinchi qidirilmoqda. Kutish uzaysa, qidiruv doirasi kengayadi.</p>
        <div id="qHint" hidden class="bt-hint">Hozir qidirayotganlar kam. Do‘stingizni havola orqali chorlashingiz mumkin.
          <button class="btn" id="qInv">${ico(I.friend, 18)} Do‘stni chorlash</button></div>
        <button class="btn" id="qStop">${ico(I.x, 18)} Bekor qilish</button></div>`;
    let stopped = false;
    const stop = async () => { if (stopped) return; stopped = true; try { await rpc("bt_queue_leave"); } catch { /* */ } };
    later(() => { if (!location.hash.startsWith(BASE + "/m/")) stop(); });
    A.$("#qStop").addEventListener("click", async () => { await stop(); location.hash = BASE; });
    A.$("#qInv").addEventListener("click", async () => { await stop(); location.hash = BASE; setTimeout(friendSheet, 300); });
    every(1000, () => { const s = Math.floor((Date.now() - t0) / 1000); const el = A.$("#qT"); if (el) el.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); if (s >= 45) A.$("#qHint") && (A.$("#qHint").hidden = false); });
    let busy = false;
    every(2000, async () => {
      if (busy || stopped || my !== seq) return; busy = true;
      try {
        const x = await rpc("bt_queue_poll");
        if (my !== seq) return;
        if (x.match) { stopped = true; vib([60, 40, 60]); location.replace(BASE + "/m/" + x.match); return; }
        if (x.gone) { stopped = true; if (x.active?.id) location.replace(BASE + "/m/" + x.active.id); else { A.toast(T("Qidiruv to‘xtatildi")); location.replace(BASE); } return; }
        const o = A.$("#qO"); if (o && x.others) o.textContent = T("Hozir yana {n} kishi raqib qidirmoqda.", { n: x.others });
      } catch { /* tarmoq uzilsa — keyingi urinish */ } finally { busy = false; }
    });
  }
  const findName = (sid) => (catCache || []).find((s) => s.id === sid)?.name || null;
  const findTopic = (sid, tid) => (catCache || []).find((s) => s.id === sid)?.topics.find((t) => t.id === tid)?.name || null;

  /* ---------- O'yin sahifasi: lobbi → hisob → savollar → kutish → natija ---------- */
  let G = null;   // joriy o'yin holati
  async function pageMatch(id, my) {
    A.setChrome("Test battle", true, "assyst");
    if (!navigator.onLine) return needNet(() => pageMatch(id, seq));
    G = { id, my, st: null, q: null, sel: [], res: null, phase: "", lastPos: -1, chan: null, answering: false, revealT: null };
    let st;
    try { st = await rpc("bt_state", { p_id: id, p_lang: lang() }); } catch (e) { if (my === seq) failBox(e, () => pageMatch(id, seq)); return; }
    if (my !== seq) return;
    if (!st.in && st.status === "lobby" && (st.vis === "open" || st.invitee?.id)) {
      try { await rpc("bt_join", { p_id: id, p_code: null }); st = await rpc("bt_state", { p_id: id, p_lang: lang() }); } catch (e) { fail(e); }
    }
    G.st = st;
    openChannel(id);
    try { const wl = await navigator.wakeLock?.request?.("screen"); if (wl) later(() => wl.release().catch(() => {})); } catch { /* */ }
    await render();
    let polling = false;
    every(2500, async () => {
      if (my !== seq || polling || document.hidden) return;
      if (G.st?.status === "done" || G.st?.status === "cancelled") return;
      polling = true;
      try { await refreshState(); } finally { polling = false; }
    });
    later(() => { G = null; });
  }
  async function refreshState() {
    if (!G) return;
    const my = G.my;
    let st; try { st = await rpc("bt_state", { p_id: G.id, p_lang: lang() }); } catch { return; }
    if (!G || my !== seq) return;
    const prev = G.st?.status, prevPh = phaseOf(G.st);
    G.st = st;
    if (st.status !== prev || phaseOf(st) !== prevPh) await render();
    else if (st.status === "lobby") { if (lobbySig(st) !== G.lobbySig) drawLobby(); }
    else drawBoard();
  }
  let pingT = null;
  const pokeSoon = () => { clearTimeout(pingT); pingT = setTimeout(() => refreshState(), 500); };
  async function openChannel(id) {
    try {
      const c = await ctx();
      const ch = c.sb.channel("bt:" + id, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "st" }, ({ payload }) => showSticker(payload?.u, payload?.s))
        .on("broadcast", { event: "up" }, () => pokeSoon())
        .subscribe();
      G && (G.chan = ch);
      later(() => { try { c.sb.removeChannel(ch); } catch { /* */ } });
    } catch { /* stikerlarsiz ham ishlaydi */ }
  }
  const send = (event, payload) => { try { G?.chan?.send({ type: "broadcast", event, payload }); } catch { /* */ } };
  const meP = () => (G?.st?.parts || []).find((p) => p.me) || {};
  const phaseOf = (st) => !st ? "" : st.status !== "live" ? st.status : ((st.parts || []).find((p) => p.me)?.done ? "wait" : "play");

  async function render() {
    if (!G) return;
    const st = G.st;
    stopRevealTimer();
    if (st.status === "lobby") return drawLobby();
    if (st.status === "cancelled") return drawCancelled();
    if (st.status === "done") return drawResults();
    if (!st.in) return drawSpectator();
    if (meP().done) return drawWaiting();
    return playLoop();
  }

  /* Lobbi (kutish xonasi) */
  const lobbySig = (st) => (st.parts || []).map((p) => p.id + (p.owner ? "*" : "")).join(",") + "|" + st.owner;
  function drawLobby() {
    const st = G.st, parts = st.parts || [];
    G.lobbySig = lobbySig(st);
    if (G.lobbyT) { clearInterval(G.lobbyT); G.lobbyT = null; }
    const waitingInvite = st.kind === "duel" && st.invitee && parts.length < 2;
    const leftS = waitingInvite ? Math.max(0, 90 - Math.round((new Date(st.now) - new Date(st.created_at)) / 1000)) : 0;
    A.setChrome(st.kind === "duel" ? "Duel" : "Xona", true, "assyst");
    A.view.innerHTML = `<div class="bt-lobby">
      <div class="bt-mhead"><b>${esc(st.title || (st.kind === "duel" ? T("Duel") : T("Battle xonasi")))}</b>
        <small>${modeTag(st.mode || modeOf(st.n_q))} ${esc(scopeText(st))} · ${esc(T("{n} ta savol", { n: st.n_q }))}${st.kind === "room" ? " · " + esc(T(st.vis === "open" ? "ochiq xona" : "yopiq xona")) : ""}${st.reveal === "end" ? " · " + esc(T("javoblar oxirida")) : ""}</small></div>
      ${waitingInvite ? `<div class="bt-waitinv">${avatar(st.invitee, 64)}<p><b>${esc(st.invitee.name)}</b> ${esc(T("javobini kutyapmiz…"))}</p><p class="bt-timer-big" id="lbInv">${leftS}</p><p class="small muted">Taklif 90 soniya amal qiladi.</p></div>` : ""}
      ${st.code && !(waitingInvite) ? `<div class="bt-code"><small>Kirish kodi</small><b>${esc(st.code)}</b>
        <div class="bt-code-acts"><button class="btn" id="lbCopy">${ico(I.copy, 18)} Nusxalash</button><button class="btn" id="lbShare">${ico(I.share, 18)} Ulashish</button><a class="btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(link(st.code))}&text=${encodeURIComponent(T("ALVORA Med: Test battle’ga qo‘shiling! Kod: {c}", { c: st.code }))}">Telegram</a></div></div>` : ""}
      <div class="sec-head"><h3>${esc(T("Qatnashchilar: {n}/{c}", { n: parts.length, c: st.cap }))}</h3></div>
      <div class="bt-pgrid">${parts.map((p) => `<div class="bt-pcard" data-u="${esc(p.id)}">${avatar(p, 56)}${p.owner ? `<span class="bt-crown">${ico(I.crown, 14)}</span>` : ""}
        <b>${esc(short(p.name, 16))}</b><small>${p.rating} · ${esc(T(LEAGUES[p.lg].n))}</small>
        ${st.is_owner && !p.me && st.kind === "room" ? `<button class="bt-kick" data-kick="${esc(p.id)}" aria-label="${esc(T("Xonadan chiqarish"))}">${ico(I.x, 14)}</button>` : ""}</div>`).join("")}</div>
      ${stickerBar()}
      <div class="bt-lacts">
        ${st.is_owner && st.kind === "room" ? `<button class="btn primary" id="lbStart" ${parts.length < 2 ? "disabled" : ""}>${esc(T(parts.length < 2 ? "Kamida 2 kishi kerak" : "Boshlash"))}</button>` : ""}
        ${!st.is_owner && st.kind === "room" ? `<p class="small muted" style="margin:0;flex-basis:100%;text-align:center">Xona egasi boshlashini kuting…</p>` : ""}
        ${st.kind === "duel" && !waitingInvite ? `<p class="small muted" style="margin:0;flex-basis:100%;text-align:center">Ikkinchi o‘yinchi kirishi bilan duel avtomatik boshlanadi.</p>` : ""}
        <button class="btn" id="lbLeave">${ico(I.leave, 18)} ${esc(T(st.is_owner && st.kind === "duel" ? "Bekor qilish" : "Chiqish"))}</button></div>
      <p class="small muted bt-note">Yozishma yo‘q — faqat stikerlar. Hammaga bir xil savollar, lekin har kimda boshqa tartibda tushadi.</p></div>`;
    fillPhotos(A.view);
    bindStickers();
    A.$("#lbCopy")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(link(st.code)); A.toast(T("Havola nusxalandi")); } catch { A.toast(st.code); } });
    A.$("#lbShare")?.addEventListener("click", async () => {
      const text = T("ALVORA Med: Test battle’ga qo‘shiling! Kod: {c}", { c: st.code });
      try { if (navigator.share) await navigator.share({ title: "ALVORA Med · Test battle", text, url: link(st.code) }); else { await navigator.clipboard.writeText(text + " " + link(st.code)); A.toast(T("Havola nusxalandi")); } } catch { /* */ }
    });
    A.$("#lbStart")?.addEventListener("click", async (e) => { e.target.disabled = true; try { await rpc("bt_start", { p_id: G.id }); send("up", {}); await refreshState(); } catch (er) { e.target.disabled = false; fail(er); } });
    A.$("#lbLeave").addEventListener("click", async () => { try { await rpc("bt_leave", { p_id: G.id }); send("up", {}); } catch { /* */ } location.hash = BASE; });
    A.view.querySelectorAll("[data-kick]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(T("Bu qatnashchi xonadan chiqarilsinmi?"))) return;
      try { await rpc("bt_kick", { p_id: G.id, p_user: b.dataset.kick }); send("up", {}); refreshState(); } catch (e) { fail(e); }
    }));
    if (waitingInvite) {
      const t0 = Date.now();
      G.lobbyT = every(1000, () => { const el = A.$("#lbInv"); if (el) el.textContent = Math.max(0, leftS - Math.floor((Date.now() - t0) / 1000)); });
    }
  }
  function drawCancelled() {
    const st = G.st;
    const why = st.reason === "declined" ? "Taklif rad etildi." : st.reason === "expired" ? "Taklif yoki xona muddati tugadi." : "O‘yin bekor qilindi.";
    A.view.innerHTML = head("") + A.emptyState(I.sword, why, "Boshqa raqib bilan o‘ynab ko‘ring.", `<a class="btn primary" href="${BASE}">Battle bosh sahifasi</a>`);
  }
  function drawSpectator() {
    A.view.innerHTML = head("") + A.emptyState(I.sword, "O‘yin boshlangan", "Bu o‘yinga endi qo‘shilib bo‘lmaydi.", `<a class="btn primary" href="${BASE}">Battle bosh sahifasi</a>`);
  }

  /* Savollar */
  let tick = null;
  const stopTick = () => { if (tick) { clearInterval(tick); tick = null; } };
  later(stopTick);
  function stopRevealTimer() { if (G?.revealT) { clearInterval(G.revealT); G.revealT = null; } }
  async function playLoop() {
    if (!G) return;
    const my = G.my;
    let q; try { q = await rpc("bt_q", { p_id: G.id }); } catch (e) { if (e.code === "notin") return drawSpectator(); A.toast(errText(e)); setTimeout(() => G && my === seq && playLoop(), 2500); return; }
    if (!G || my !== seq) return;
    if (q.done) { await refreshState(); return drawWaitingOrResults(); }
    if (q.wait_ms) return countdown(q.wait_ms);
    G.q = q; G.sel = []; G.res = null; G.answering = false; G.shownAt = Date.now() - (q.lim * 1000 - q.left_ms);
    drawQuestion();
  }
  const drawWaitingOrResults = () => (G.st?.status === "done" ? drawResults() : drawWaiting());
  function countdown(ms) {
    stopTick();
    const end = Date.now() + ms;
    A.view.innerHTML = `<div class="bt-count"><p class="muted">O‘yin boshlanmoqda</p><b id="cdN">${Math.ceil(ms / 1000)}</b><p class="small muted">${modeTag(G.st.mode || modeOf(G.st.n_q))} ${esc(scopeText(G.st))} · ${esc(T("{n} ta savol", { n: G.st.n_q }))}</p></div>`;
    tick = setInterval(() => {
      const left = end - Date.now(), el = A.$("#cdN");
      if (el) el.textContent = Math.max(1, Math.ceil(left / 1000));
      if (left <= 0) { stopTick(); vib(80); playLoop(); }
    }, 200);
  }
  function drawQuestion() {
    stopTick();
    const q = G.q, multi = q.na > 1;
    const leftMs = () => Math.max(0, q.lim * 1000 - (Date.now() - G.shownAt));
    A.view.innerHTML = `<div class="bt-play">
      <div class="bt-ptop"><span class="bt-pos">${q.pos + 1} / ${q.n}</span>
        ${q.score != null ? `<span class="bt-myscore">${esc(T("{s} ball", { s: num(q.score) }))}</span>` : ""}
        ${A.fsHTML()}<span class="bt-tm" id="qTm">${Math.ceil(leftMs() / 1000)}</span></div>
      <div class="bt-tbar"><i id="qBar" style="width:100%"></i></div>
      <div class="quiz-card tm-card bt-card" data-notr>
        <p class="tm-qn">${q.demo ? `<span class="bt-demo">DEMO</span> ` : ""}${esc(short(q.topic || q.sub || "", 80))}</p>
        <p class="quiz-q">${A.inline(q.q)}</p>
        <p class="bt-na ${multi ? "multi" : ""}"><span>${esc(T(multi ? "{n} ta to‘g‘ri javobni tanlang" : "1 ta to‘g‘ri javobni tanlang", { n: q.na }))}</span>${multi ? ` <b id="qCnt">0/${q.na}</b>` : ""}</p>
        <div class="tm-opts" id="qOpts">${q.opts.map((o, j) => `<div class="tm-orow"><button class="tm-opt" data-o="${j}"><span class="tm-l">${LET[j]}</span><span class="tm-ot">${A.inline(o)}</span></button></div>`).join("")}</div>
        <div id="qFoot">${multi ? `<div class="tm-nav"><button class="btn primary" id="qSend" disabled>${esc(T("Javob berish"))}</button></div>` : ""}</div>
      </div>
      <div class="bt-board" id="btBoard"></div>
      ${stickerBar()}</div>`;
    drawBoard(); bindStickers(); A.fsBind(A.view);
    const optEls = [...A.view.querySelectorAll(".tm-opt")];
    const paint = () => {
      optEls.forEach((b) => { const on = G.sel.includes(Number(b.dataset.o)); b.classList.toggle("picked", on); b.setAttribute("aria-pressed", String(on)); });
      const c = A.$("#qCnt"); if (c) c.textContent = G.sel.length + "/" + q.na;
      const s = A.$("#qSend"); if (s) s.disabled = !G.sel.length;
    };
    optEls.forEach((b) => b.addEventListener("click", () => {
      if (G.answering || G.res) return;
      const o = Number(b.dataset.o);
      if (!multi) { G.sel = [o]; paint(); submit(); return; }
      if (G.sel.includes(o)) G.sel = G.sel.filter((x) => x !== o);
      else if (G.sel.length < q.na) G.sel = [...G.sel, o];
      else { G.sel = [...G.sel.slice(1), o]; }
      paint();
    }));
    A.$("#qSend")?.addEventListener("click", submit);
    const bar = A.$("#qBar"), tm = A.$("#qTm");
    tick = setInterval(() => {
      const l = leftMs();
      if (bar) bar.style.width = (l / (q.lim * 10)) + "%";
      if (tm) { tm.textContent = Math.ceil(l / 1000); tm.classList.toggle("low", l <= 5000); }
      if (l <= 0) { stopTick(); if (!G.res && !G.answering) { A.toast(T("Vaqt tugadi")); submit(); } }
    }, 200);
  }
  async function submit() {
    if (!G || G.answering || G.res) return;
    G.answering = true; stopTick();
    A.view.querySelectorAll(".tm-opt").forEach((b) => (b.disabled = true));
    const s = A.$("#qSend"); if (s) s.disabled = true;
    const my = G.my;
    let r;
    try { r = await rpc("bt_answer", { p_id: G.id, p_pos: G.q.pos, p_pick: G.sel }); }
    catch (e) {
      if (!G || my !== seq) return;
      G.answering = false;
      if (e.code === "stale") { playLoop(); return; }
      A.toast(errText(e)); setTimeout(() => G && my === seq && playLoop(), 1500); return;
    }
    if (!G || my !== seq) return;
    G.res = r; G.answering = false;
    send("up", {});
    if (r.done) { const mp = meP(); mp.done = true; }
    if (r.correct) {
      vib(r.ok ? 40 : [30, 60, 30]);
      A.view.querySelectorAll(".tm-opt").forEach((b) => {
        const o = Number(b.dataset.o);
        if (r.correct.includes(o)) b.classList.add("right"); else if (G.sel.includes(o)) b.classList.add("wrong");
        b.classList.remove("picked");
      });
      const ms = A.view.querySelector(".bt-myscore"); if (ms) ms.textContent = T("{s} ball", { s: num(r.total) });
      const foot = A.$("#qFoot");
      const gain = Number(r.score);
      foot.innerHTML = `<div class="explain tm-fb ${r.ok ? "ok" : gain > 0 ? "part" : "no"}"><strong>${esc(T(r.ok ? "To‘g‘ri!" : gain > 0 ? "Qisman to‘g‘ri" : !G.sel.length ? "Javob berilmadi" : "Noto‘g‘ri"))}</strong> <span class="bt-gain">+${esc(num(gain))}</span>
          ${r.expl ? `<div class="small" style="margin-top:6px">${A.inline(r.expl)}</div>` : ""}</div>
        <div class="tm-nav"><button class="btn primary" id="qNext">${esc(T(r.done ? "Natijani ko‘rish" : "Keyingi savol"))} <span id="qNs">5</span></button></div>`;
      let n = 5;
      const go = () => { stopRevealTimer(); if (!G || my !== seq) return; r.done ? (refreshState().then(() => G && drawWaitingOrResults())) : playLoop(); };
      A.$("#qNext").addEventListener("click", go);
      G.revealT = setInterval(() => { n--; const el = A.$("#qNs"); if (el) el.textContent = n; if (n <= 0) go(); }, 1000);
    } else {
      const foot = A.$("#qFoot"); foot.innerHTML = `<div class="explain"><strong>Javob qabul qilindi</strong></div>`;
      setTimeout(() => { if (!G || my !== seq) return; r.done ? refreshState().then(() => G && drawWaitingOrResults()) : playLoop(); }, 450);
    }
  }

  /* Jonli jadval */
  function drawBoard() {
    const box = A.$("#btBoard"); if (!box || !G?.st) return;
    const st = G.st, parts = [...(st.parts || [])];
    const hide = st.reveal === "end";
    parts.sort((a, b) => hide ? (b.cur - a.cur) : (Number(b.score) - Number(a.score) || a.ms - b.ms));
    let rows = parts;
    if (parts.length > 6) { const mi = parts.findIndex((p) => p.me); rows = parts.slice(0, 5); if (mi >= 5) rows.push(parts[mi]); }
    box.innerHTML = `<p class="bt-board-h small muted">${esc(T(hide ? "Jonli holat (ballar o‘yin oxirida ochiladi)" : "Jonli reyting"))}</p>` + rows.map((p) => `
      <div class="bt-brow${p.me ? " me" : ""}${p.left ? " left" : ""}" data-u="${esc(p.id)}"><span class="bt-bpos">${parts.indexOf(p) + 1}</span>${avatar(p, 30)}
        <span class="bt-bname">${esc(short(p.name, 18))}${p.left ? ` <small>(${esc(T("chiqib ketdi"))})</small>` : ""}</span>
        <span class="bt-bprog"><i style="width:${pct(p.cur, st.n_q)}%"></i></span>
        <span class="bt-bsc">${hide ? `${p.cur}/${st.n_q}` : esc(num(p.score))}${p.done ? " ✓" : ""}</span></div>`).join("");
    fillPhotos(box);
  }
  function drawWaiting() {
    stopTick();
    A.view.innerHTML = `<div class="bt-play"><div class="bt-wait"><b>Siz tugatdingiz! 🎉</b><p class="muted">Boshqa qatnashchilar tugatishi kutilmoqda…</p></div>
      <div class="bt-board" id="btBoard"></div>${stickerBar()}</div>`;
    drawBoard(); bindStickers();
  }

  /* Stikerlar */
  const stickerBar = () => `<div class="bt-stickers" role="group" aria-label="${esc(T("Stikerlar"))}">${STICKERS.map((s) => `<button data-st="${s}">${s}</button>`).join("")}</div>`;
  let stLast = 0;
  function bindStickers() {
    A.view.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => {
      if (Date.now() - stLast < 1500) return;
      stLast = Date.now();
      const me = meP();
      send("st", { u: me.id, s: b.dataset.st });
      showSticker(me.id, b.dataset.st);
    }));
  }
  function showSticker(uid, s) {
    if (!STICKERS.includes(s)) return;
    const p = (G?.st?.parts || []).find((x) => x.id === uid);
    if (!p) return;
    const host = A.view.querySelector(`[data-u="${CSS.escape(uid)}"]`) || A.view.querySelector(".bt-stickers");
    if (!host) return;
    const r = host.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "bt-float";
    el.innerHTML = `<span>${s}</span><small>${esc(short(p.name, 14))}</small>`;
    el.style.left = Math.max(8, Math.min(innerWidth - 90, r.left + r.width / 2 - 30)) + "px";
    el.style.top = (r.top + window.scrollY - 10) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* Natija */
  async function drawResults() {
    stopTick(); stopRevealTimer();
    const st = G.st, parts = st.parts || [], me = parts.find((p) => p.me) || {};
    A.setChrome("Natija", true, "assyst");
    const duel = st.kind === "duel", n = parts.length;
    const tie = duel && parts.filter((p) => p.place === 1).length > 1;
    const title = !me.id ? "O‘yin yakunlandi" : duel ? (tie ? "Durang 🤝" : me.place === 1 ? "G‘alaba! 🏆" : "Mag‘lubiyat") : (me.place === 1 ? "1-o‘rin! 🏆" : T("{p}-o‘rin", { p: me.place }));
    const before = me.r_after != null ? (me.r_before ?? me.r_after - (me.delta || 0)) : null;
    const gmn = MD(st.mode || modeOf(st.n_q)).n;
    const lgUp = before != null && leagueOf(me.r_after) > leagueOf(before), lgDown = before != null && leagueOf(me.r_after) < leagueOf(before);
    const podium = !duel && n >= 3 ? `<div class="bt-podium">${[1, 0, 2].map((i) => parts[i] ? `<div class="bt-pod p${i + 1}">${avatar(parts[i], i === 0 ? 64 : 50)}<b>${esc(short(parts[i].name, 14))}</b><small>${esc(num(parts[i].score))}</small><i class="bt-step">${parts[i].place}</i></div>` : "").join("")}</div>` : "";
    const vs = duel && n === 2 ? `<div class="bt-vs">${parts.map((p) => `<div class="bt-vsp${p.place === 1 && !tie ? " win" : ""}">${avatar(p, 64)}<b>${esc(short(p.name, 14))}</b><span class="bt-vsc">${esc(num(p.score))}</span><small>${fmtS(p.ms)}</small></div>`).join(`<span class="bt-vsx">VS</span>`)}</div>` : "";
    A.view.innerHTML = `<div class="bt-res">
      <h2 class="bt-res-t ${me.place === 1 ? "win" : ""}">${esc(T(title))}</h2>
      <p class="muted" style="margin:0 0 10px">${modeTag(st.mode || modeOf(st.n_q))} ${esc(scopeText(st))} · ${esc(T("{n} ta savol", { n: st.n_q }))}</p>
      ${vs}${podium}
      ${me.id ? `<div class="bt-mine">
        <span><b>${esc(num(me.score))}</b><small>ball</small></span>
        <span><b>${me.okn ?? "—"}/${st.n_q}</b><small>to‘liq to‘g‘ri</small></span>
        <span><b>${fmtS(me.ms)}</b><small>vaqt</small></span>
        <span><b class="${(me.delta || 0) >= 0 ? "g" : "r"}">${me.delta != null ? ((me.delta >= 0 ? "+" : "") + me.delta) : "—"}</b><small>${esc(me.r_after != null ? T("{m} reytingi: {r}", { m: gmn, r: me.r_after }) : T("reytingsiz"))}</small></span></div>` : ""}
      ${lgUp ? `<div class="bt-lgup">🎉 ${esc(T("Yangi liga ({m}): {l}!", { m: gmn, l: T(LEAGUES[leagueOf(me.r_after)].n) }))}</div>` : lgDown ? `<div class="bt-lgup down">${esc(T("Liga pasaydi ({m}): {l}", { m: gmn, l: T(LEAGUES[leagueOf(me.r_after)].n) }))}</div>` : ""}
      ${me.id && me.delta == null ? `<p class="small muted bt-note">${esc(T(st.rated ? "Bu o‘yin siz uchun reytingga qo‘shilmadi: bu raqiblar bilan 7 kunlik 2 ta reytingli o‘yin limiti tugagan." : "Reytingsiz o‘yin: bu raqib bilan 7 kunda 2 ta reytingli o‘yin limiti tugagan. O‘ynash davom etaveradi."))}</p>` : ""}
      <div class="bt-table">${parts.map((p) => `<div class="bt-brow${p.me ? " me" : ""}" data-u="${esc(p.id)}"><span class="bt-bpos">${p.place ?? "—"}</span>${avatar(p, 32)}
        <span class="bt-bname">${esc(short(p.name, 20))}${p.left ? ` <small>(${esc(T("chiqib ketdi"))})</small>` : ""}<small class="bt-bsub">${esc(short(p.uname || "", 34))}</small></span>
        <span class="bt-bsc">${esc(num(p.score))}<small>${fmtS(p.ms)}</small></span>
        <span class="bt-bd ${(p.delta || 0) >= 0 ? "g" : "r"}">${p.delta != null ? (p.delta >= 0 ? "+" : "") + p.delta : ""}</span></div>`).join("")}</div>
      ${stickerBar()}
      <div class="bt-racts">
        ${me.id ? `<a class="btn primary" href="${BASE}/xato/${esc(st.id)}">${ico(I.book, 18)} Xatolarni ko‘rish</a>` : ""}
        ${duel && me.id ? `<button class="btn" id="rsAgain">${ico(I.sword, 18)} Qayta bellashish</button>` : ""}
        <button class="btn" id="rsShare">${ico(I.share, 18)} Natijani ulashish</button>
        <a class="btn" href="${BASE}">Battle bosh sahifasi</a></div></div>`;
    fillPhotos(A.view); bindStickers();
    if (me.place === 1) vib([60, 50, 120]);
    A.$("#rsAgain")?.addEventListener("click", () => {
      const op = parts.find((p) => !p.me);
      if (!op) return;
      createMatch({ kind: "duel", lang: st.lang, course: st.course, subject: st.subject, topic: st.topic, n_q: st.n_q, invitee: op.id });
    });
    A.$("#rsShare").addEventListener("click", () => shareCard(st, me, T(title)));
    A.view.querySelectorAll(".bt-table [data-u]").forEach((r) => r.addEventListener("click", () => profileSheet(r.dataset.u)));
  }

  /* Natija kartochkasi (rasm) — Telegram, Instagram va boshqalarga ulashish uchun */
  async function shareCard(st, me, title) {
    try {
      const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1080;
      const g = cv.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 1080, 1080); gr.addColorStop(0, "#1b9a84"); gr.addColorStop(1, "#08433c");
      g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
      g.fillStyle = "rgba(255,255,255,.08)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(900 - i * 40, 160 + i * 30, 220 - i * 18, 0, 7); g.fill(); }
      g.fillStyle = "#fff"; g.textAlign = "center";
      g.font = "700 54px Onest, system-ui, sans-serif"; g.fillText("ALVORA Med · Test battle", 540, 150);
      g.font = "800 110px Onest, system-ui, sans-serif"; g.fillText(title.replace(/[🏆🤝🎉]/gu, "").trim(), 540, 340);
      g.font = "500 40px Onest, system-ui, sans-serif"; g.fillStyle = "#cdeee6"; g.fillText(MD(st.mode || modeOf(st.n_q)).n + " · " + scopeText(st), 540, 420);
      const parts = st.parts || [];
      g.font = "700 64px Onest, system-ui, sans-serif"; g.fillStyle = "#fff";
      if (st.kind === "duel" && parts.length === 2) {
        g.fillText(`${short(parts[0].name, 14)}  ${num(parts[0].score)} : ${num(parts[1].score)}  ${short(parts[1].name, 14)}`, 540, 560);
      } else {
        parts.slice(0, 3).forEach((p, i) => g.fillText(`${p.place}. ${short(p.name, 18)} — ${num(p.score)}`, 540, 540 + i * 86));
      }
      if (me?.r_after != null) {
        const l = LEAGUES[leagueOf(me.r_after)];
        g.font = "700 56px Onest, system-ui, sans-serif"; g.fillStyle = "#8be3cf";
        g.fillText(`${T(l.n)} · ${me.r_after}${me.delta != null ? ` (${me.delta >= 0 ? "+" : ""}${me.delta})` : ""}`, 540, 860);
      }
      g.font = "500 40px Onest, system-ui, sans-serif"; g.fillStyle = "#cdeee6"; g.fillText("alvoramed.com", 540, 990);
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      const file = new File([blob], "alvora-battle.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "ALVORA Med · Test battle", text: T("Test battle natijam — alvoramed.com") });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "alvora-battle.png"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
    } catch { /* foydalanuvchi bekor qildi */ }
  }

  /* ---------- Xatolarni ko'rish ---------- */
  async function pageReview(id, my) {
    A.setChrome("Xatolarni ko‘rish", true, "assyst");
    let list; try { list = await rpc("bt_review", { p_id: id }); } catch (e) { if (my === seq) failBox(e, () => pageReview(id, seq)); return; }
    if (my !== seq) return;
    const bad = list.filter((x) => Number(x.score) < 1);
    A.view.innerHTML = `<div class="hello"><h2>Xatolarni ko‘rish</h2><p class="muted">${esc(T("{n} ta savoldan {b} tasida xato yoki to‘liq bo‘lmagan javob", { n: list.length, b: bad.length }))}</p></div>
      <div class="seg flat" id="rvF"><button data-f="bad" aria-selected="true">${esc(T("Xatolar ({n})", { n: bad.length }))}</button><button data-f="all" aria-selected="false">${esc(T("Hammasi ({n})", { n: list.length }))}</button></div>
      <div id="rvList" data-notr></div>
      <div class="bt-racts">${bad.length ? `<button class="btn primary" id="rvSave">${ico(I.book, 18)} Xatolarni Test markaziga saqlash</button>` : ""}<a class="btn" href="${BASE}">Battle bosh sahifasi</a></div>`;
    const draw = (f) => {
      const items = f === "bad" ? bad : list;
      A.$("#rvList").innerHTML = items.length ? items.map((x) => `<div class="quiz-card bt-rv">
          <p class="tm-qn">${x.pos + 1}. ${esc(short(x.topic || x.sub || "", 70))} · <b class="${x.ok ? "g" : Number(x.score) > 0 ? "p" : "r"}">+${esc(num(x.score))}</b></p>
          <p class="quiz-q">${A.inline(x.q)}</p>
          <div class="tm-opts">${x.opts.map((o, j) => { const right = x.ans.includes(j), mine = (x.picked || []).includes(j); return `<div class="tm-orow"><div class="tm-opt ${right ? "right" : mine ? "wrong" : ""}"><span class="tm-l">${LET[j]}</span><span class="tm-ot">${A.inline(o)}${mine ? ` <small class="bt-mine-tag">${esc(T("siz tanladingiz"))}</small>` : ""}</span></div></div>`; }).join("")}</div>
          ${x.expl ? `<div class="explain small">${A.inline(x.expl)}</div>` : ""}</div>`).join("") : `<p class="muted">Xato yo‘q — barakalla! 🎉</p>`;
    };
    draw("bad");
    A.view.querySelectorAll("#rvF [data-f]").forEach((b) => b.addEventListener("click", () => { A.view.querySelectorAll("#rvF [data-f]").forEach((x) => x.setAttribute("aria-selected", String(x === b))); draw(b.dataset.f); }));
    A.$("#rvSave")?.addEventListener("click", () => {
      const banks = A.store.get("tm:user", []);
      let b = banks.find((x) => x.id === "battle-xato");
      if (!b) { b = { id: "battle-xato", title: T("Battle xatolari"), questions: [] }; banks.push(b); }
      const have = new Set(b.questions.map((q) => q.q));
      let add = 0;
      for (const x of bad) if (!have.has(x.q)) { b.questions.push({ q: x.q, o: x.opts, c: x.ans }); add++; }
      A.store.set("tm:user", banks);
      window.TM?.reset?.();
      A.toast(add ? T("{n} ta savol “Battle xatolari” testiga saqlandi", { n: add }) : T("Bu savollar allaqachon saqlangan"));
    });
  }

  /* ---------- Reyting ---------- */
  async function pageTop(query, my) {
    A.setChrome("Reyting", true, "assyst");
    const qs = new URLSearchParams(query || "");
    const tab = ["all", "uni", "unis"].includes(qs.get("t")) ? qs.get("t") : "all";
    const per = ["week", "month", "all"].includes(qs.get("p")) ? qs.get("p") : "all";
    const gm = MODES.some((m) => m.id === qs.get("m")) ? qs.get("m") : (MODES.some((m) => m.id === store.get("bt:mode", "")) ? store.get("bt:mode", "") : "blitz");
    const url = (t, p, m = gm) => `${BASE}/reyting?m=${m}&t=${t}&p=${p}`;
    A.view.innerHTML = `<div class="hello"><h2>${ico(I.trophy, 24)} Reyting</h2><p class="muted">${esc(T("Har o‘yin turining o‘z reytingi bor. Reyting hammaga ko‘rinadi."))}</p></div>
      <div class="bt-modes sm">${MODES.map((m) => `<a class="m-${m.id}" href="${url(tab, per, m.id)}" aria-selected="${m.id === gm}"><span>${m.e} ${m.n}</span><small>${esc(T("{s} savol", { s: m.sizes.join(" / ") }))}</small></a>`).join("")}</div>
      <div class="seg flat bt-tabs">${[["all", "Umumiy"], ["uni", "Universitetim"], ["unis", "Universitetlar"]].map(([k, v]) => `<a class="btn${k === tab ? " on" : ""}" href="${url(k, per)}" aria-current="${k === tab}">${esc(T(v))}</a>`).join("")}</div>
      <div class="seg flat bt-per">${[["week", "Haftalik"], ["month", "Oylik"], ["all", "Barcha vaqt"]].map(([k, v]) => `<a class="btn${k === per ? " on" : ""}" href="${url(tab, k)}" aria-current="${k === per}">${esc(T(v))}</a>`).join("")}</div>
      <p class="small muted bt-note" style="margin-top:-2px">${esc(T(tab === "unis" ? (per === "all" ? "Har universitetning eng yaxshi 10 o‘yinchisi o‘rtacha reytingi (kamida 5 o‘yinchi bo‘lsa)." : "Har universitetning eng yaxshi 10 o‘yinchisi shu davrda to‘plagan o‘rtacha reyting bali (kamida 5 o‘yinchi bo‘lsa).") : per === "all" ? "Reyting bo‘yicha (Elo). Kamida 1 ta reytingli o‘yin o‘ynaganlar ko‘rinadi." : "Shu davrda to‘plangan reyting bali bo‘yicha."))}</p>
      ${tab !== "unis" ? `<label class="bt-search">${ico(I.search, 18)}<input id="tpQ" placeholder="${esc(T("Ism bo‘yicha qidirish"))}" autocomplete="off"></label>` : ""}
      <div id="tpList" class="bt-top"><p class="small muted">Yuklanmoqda…</p></div>
      <button class="btn bt-more" id="tpMore" hidden>Ko‘proq ko‘rsatish</button>
      <div class="bt-mebar" id="tpMe" hidden></div>`;
    let off = 0, qv = "", rows = [], tq = null, tot = 0;
    const load = async (reset) => {
      if (reset) { off = 0; rows = []; }
      let r;
      try { r = await rpc("bt_top", { p_mode: gm, p_tab: tab, p_period: per, p_uni: null, p_q: qv || null, p_off: off, p_lim: 50, p_lang: lang() }); }
      catch (e) { if (my === seq) A.$("#tpList").innerHTML = `<p class="small muted">${esc(errText(e))}</p>`; return; }
      if (my !== seq) return;
      rows = rows.concat(r.rows || []); tot = r.total || 0; off = rows.length;
      const box = A.$("#tpList");
      if (r.no_uni) { box.innerHTML = A.emptyState(I.trophy, "Universitet tanlanmagan", "Universitetingiz reytingini ko‘rish uchun profilda universitetni tanlang.", `<a class="btn primary" href="#/sozlamalar">Profilga o‘tish</a>`); return; }
      if (tab === "unis") {
        box.innerHTML = rows.length ? rows.map((u) => `<div class="bt-trow${u.mine ? " me" : ""}"><span class="bt-tpos ${u.pos <= 3 ? "m" + u.pos : ""}">${u.pos}</span>
            <span class="bt-uni-i">${ico(I.room, 20)}</span><span class="bt-tname"><b>${esc(u.name)}</b><small>${esc(u.region || "")} · ${esc(T("{n} o‘yinchi", { n: u.players }))}</small></span>
            <span class="bt-tval">${per === "all" ? u.score : (u.score >= 0 ? "+" : "") + u.score}</span></div>`).join("")
          : `<p class="small muted bt-empty">Hali reytingga kirgan universitet yo‘q. Universitet reytingga kirishi uchun undan kamida 5 o‘yinchi reytingli o‘yin o‘ynagan bo‘lishi kerak.</p>`;
        const me = A.$("#tpMe");
        if (r.me) { me.hidden = false; me.innerHTML = `<span>${esc(T("Universitetingiz: {p}-o‘rin", { p: r.me.pos }))}</span><b>${r.me.score}</b>`; }
        else if (!r.my_uni) { me.hidden = false; me.innerHTML = `<a href="#/sozlamalar">${esc(T("Profilda universitetingizni tanlang"))}</a>`; }
        return;
      }
      box.innerHTML = (tab === "uni" && r.uname ? `<p class="small muted" style="margin:0 0 8px"><b>${esc(r.uname)}</b></p>` : "") + (rows.length ? rows.map((p) => `
          <button class="bt-trow${p.me ? " me" : ""}" data-u="${esc(p.id)}"><span class="bt-tpos ${p.pos <= 3 ? "m" + p.pos : ""}">${p.pos}</span>${avatar(p, 40)}
            <span class="bt-tname"><b>${esc(p.name)}</b><small>${tab === "all" && p.uname ? esc(short(p.uname, 40)) + " · " : ""}${lgBadge(p.rating, true)} <span class="bt-wl">${esc(T("{w}G · {l}M", { w: p.wins, l: p.losses }))}</span></small></span>
            <span class="bt-tval">${per === "all" ? p.val : (p.val >= 0 ? "+" : "") + p.val}<small>${per === "all" ? esc(T("reyting")) : esc(T("{g} o‘yin", { g: p.g }))}</small></span></button>`).join("")
        : `<p class="small muted bt-empty">${esc(T(qv ? "Hech kim topilmadi" : "Hali reytingda hech kim yo‘q. Birinchi bo‘ling!"))}</p>`);
      A.$("#tpMore").hidden = rows.length >= tot;
      const me = A.$("#tpMe");
      if (r.me) { me.hidden = false; me.innerHTML = `<span>${esc(T("Siz: {p}-o‘rin", { p: r.me.pos }))}</span><b>${per === "all" ? r.me.val : (r.me.val >= 0 ? "+" : "") + r.me.val}</b>`; }
      else { me.hidden = false; me.innerHTML = `<span>${esc(T(per === "all" ? "Bu turda reytingda bo‘lish uchun 1 ta reytingli o‘yin o‘ynang" : "Bu davrda bu turda reytingli o‘yiningiz yo‘q"))}</span>`; }
      box.querySelectorAll("[data-u]").forEach((b) => b.addEventListener("click", () => profileSheet(b.dataset.u)));
      fillPhotos(box);
    };
    A.$("#tpQ")?.addEventListener("input", (e) => { clearTimeout(tq); tq = setTimeout(() => { qv = e.target.value.trim(); load(true); }, 350); });
    A.$("#tpMore").addEventListener("click", () => load(false));
    load(true);
  }

  /* ---------- Administrator: savollar banki ---------- */
  async function pageAdmin(my) {
    A.setChrome("Battle savollari", true, "assyst");
    if (!window.ACC?.isAdmin?.()) { location.replace(BASE); return; }
    let ov; try { ov = await rpc("bt_admin_overview"); } catch (e) { if (my === seq) failBox(e, () => pageAdmin(seq)); return; }
    if (my !== seq) return;
    A.view.innerHTML = `<div class="hello"><h2>${ico(I.db, 24)} Battle savollari</h2><p class="muted">Faqat siz ko‘rasiz. Savollar va to‘g‘ri javoblar shu bazada saqlanadi; foydalanuvchilar ularni ko‘ra olmaydi.</p></div>
      <div class="bt-stats bt-adm">
        <span><b>${ov.total}</b><small>jami savol</small></span><span><b>${ov.active}</b><small>faol</small></span><span><b>${ov.demo}</b><small>demo</small></span>
        <span><b>${ov.matches}</b><small>o‘yin</small></span><span><b>${ov.today}</b><small>bugun</small></span><span><b>${ov.players}</b><small>o‘yinchi</small></span></div>
      <div class="bt-admtbl">${(ov.by || []).map((x) => `<div class="read-row"><span><b>${esc(x.name)}</b> <small class="muted">${esc(x.lang.toUpperCase())} · ${esc(T("{c}-kurs", { c: x.course }))} · ${esc(T("{n} mavzu", { n: x.topics }))}</small><br>
          <span class="small muted">${esc(T("{n} ta savol · oson {a} · o‘rta {b} · qiyin {c} · ko‘p javobli {m}", { n: x.n, a: x.d1, b: x.d2, c: x.d3, m: x.multi }))}</span></span></div>`).join("") || `<p class="muted">Savol yo‘q.</p>`}</div>
      <div class="bt-racts"><button class="btn primary" id="adExp">${ico(I.share, 18)} Zaxira nusxa (JSON)</button></div>
      <div class="seg flat" id="adL"><button data-l="uz" aria-selected="${lang() === "uz"}">O‘zbekcha</button><button data-l="en" aria-selected="${lang() === "en"}">English</button></div>
      <div id="adList" data-notr><p class="small muted">Yuklanmoqda…</p></div>
      <button class="btn bt-more" id="adMore" hidden>Ko‘proq ko‘rsatish</button>`;
    let L = lang(), off = 0;
    const load = async (reset) => {
      if (reset) { off = 0; A.$("#adList").innerHTML = ""; }
      let rows; try { rows = await rpc("bt_admin_list", { p_lang: L, p_subject: null, p_q: null, p_off: off, p_lim: 50 }); } catch (e) { A.toast(errText(e)); return; }
      if (my !== seq) return;
      off += rows.length;
      A.$("#adList").insertAdjacentHTML("beforeend", rows.map((x) => `<div class="quiz-card bt-rv${x.active ? "" : " off"}">
          <p class="tm-qn">#${x.id} · ${esc(short(x.topic_name, 60))} · ${esc(T("qiyinlik {d}", { d: x.diff }))}${x.demo ? " · DEMO" : ""} · ${esc(T("{s} marta, to‘g‘ri {p}%", { s: x.seen, p: x.seen ? Math.round(x.okc / x.seen * 100) : 0 }))}</p>
          <p class="quiz-q">${A.inline(x.q)}</p>
          <div class="tm-opts">${x.opts.map((o, j) => `<div class="tm-orow"><div class="tm-opt ${x.ans.includes(j) ? "right" : ""}"><span class="tm-l">${LET[j]}</span><span class="tm-ot">${A.inline(o)}</span></div></div>`).join("")}</div>
          ${x.expl ? `<div class="explain small">${A.inline(x.expl)}</div>` : ""}
          <div class="tm-nav"><button class="btn" data-tog="${x.id}" data-on="${x.active ? 0 : 1}">${esc(T(x.active ? "O‘chirib qo‘yish" : "Yoqish"))}</button></div></div>`).join(""));
      A.$("#adMore").hidden = rows.length < 50;
      A.view.querySelectorAll("[data-tog]:not([data-b])").forEach((b) => { b.dataset.b = 1; b.addEventListener("click", async () => {
        try { await rpc("bt_admin_set", { p_id: Number(b.dataset.tog), p_active: b.dataset.on === "1" }); b.closest(".bt-rv").classList.toggle("off", b.dataset.on !== "1"); b.textContent = T(b.dataset.on === "1" ? "O‘chirib qo‘yish" : "Yoqish"); b.dataset.on = b.dataset.on === "1" ? "0" : "1"; catCache = null; } catch (e) { fail(e); }
      }); });
    };
    A.view.querySelectorAll("#adL [data-l]").forEach((b) => b.addEventListener("click", () => { L = b.dataset.l; A.view.querySelectorAll("#adL [data-l]").forEach((x) => x.setAttribute("aria-selected", String(x === b))); load(true); }));
    A.$("#adMore").addEventListener("click", () => load(false));
    A.$("#adExp").addEventListener("click", async () => {
      try {
        const all = []; let o = 0;
        for (;;) { const part = await rpc("bt_admin_list", { p_lang: null, p_subject: null, p_q: null, p_off: o, p_lim: 2000 }); all.push(...part); o += part.length; if (part.length < 2000) break; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify({ exported_at: new Date().toISOString(), count: all.length, questions: all }, null, 1)], { type: "application/json" }));
        a.download = "alvora-battle-savollar-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        A.toast(T("{n} ta savol yuklab olindi", { n: all.length }));
      } catch (e) { fail(e); }
    });
    load(true);
  }

  /* ---------- Kod/havola orqali kirish ---------- */
  async function pageCode(code, my) {
    A.setChrome("Test battle", true, "assyst");
    A.view.innerHTML = head("Kirilmoqda…");
    try { const r = await rpc("bt_join", { p_id: null, p_code: code }); if (my === seq) location.replace(BASE + "/m/" + r.id); }
    catch (e) { if (my !== seq) return; if (e.code === "busy" && e.arg) { location.replace(BASE + "/m/" + e.arg); return; } failBox(e, () => pageCode(code, seq)); }
  }

  /* ---------- Yo'naltirgich ---------- */
  async function page(api, p, query) {
    A = api;
    stopAll(); stopTick();
    const my = ++seq;
    if (!window.ACC?.signed?.()) return needLogin();
    hb.fast(true);
    later(() => hb.fast(false));
    const sub = p[1];
    if (!sub) return pageHome(my);
    if (sub === "reyting") return pageTop(query, my);
    if (sub === "qidiruv") return pageQueue(my);
    if (sub === "m" && p[2]) return pageMatch(p[2], my);
    if (sub === "kod" && p[2]) return pageCode(p[2], my);
    if (sub === "xato" && p[2]) return pageReview(p[2], my);
    if (sub === "savollar") return pageAdmin(my);
    location.replace(BASE);
  }

  /* ---------- Yurak urishi: onlayn ko'rinish va kelgan takliflar (ilovaning istalgan joyida) ---------- */
  const hb = (() => {
    let t = null, fastOn = false, busy = false;
    const seen = new Set();
    let modal = null;
    async function beat() {
      if (busy || document.hidden || !navigator.onLine || !window.ACC?.signed?.()) return;
      busy = true;
      try {
        const r = await rpc("bt_ping", { p_lang: lang() });
        for (const inv of r.invites || []) if (!seen.has(inv.id)) { seen.add(inv.id); showInvite(inv); break; }
      } catch { /* */ } finally { busy = false; }
    }
    function showInvite(inv) {
      if (!A || modal) return;
      if (G?.st?.status === "live" && G.st.in) return;   // o'yin paytida halaqit bermaymiz
      vib([80, 60, 80]);
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = `<div class="sheet bt-invite" role="dialog" aria-modal="true">
        <p class="small muted" style="margin:0">⚔️ Duelga taklif</p>
        <div class="bt-who big">${avatar(inv.from, 56)}<span><b>${esc(inv.from.name)}</b><small>${esc(inv.from.uname || "")}</small>${lgBadge(inv.from.rating, true)}</span></div>
        <p style="margin:8px 0 0">${modeTag(inv.mode || modeOf(inv.n_q))} ${esc(scopeText(inv))} · ${esc(T("{n} ta savol", { n: inv.n_q }))}</p>
        <p class="small muted" style="margin:4px 0 0">${esc(T("Taklif {s} soniyadan keyin bekor bo‘ladi", { s: inv.left_s }))}</p>
        <div class="acts"><button class="btn" id="ivNo">Rad etish</button><button class="btn primary" id="ivYes">${ico(I.sword, 18)} Qabul qilish</button></div></div>`;
      document.body.appendChild(back);
      document.body.classList.add("noscroll");
      modal = back;
      fillPhotos(back);
      const close = () => { back.remove(); modal = null; if (!document.querySelector(".sheet-back,.lightbox")) document.body.classList.remove("noscroll"); };
      const tmo = setTimeout(close, Math.max(5, inv.left_s) * 1000);
      back.querySelector("#ivNo").addEventListener("click", async () => { clearTimeout(tmo); close(); try { await rpc("bt_decline", { p_id: inv.id }); } catch { /* */ } });
      back.querySelector("#ivYes").addEventListener("click", async (e) => {
        e.target.disabled = true;
        try { const r = await rpc("bt_join", { p_id: inv.id, p_code: null }); clearTimeout(tmo); close(); location.hash = BASE + "/m/" + r.id; }
        catch (er) { clearTimeout(tmo); close(); fail(er); }
      });
    }
    function restart() { clearInterval(t); t = setInterval(beat, fastOn ? 8000 : 25000); }
    return {
      start() { if (t) return; restart(); setTimeout(beat, 4000); document.addEventListener("visibilitychange", () => { if (!document.hidden) beat(); }); window.addEventListener("online", beat); },
      fast(on) { fastOn = on; if (t) restart(); }
    };
  })();

  /* Test markazi bosh sahifasidagi banner */
  const banner = (chev = "") => `<a class="bt-banner" href="${BASE}"><span class="bt-banner-i">${ico(I.sword, 26)}</span><span><b>Test battle</b><small>Duel, xonalar va onlayn reyting — do‘stlaringiz bilan bellashing</small></span>${chev}</a>`;
  // Battle bo'limidan chiqilganda barcha taymer va kanallar to'xtatiladi
  window.addEventListener("hashchange", () => { if (!onBattle()) { stopAll(); stopTick(); } });

  function boot(api) { A = A || api; hb.start(); }
  window.BT = { page, boot, banner, leagues: LEAGUES };
})();
