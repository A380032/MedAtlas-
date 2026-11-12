/* Test markazi — Assyst uslubidagi test moduli.
   app.js uni window.TM.page(A, p, query) orqali chaqiradi (A — app.js yordamchilari). */
(() => {
  "use strict";
  let A;
  let ctx = null;          // { banks, by } yuklangan test banklari
  let sess = null;         // joriy sessiya (test)
  let lastRes = null;      // oxirgi natija
  let tick = null;         // taymer
  const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const SIZES = [10, 15, 20, 25, 30, 50, 100];
  const TIMES = [0, 5, 10, 15, 20, 25, 30];
  const PASS = 56;
  const BASE = "#/testmarkazi";

  /* ---------- Yordamchilar ---------- */
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const fmtT = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const esc = (s) => A.esc(s);
  const store = { get: (k, d) => A.store.get("tm:" + k, d), set: (k, v) => A.store.set("tm:" + k, v) };
  const noun = (n, w) => `${n} ta ${w}`;
  const plural = (n) => n;

  function prep(b, user) {
    b.user = !!user;
    b.by = {};
    (b.questions || []).forEach((q, i) => {
      q.n = q.n || i + 1;
      q._k = hash(A.fold(q.q) + "|" + q.o.map((o) => A.fold(o)).sort().join("|"));
      b.by[q._k] = q;
    });
    b.topics = b.topics || [];
    return b;
  }
  async function loadBanks() {
    if (ctx) return ctx;
    const banks = [];
    let idx = [];
    let idxOk = false;
    try { idx = await A.loadJSON("data/tests/index.json"); idxOk = true; } catch { /* oflayn */ }
    const L = window.I18N?.lang || "uz";
    for (const e of idx) {
      if ((e.lang || "uz") !== L) continue;   // har bir til uchun alohida testlar
      try { const b = prep(await A.loadJSON("data/tests/" + e.id + ".json"), false); b.course = e.course ? String(e.course) : ""; b.lang = e.lang || "uz"; banks.push(b); } catch { /* yuklanmadi */ }
    }
    const gone = store.get("udel", []);
    for (const u of store.get("user", [])) if (!gone.includes(u.id)) banks.push(prep(u, true));
    ctx = { banks, idxOk, by: Object.fromEntries(banks.map((b) => [b.id, b])) };
    return ctx;
  }
  const dropCtx = () => { ctx = null; };

  /* ---------- Statistika (har bir savol bo'yicha) ---------- */
  const stOf = (bid) => store.get("st:" + bid, {});
  function record(bid, k, ok) {
    const st = stOf(bid);
    const s = st[k] || [0, 0, 0, 0];
    st[k] = [ok ? 1 : 0, s[1] + 1, s[2] + (ok ? 0 : 1), Date.now()];
    store.set("st:" + bid, st);
  }
  const favs = () => store.get("fav", {});
  const isOk = (q, sel) => { const a = [...sel].sort((x, y) => x - y).join(), b = [...q.c].sort((x, y) => x - y).join(); return a === b; };
  const addHist = (h) => { const a = store.get("hist", []); a.push(h); store.set("hist", a.slice(-400)); };

  /* ---------- Matndan test o'qish (? savol, + to'g'ri, - xato) ---------- */
  function parseText(txt) {
    const qs = [], errs = [];
    let cur = null;
    const flush = () => {
      if (!cur) return;
      if (cur.o.length < 2) errs.push(`«${cur.q.slice(0, 40)}…» — kamida 2 ta variant kerak`);
      else if (!cur.c.length) errs.push(`«${cur.q.slice(0, 40)}…» — to‘g‘ri javob (+) belgilanmagan`);
      else qs.push(cur);
      cur = null;
    };
    for (const raw of String(txt).split(/\r?\n/)) {
      const l = raw.trim();
      if (!l) continue;
      if (l[0] === "?" || l[0] === "#") { flush(); cur = { q: l.slice(1).trim(), o: [], c: [] }; }
      else if ((l[0] === "+" || l[0] === "-") && cur) {
        cur.o.push(l.slice(1).trim());
        if (l[0] === "+") cur.c.push(cur.o.length - 1);
      } else if (cur) { if (cur.o.length) cur.o[cur.o.length - 1] += " " + l; else cur.q += " " + l; }
    }
    flush();
    return { qs: qs.map((q, i) => ({ n: i + 1, ...q })), errs };
  }

  /* ---------- Savollar to'plami (filtr) ---------- */
  function poolFor(banks, scope, cfg) {
    const out = [];
    const fv = favs();
    const lo = cfg.from ? Number(cfg.from) : 0, hi = cfg.to ? Number(cfg.to) : 1e9;
    for (const b of banks) {
      const st = stOf(b.id);
      for (const q of b.questions) {
        if (scope.topics && scope.topics.length && !scope.topics.includes(q.t)) continue;
        if (banks.length === 1 && (q.n < lo || q.n > hi)) continue;
        const s = st[q._k];
        if (cfg.src === "new" && s) continue;
        if (cfg.src === "bad" && !(s && s[0] === 0)) continue;
        if (cfg.src === "ok" && !(s && s[0] === 1)) continue;
        if (cfg.src === "fav" && !fv[b.id + ":" + q._k]) continue;
        out.push({ b, q });
      }
    }
    return out;
  }
  function shuffle(a) { return A.shuffle(a); }
  function makeItem(bid, q, shO) {
    const idx = q.o.map((_, i) => i);
    const pin = (q.p || []).slice().sort((a, b) => a - b);
    const perm = shO ? shuffle(idx.filter((i) => !pin.includes(i))).concat(pin) : idx;
    return { b: bid, k: q._k, perm, sel: [], ok: null, chk: false };
  }
  const qOf = (it) => ctx.by[it.b]?.by[it.k];

  /* ---------- Sessiya ---------- */
  const saveSess = () => { if (sess) store.set("sess", sess); };
  function newSess(setup, items, extra = {}) {
    sess = { id: uid(), mode: setup.mode, setup, items, i: 0, t0: Date.now(), end: setup.cfg.time ? Date.now() + setup.cfg.time * 60000 : 0, round: 0, ...extra };
    saveSess();
    location.hash = BASE + "/run";
  }
  function buildFromSetup(setup) {
    const banks = setup.banks.map((id) => ctx.by[id]).filter(Boolean);
    let pool = poolFor(banks, { topics: setup.topics }, setup.cfg);
    if (!pool.length) { A.toast("Bu sozlamada savol topilmadi"); return false; }
    if (setup.cfg.shQ) pool = shuffle(pool);
    const size = setup.cfg.size || pool.length;
    pool = pool.slice(0, size);
    newSess(setup, pool.map((x) => makeItem(x.b.id, x.q, setup.cfg.shO)));
    return true;
  }

  /* ---------- Bosh sahifa ---------- */
  function bankStats(b) {
    const st = stOf(b.id);
    let ans = 0, ok = 0;
    for (const q of b.questions) { const s = st[q._k]; if (s) { ans++; ok += s[0]; } }
    return { ans, ok, total: b.questions.length };
  }
  const COURSES = ["1", "2", "3"];
  const inCourse = (b, c) => !b.course || b.course === c;
  function selCourse() {
    const c = store.get("tm:course", null);
    if (COURSES.includes(c)) return c;
    const f = ctx.banks.find((b) => !b.user && b.course);
    return f ? f.course : "3";
  }
  const curBank = () => {
    const bs = ctx.banks, id = store.get("bank", null), c = selCourse();
    const sel = bs.find((b) => b.id === id);
    if (sel && (sel.user || inCourse(sel, c))) return sel;
    return bs.find((b) => !b.user && inCourse(b, c)) || bs.find((b) => !b.user) || bs[0];
  };

  function delUser(id) {
    store.set("user", store.get("user", []).filter((x) => x.id !== id));
    const g = store.get("udel", []); if (!g.includes(id)) { g.push(id); store.set("udel", g); }
    store.set("st:" + id, {});
    if (store.get("bank", "") === id) store.set("bank", "");
    dropCtx();
  }

  async function pageHome() {
    A.setChrome("Test markazi", false, "assyst");
    await loadBanks();
    const bs = ctx.banks;
    const sv = store.get("sess", null);
    const ico = {
      mavzu: '<path d="M5 5h10a3 3 0 0 1 3 3v11H8a3 3 0 0 1-3-3zM9 9h5M9 13h4"/>',
      aralash: '<path d="M4 7h4l3 10h4M4 17h4l1.5-4M15 7h5M17 4l3 3-3 3M17 14l3 3-3 3"/>',
      imtihon: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 1.5M9 3h6"/>',
      card: '<rect x="3" y="6" width="14" height="12" rx="2.5"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/>',
      stat: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      star: '<path d="M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6L12 17l-4.9 2.5.9-5.6-4-3.9 5.5-.8z"/>'
    };
    if (!bs.length && !ctx.idxOk) {
      A.view.innerHTML = `<div class="hello"><h2>Test markazi</h2></div>${A.emptyState(A.ICX.warn, "Testlar yuklanmadi", "Internetga ulanib, sahifani pastga tortib yangilang.")}`;
      return;
    }
    const off = bs.filter((x) => !x.user), c = selCourse();
    const courseTabs = off.length ? `<div class="seg flat tm-courses" role="group">${COURSES.map((k) => `<button data-course="${k}" aria-selected="${k === c}">${k}-kurs</button>`).join("")}</div>` : "";
    const bCur = bs.length ? curBank() : null;
    if (!bCur || !(bCur.user || inCourse(bCur, c))) {
      const msg = !off.length ? ((window.I18N?.lang || "uz") !== "uz" ? "Inglizcha guruhlar uchun testlar tez orada qo‘shiladi." : "Testlar tez orada qo‘shiladi.") : "Bu kurs uchun testlar tez orada qo‘shiladi.";
      const mine = bs.filter((x) => x.user);
      A.view.innerHTML = `<div class="hello"><h2>Test markazi</h2><p class="muted">Sessiya testlarini mavzu bo‘yicha va aralash ishlang, xatolaringizni takrorlang.</p></div>
        ${courseTabs}
        <div class="soon-card"><span class="soon-ico">${A.svg(ico.stat, 40, 1.6)}</span><h3>Tez orada</h3><p class="muted">${esc(msg)}</p></div>
        ${mine.length ? `<h3 class="group-label">Mening testlarim</h3><div class="chips tm-banks">${mine.map((x) => `<button class="tm-chip" data-bank="${esc(x.id)}" aria-pressed="false">${esc(x.title)}</button>`).join("")}</div>` : ""}
        <div class="tm-modes tm-small"><a class="tm-mode" href="${BASE}/qoshish"><span class="tm-ico">${A.svg(ico.plus, 24)}</span><span><b>O‘z testim</b><small>Matn yoki fayldan qo‘shish</small></span></a></div>`;
      A.view.querySelectorAll("[data-course]").forEach((x) => x.addEventListener("click", () => { store.set("tm:course", x.dataset.course); store.set("bank", ""); pageHome(); }));
      A.view.querySelectorAll("[data-bank]").forEach((x) => x.addEventListener("click", () => { store.set("bank", x.dataset.bank); pageHome(); }));
      return;
    }
    const b = bCur;
    const s = bankStats(b);
    const fvN = Object.keys(favs()).filter((x) => ctx.by[x.split(":")[0]]).length;
    const due = dueCards(bs);
    const modes = [
      ["mavzu", "Mavzu bo‘yicha", "Mavzuni tanlang — javob darhol ko‘rinadi"],
      ["aralash", "Aralash", "Barcha mavzulardan aralash savollar, javob darhol"],
      ["imtihon", "Imtihon", "Natija oxirida, vaqt bilan — sessiyaga o‘xshash"]
    ];
    A.view.innerHTML = `<div class="hello"><h2>Test markazi</h2><p class="muted">Sessiya testlarini mavzu bo‘yicha va aralash ishlang, xatolaringizni takrorlang.</p></div>
      ${sv ? `<a class="resume tm-resume" href="${BASE}/run"><span class="play">${A.svg(A.IC.play, 22, 0)}</span><span class="resume-txt"><small>Tugallanmagan test</small><strong>${sv.items.filter((x) => x.chk || x.sel.length).length} / ${sv.items.length} ta savol · davom ettirish</strong></span></a>` : ""}
      ${courseTabs}
      <div class="tm-bank">
        ${A.ring(pct(s.ok, s.total), 62)}
        <div class="tm-bank-t"><b>${esc(b.title)}</b>
          <small>${s.total} ta savol · ishlangan ${s.ans} · to‘g‘ri ${s.ok}${s.ans ? ` (${pct(s.ok, s.ans)}%)` : ""}</small></div>
        ${b.user ? `<button class="btn danger" id="delBank" style="margin-left:auto">O‘chirish</button>` : ""}
      </div>
      ${bs.filter((x) => x.user || inCourse(x, c)).length > 1 ? `<div class="chips tm-banks">${bs.filter((x) => x.user || inCourse(x, c)).map((x) => `<button class="tm-chip" data-bank="${esc(x.id)}" aria-pressed="${x.id === b.id}">${esc(x.title)}</button>`).join("")}</div>` : ""}
      <div class="tm-modes">${modes.map(([id, t, d]) => `<a class="tm-mode" href="${BASE}/${id}"><span class="tm-ico">${A.svg(ico[id], 26)}</span><span><b>${t}</b><small>${d}</small></span>${A.chev || ""}</a>`).join("")}</div>
      <h3 class="group-label">Tezkor</h3>
      <div class="tm-quick">
        <a class="tm-q" href="${BASE}/aralash?src=bad"><b>Xatolarim</b><small>Faqat xato topilganlar</small></a>
        <a class="tm-q" href="${BASE}/aralash?src=new"><b>Yangilari</b><small>Hali ishlanmagan</small></a>
        <a class="tm-q" href="${BASE}/aralash?src=ok"><b>To‘g‘rilari</b><small>Takrorlash uchun</small></a>
        <a class="tm-q" href="${BASE}/aralash?src=fav"><b>Sevimlilar</b><small>${fvN} ta savol</small></a>
      </div>
      <h3 class="group-label">Qo‘shimcha</h3>
      <div class="tm-modes tm-small">
        <a class="tm-mode" href="${BASE}/kartochka"><span class="tm-ico">${A.svg(ico.card, 24)}</span><span><b>Kartochkalar</b><small>${due ? `Takrorlash vaqti: ${due} ta` : "Bilaman / bilmayman"}</small></span></a>
        <a class="tm-mode" href="${BASE}/statistika"><span class="tm-ico">${A.svg(ico.stat, 24)}</span><span><b>Statistika</b><small>Grafiklar va natijalar</small></span></a>
        <a class="tm-mode" href="${BASE}/qoshish"><span class="tm-ico">${A.svg(ico.plus, 24)}</span><span><b>O‘z testim</b><small>Matn yoki fayldan qo‘shish</small></span></a>
      </div>`;
    A.view.querySelectorAll("[data-bank]").forEach((x) => x.addEventListener("click", () => { store.set("bank", x.dataset.bank); pageHome(); }));
    A.view.querySelectorAll("[data-course]").forEach((x) => x.addEventListener("click", () => { store.set("tm:course", x.dataset.course); store.set("bank", ""); pageHome(); }));
    A.$("#delBank")?.addEventListener("click", () => {
      if (!confirm("“" + b.title + "” testi o‘chirilsinmi? Natijalar ham o‘chadi.")) return;
      delUser(b.id); A.toast("Test o‘chirildi"); pageHome();
    });
  }

  /* ---------- Mavzular ro'yxati ---------- */
  async function pageTopics() {
    A.setChrome("Mavzu bo‘yicha", true, "assyst");
    await loadBanks();
    const b = curBank();
    const st = stOf(b.id);
    const rows = b.topics.map((t) => {
      const qs = b.questions.filter((q) => q.t === t.id);
      if (!qs.length) return "";
      let ans = 0, ok = 0;
      qs.forEach((q) => { const s = st[q._k]; if (s) { ans++; ok += s[0]; } });
      return `<a class="tm-topic" href="${BASE}/mavzu/${esc(t.id)}"><span class="tm-tn">${t.no ?? ""}</span>
        <span class="tm-tt"><b>${esc(t.title)}</b><small>${qs.length} ta savol · ${ans ? `to‘g‘ri ${pct(ok, ans)}%` : "ishlanmagan"}</small>
        <span class="progress"><i style="width:${pct(ans, qs.length)}%"></i></span></span></a>`;
    }).join("");
    const users = ctx.banks.filter((x) => x.user);
    A.view.innerHTML = `<div class="hello"><h2>Mavzu bo‘yicha</h2><p class="muted">${esc(b.title)} · amaliy mashg‘ulotlar mavzulari</p></div>
      ${ctx.banks.filter((x) => !x.user && inCourse(x, selCourse())).length > 1 ? `<div class="chips">${ctx.banks.filter((x) => !x.user && inCourse(x, selCourse())).map((x) => `<button class="tm-chip" data-bank="${esc(x.id)}" aria-pressed="${x.id === b.id}">${esc(x.title)}</button>`).join("")}</div>` : ""}
      <div class="tm-topics">${rows || A.emptyState(A.ICX.warn, "Mavzular yo‘q", "Bu testda mavzularga ajratilgan savollar yo‘q. “Aralash” bo‘limidan foydalaning.")}</div>
      ${users.length ? `<h3 class="group-label">Mening testlarim</h3><div class="tm-topics">${users.map((u) => `<a class="tm-topic" href="${BASE}/mavzu/b-${esc(u.id)}"><span class="tm-tn">★</span><span class="tm-tt"><b>${esc(u.title)}</b><small>${u.questions.length} ta savol</small></span></a>`).join("")}</div>` : ""}`;
    A.view.querySelectorAll("[data-bank]").forEach((x) => x.addEventListener("click", () => { store.set("bank", x.dataset.bank); pageTopics(); }));
  }

  /* ---------- Sozlash (hajm, vaqt, oraliq, filtr) ---------- */
  const SRC = [["all", "Hammasi"], ["new", "Ishlanmagan"], ["bad", "Xato topilgan"], ["ok", "To‘g‘ri topilgan"], ["fav", "Sevimlilar"]];
  async function pageSetup(mode, tid, query) {
    A.setChrome(mode === "mavzu" ? "Mavzu bo‘yicha" : mode === "aralash" ? "Aralash test" : "Imtihon", true, "assyst");
    await loadBanks();
    const bs = ctx.banks;
    if (!bs.length) { A.view.innerHTML = A.emptyState(A.ICX.warn, "Testlar yuklanmadi", "Internetga ulanib, qayta urinib ko‘ring."); return; }
    const saved = store.get("set:" + mode, {});
    const cfg = { src: "all", size: 20, time: mode === "imtihon" ? 30 : 0, shQ: true, shO: true, from: "", to: "", ...saved };
    const qp = new URLSearchParams(query || "");
    if (qp.get("src")) cfg.src = qp.get("src");
    let banksSel, title, topicList = null, pickTopics = [];
    if (mode === "mavzu") {
      if (tid && tid.startsWith("b-")) { banksSel = [tid.slice(2)]; title = ctx.by[banksSel[0]]?.title || "Mening testim"; }
      else { const b = curBank(); banksSel = [b.id]; pickTopics = [tid]; title = b.topics.find((t) => t.id === tid)?.title || ""; }
      if (!ctx.by[banksSel[0]]) { location.hash = BASE + "/mavzu"; return; }
    } else {
      const ids = store.get("banks", [curBank().id]).filter((id) => ctx.by[id]);
      banksSel = ids.length ? ids : [curBank().id];
    }
    const total = () => (banksSel.length === 1 ? ctx.by[banksSel[0]].questions.length : 0);
    const topicsOf = () => (banksSel.length === 1 ? ctx.by[banksSel[0]].topics.filter((t) => ctx.by[banksSel[0]].questions.some((q) => q.t === t.id)) : []);

    const draw = () => {
      const N = total();
      const rangeOK = (() => {
        if (banksSel.length !== 1) return { ok: true };
        const f = String(cfg.from).trim(), t = String(cfg.to).trim();
        if (!f && !t) return { ok: true };
        const a = f ? Number(f) : 1, z = t ? Number(t) : N;
        if (!Number.isInteger(a) || !Number.isInteger(z) || a < 1 || z < 1) return { ok: false, msg: "Faqat 1 dan boshlab butun son kiriting" };
        if (a > N || z > N) return { ok: false, msg: `Bu testda jami ${N} ta savol bor. ${N} dan katta raqam kiritib bo‘lmaydi` };
        if (a > z) return { ok: false, msg: "“Dan” raqami “gacha” dan katta bo‘lmasin" };
        return { ok: true };
      })();
      const eff = { ...cfg, from: rangeOK.ok && cfg.from !== "" ? cfg.from : "", to: rangeOK.ok && cfg.to !== "" ? cfg.to : "" };
      const bk = banksSel.map((id) => ctx.by[id]);
      const pool = rangeOK.ok ? poolFor(bk, { topics: pickTopics }, eff) : [];
      const n = cfg.size ? Math.min(cfg.size, pool.length) : pool.length;
      const chipRow = (arr, cur, key, lab) => arr.map((v) => `<button class="tm-chip" data-k="${key}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${lab(v)}</button>`).join("");
      A.view.innerHTML = `<div class="hello"><h2>${mode === "mavzu" ? esc(title) : mode === "aralash" ? "Aralash test" : "Imtihon"}</h2>
        <p class="muted">${mode === "imtihon" ? "Natija test oxirida ko‘rsatiladi. Savollar orasida erkin yurish mumkin." : "Har javobdan keyin to‘g‘ri yoki xato darhol ko‘rinadi."}</p></div>
        ${bs.length > 1 && mode !== "mavzu" ? `<div class="tm-lbl">Testlar</div><div class="chips">${bs.map((x) => `<button class="tm-chip" data-bk="${esc(x.id)}" aria-pressed="${banksSel.includes(x.id)}">${esc(x.title)}</button>`).join("")}</div>` : ""}
        ${mode === "imtihon" && topicList !== false && topicsOf().length ? `<div class="tm-lbl">Mavzular</div><div class="chips"><button class="tm-chip" data-tp="all" aria-pressed="${!pickTopics.length}">Hammasi aralash</button><button class="tm-chip" data-tp="pick" aria-pressed="${!!pickTopics.length}">Mavzu tanlash${pickTopics.length ? ` (${pickTopics.length})` : ""}</button></div>` : ""}
        <div class="tm-lbl">Savollar</div><div class="chips">${chipRow(SRC.map((x) => x[0]), cfg.src, "src", (v) => SRC.find((x) => x[0] === v)[1])}</div>
        ${banksSel.length === 1 ? `<div class="tm-lbl">Savollar oralig‘i <small>(jami ${N} ta)</small></div>
          <div class="tm-range"><input id="rFrom" inputmode="numeric" placeholder="1" value="${esc(cfg.from)}" aria-label="Dan"><span>dan</span><input id="rTo" inputmode="numeric" placeholder="${N}" value="${esc(cfg.to)}" aria-label="Gacha"><span>gacha</span></div>
          ${rangeOK.ok ? "" : `<p class="tm-err">${esc(rangeOK.msg)}</p>`}` : ""}
        <div class="tm-lbl">Savollar soni</div><div class="chips">${chipRow([...SIZES, 0], cfg.size, "size", (v) => (v ? v : "Hammasi"))}</div>
        <div class="tm-lbl">Vaqt chegarasi</div><div class="chips">${chipRow(TIMES, cfg.time, "time", (v) => (v ? v + " daq" : "Cheksiz"))}</div>
        <div class="tm-lbl">Aralashtirish</div>
        <label class="tm-sw"><input type="checkbox" id="shQ" ${cfg.shQ ? "checked" : ""}><span>Savollar tartibini aralashtirish</span></label>
        <label class="tm-sw"><input type="checkbox" id="shO" ${cfg.shO ? "checked" : ""}><span>Javob variantlari joyini aralashtirish</span></label>
        <div class="tm-start"><div class="tm-cnt">${pool.length ? `Mos savollar: <b>${pool.length}</b> · testda: <b>${n}</b>${cfg.time ? ` · ${cfg.time} daqiqa` : ""}` : `<span class="tm-err" style="margin:0">Mos savol topilmadi</span>`}</div>
          <button class="btn primary" id="go" ${pool.length ? "" : "disabled"}>Boshlash</button></div>`;
      A.view.querySelectorAll("[data-k]").forEach((x) => x.addEventListener("click", () => {
        const k = x.dataset.k; cfg[k] = k === "src" ? x.dataset.v : Number(x.dataset.v); draw();
      }));
      A.view.querySelectorAll("[data-bk]").forEach((x) => x.addEventListener("click", () => {
        const id = x.dataset.bk;
        banksSel = banksSel.includes(id) ? banksSel.filter((y) => y !== id) : [...banksSel, id];
        if (!banksSel.length) banksSel = [id];
        pickTopics = []; store.set("banks", banksSel); draw();
      }));
      A.view.querySelectorAll("[data-tp]").forEach((x) => x.addEventListener("click", () => {
        if (x.dataset.tp === "all") { pickTopics = []; draw(); return; }
        const b = ctx.by[banksSel[0]];
        const sh = A.sheet(`<h3>Mavzularni tanlang</h3><div class="tm-pick">${topicsOf().map((t) => `<label class="tm-sw"><input type="checkbox" value="${esc(t.id)}" ${pickTopics.includes(t.id) ? "checked" : ""}><span>${t.no ? t.no + ". " : ""}${esc(t.title)} <small class="muted">(${b.questions.filter((q) => q.t === t.id).length})</small></span></label>`).join("")}</div>
          <div class="acts"><button class="btn" data-x="close">Bekor</button><button class="btn primary" id="tpOk">Tayyor</button></div>`);
        sh.el.querySelector("#tpOk").addEventListener("click", () => { pickTopics = [...sh.el.querySelectorAll("input:checked")].map((i) => i.value); sh.close(); draw(); });
      }));
      const fi = A.$("#rFrom"), ti = A.$("#rTo");
      if (fi) {
        const upd = (el, key) => el.addEventListener("input", () => { cfg[key] = el.value.replace(/[^\d]/g, ""); const pos = el.selectionStart; draw(); const e2 = A.$(key === "from" ? "#rFrom" : "#rTo"); e2.focus(); try { e2.setSelectionRange(pos, pos); } catch { /* */ } });
        upd(fi, "from"); upd(ti, "to");
      }
      A.$("#shQ").addEventListener("change", (e) => { cfg.shQ = e.target.checked; });
      A.$("#shO").addEventListener("change", (e) => { cfg.shO = e.target.checked; });
      A.$("#go").addEventListener("click", () => {
        store.set("set:" + mode, { src: cfg.src, size: cfg.size, time: cfg.time, shQ: cfg.shQ, shO: cfg.shO });
        buildFromSetup({ mode, banks: banksSel, topics: pickTopics, cfg: eff, title });
      });
    };
    draw();
  }

  /* ---------- Test jarayoni ---------- */
  function stopTick() { if (tick) { clearInterval(tick); tick = null; } }
  const remaining = () => (sess.end ? Math.ceil((sess.end - Date.now()) / 1000) : null);
  const imm = () => sess.mode !== "imtihon";

  async function pageRun() {
    A.setChrome(sess ? modeTitle() : "Test", true, "assyst");
    if (!sess) sess = store.get("sess", null);
    if (!sess) { location.hash = BASE; return; }
    await loadBanks();
    sess.items = sess.items.filter((it) => qOf(it));
    if (!sess.items.length) { sess = null; store.set("sess", null); location.hash = BASE; return; }
    if (sess.i >= sess.items.length) sess.i = sess.items.length - 1;
    A.setChrome(modeTitle(), true, "assyst");
    if (sess.end && remaining() <= 0) { finish(true); return; }
    drawQ();
    stopTick();
    if (sess.end) {
      tick = setInterval(() => {
        const el = A.$("#tmTimer");
        if (!el || !sess) { stopTick(); return; }
        const r = remaining();
        el.textContent = fmtT(r);
        el.classList.toggle("low", r <= 60);
        if (r <= 0) { stopTick(); A.toast("Vaqt tugadi"); finish(true); }
      }, 1000);
    }
  }
  const modeTitle = () => (sess.mode === "xato" ? "Xatolarni qayta ishlash" : sess.mode === "mavzu" ? "Mavzu bo‘yicha" : sess.mode === "aralash" ? "Aralash test" : "Imtihon");

  function correctLetters(it) { const q = qOf(it); return it.perm.map((o, j) => (q.c.includes(o) ? LET[j] : null)).filter(Boolean); }

  function drawQ() {
    const it = sess.items[sess.i], q = qOf(it);
    const total = sess.items.length;
    const multi = q.c.length > 1;
    const done = sess.items.filter((x) => x.chk).length;
    const okN = sess.items.filter((x) => x.ok === true).length;
    const showRes = imm() && it.chk;
    const fv = favs()[it.b + ":" + it.k];
    const r = remaining();
    const optsHTML = it.perm.map((o, j) => {
      const picked = it.sel.includes(o);
      let cls = "tm-opt";
      if (showRes) { if (q.c.includes(o)) cls += " right"; else if (picked) cls += " wrong"; }
      else if (picked) cls += " picked";
      return `<button class="${cls}" data-o="${o}" ${showRes ? "disabled" : ""} aria-pressed="${picked}"><span class="tm-l">${LET[j]}</span><span class="tm-ot">${A.inline(q.o[o])}</span></button>`;
    }).join("");
    let foot = "";
    if (imm()) {
      if (showRes) {
        foot = `<div class="explain tm-fb ${it.ok ? "ok" : "no"}"><strong>${it.ok ? "To‘g‘ri!" : "Noto‘g‘ri."}</strong>${it.ok ? "" : ` To‘g‘ri javob: <b>${correctLetters(it).join(", ")}</b>`}</div>
          <div class="tm-nav"><button class="btn primary" id="nx">${sess.i + 1 < total ? "Keyingi savol" : "Natijani ko‘rish"}</button></div>`;
      } else if (multi) {
        foot = `<div class="tm-nav"><button class="btn primary" id="chk" ${it.sel.length ? "" : "disabled"}>Tekshirish</button></div>`;
      }
    } else {
      foot = `<div class="tm-nav"><button class="btn" id="pv" ${sess.i === 0 ? "disabled" : ""}>Oldingi</button>
        ${sess.i + 1 < total ? `<button class="btn primary" id="nx">Keyingi</button>` : `<button class="btn primary" id="fin">Yakunlash</button>`}</div>`;
    }
    A.view.innerHTML = `<div class="tm-run">
      <div class="tm-top"><span class="tm-prog">${sess.i + 1} / ${total}</span>
        ${imm() ? `<span class="tm-sc"><i class="g">${okN}</i><i class="r">${done - okN}</i></span>` : ""}
        ${r != null ? `<span class="tm-timer${r <= 60 ? " low" : ""}" id="tmTimer">${fmtT(r)}</span>` : ""}
        <span class="tm-sp"></span>
        <button class="btn star" id="fav" aria-pressed="${!!fv}" aria-label="Sevimli">★</button>
        <button class="btn" id="shf" title="Qolgan savollar tartibini o‘zgartirish">⇄ Tartib</button>
        <button class="btn" id="more" aria-label="Menyu">⋯</button></div>
      <div class="progress tm-bar"><i style="width:${pct(imm() ? done : sess.items.filter((x) => x.sel.length).length, total)}%"></i></div>
      <div class="quiz-card tm-card">
        <p class="tm-qn">Savol №${qOf(it).n}${multi ? ` · <span class="tm-multi">bir nechta to‘g‘ri javob</span>` : ""}</p>
        <p class="quiz-q">${A.inline(q.q)}</p>
        <div class="tm-opts">${optsHTML}</div>${foot}</div></div>`;
    bindRun(it, q, multi);
  }

  function bindRun(it, q, multi) {
    const $ = A.$;
    const total = sess.items.length;
    const check = () => { it.chk = true; it.ok = isOk(q, it.sel); record(it.b, it.k, it.ok); saveSess(); drawQ(); };
    A.view.querySelectorAll(".tm-opt").forEach((b) => b.addEventListener("click", () => {
      if (imm() && it.chk) return;
      const o = Number(b.dataset.o);
      if (multi) it.sel = it.sel.includes(o) ? it.sel.filter((x) => x !== o) : [...it.sel, o];
      else it.sel = [o];
      if (imm() && !multi) { check(); return; }
      saveSess(); drawQ();
    }));
    $("#chk")?.addEventListener("click", check);
    $("#nx")?.addEventListener("click", () => { if (sess.i + 1 >= total) finish(false); else { sess.i++; saveSess(); drawQ(); window.scrollTo(0, 0); } });
    $("#pv")?.addEventListener("click", () => { if (sess.i > 0) { sess.i--; saveSess(); drawQ(); window.scrollTo(0, 0); } });
    $("#fin")?.addEventListener("click", askFinish);
    $("#fav").addEventListener("click", () => {
      const f = favs(), k = it.b + ":" + it.k;
      if (f[k]) delete f[k]; else f[k] = 1;
      store.set("fav", f); A.toast(f[k] ? "Sevimlilarga qo‘shildi" : "Sevimlilardan olib tashlandi"); drawQ();
    });
    $("#shf").addEventListener("click", reorder);
    $("#more").addEventListener("click", runMenu);
  }

  /* Qolgan (javob berilmagan) savollar tartibi va variantlarini yangidan aralashtirish */
  function reorder() {
    const slots = [];
    sess.items.forEach((x, i) => { if (i !== sess.i && !x.chk && !x.sel.length && (imm() ? i > sess.i : true)) slots.push(i); });
    const cur = sess.items[sess.i];
    const shO = sess.setup?.cfg?.shO !== false;
    const moved = shuffle(slots.map((i) => sess.items[i]));
    slots.forEach((i, j) => { sess.items[i] = moved[j]; });
    const all = [...moved, ...(!cur.chk && !cur.sel.length ? [cur] : [])];
    all.forEach((x) => { const q = qOf(x); const f = makeItem(x.b, q, shO); x.perm = f.perm; });
    saveSess(); drawQ();
    A.toast(slots.length || !cur.chk ? "Tartib o‘zgartirildi" : "O‘zgartiradigan savol qolmadi");
  }

  function runMenu() {
    const un = sess.items.filter((x) => (imm() ? !x.chk : !x.sel.length)).length;
    const grid = imm() ? "" : `<div class="tm-grid">${sess.items.map((x, i) => `<button class="${i === sess.i ? "cur" : ""}${x.sel.length ? " ans" : ""}" data-g="${i}">${i + 1}</button>`).join("")}</div>`;
    const sh = A.sheet(`<h3>Menyu</h3>${grid}
      <div class="acts" style="flex-direction:column">
        <button class="btn primary" id="mFin">Testni yakunlash${un ? ` (${un} ta javobsiz)` : ""}</button>
        <button class="btn" id="mExit">Chiqish (keyin davom ettiraman)</button>
        <button class="btn danger" id="mDel">Testni bekor qilish</button></div>`);
    sh.el.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => { sess.i = Number(b.dataset.g); saveSess(); sh.close(); drawQ(); }));
    sh.el.querySelector("#mFin").addEventListener("click", () => { sh.close(); askFinish(); });
    sh.el.querySelector("#mExit").addEventListener("click", () => { sh.close(); stopTick(); location.hash = BASE; });
    sh.el.querySelector("#mDel").addEventListener("click", () => { sh.close(); stopTick(); sess = null; store.set("sess", null); location.hash = BASE; });
  }
  function askFinish() {
    const un = sess.items.filter((x) => (imm() ? !x.chk : !x.sel.length)).length;
    const sh = A.sheet(`<h3>Testni yakunlaysizmi?</h3><p class="muted" style="margin:0">${un ? `${un} ta savolga hali javob berilmagan. Ular xato hisoblanmaydi, lekin natijaga kirmaydi.` : "Barcha savollarga javob berildi."}</p>
      <div class="acts"><button class="btn" data-x="close">Davom etish</button><button class="btn primary" id="yes">Yakunlash</button></div>`);
    sh.el.querySelector("#yes").addEventListener("click", () => { sh.close(); finish(false); });
  }

  function finish(timeUp) {
    stopTick();
    if (!sess) return;
    const s = sess;
    if (s.mode === "imtihon") {
      s.items.forEach((it) => { if (it.sel.length) { const q = qOf(it); it.chk = true; it.ok = isOk(q, it.sel); record(it.b, it.k, it.ok); } });
    }
    const ok = s.items.filter((x) => x.ok === true).length;
    const bad = s.items.filter((x) => x.ok === false).length;
    const secs = Math.round((Date.now() - s.t0) / 1000);
    const isRev = s.mode === "xato";
    addHist({ at: Date.now(), b: s.setup?.banks || [], m: s.mode, n: s.items.length, ok, bad, s: secs, r: isRev ? 1 : 0, tp: (s.setup?.topics || [])[0] || null });
    lastRes = { sess: s, ok, bad, sk: s.items.length - ok - bad, secs, timeUp: !!timeUp };
    store.set("last", lastRes);
    sess = null; store.set("sess", null);
    location.hash = BASE + "/natija";
  }

  /* ---------- Natija ---------- */
  async function pageResult() {
    A.setChrome("Natija", true, "assyst");
    await loadBanks();
    if (!lastRes) lastRes = store.get("last", null);
    if (!lastRes) { location.hash = BASE; return; }
    const r = lastRes, s = r.sess;
    const answered = r.ok + r.bad;
    const p = pct(r.ok, s.items.length);
    const wrongItems = s.items.filter((x) => x.ok === false);
    const isRev = s.mode === "xato";
    const parent = s.parent || s.setup;
    const passed = p >= PASS;
    const msg = r.bad === 0 && r.sk === 0 ? (isRev ? "Hammasi to‘g‘ri! Xatolar tugadi 🎉" : "Ajoyib! Xatosiz topshirdingiz 🎉") : passed ? "Yaxshi natija" : "Yana ozgina mashq kerak";
    A.view.innerHTML = `<div class="tm-res">
      <p class="muted" style="margin:0">${isRev ? `Xatolarni qayta ishlash · ${(s.round || 1)}-urinish` : esc(modeTitleOf(s.mode))}${r.timeUp ? " · vaqt tugadi" : ""}</p>
      <div class="tm-ring">${A.ring(p, 120)}</div>
      <h2 class="tm-msg">${msg}</h2>
      <div class="stats3"><div class="stat"><b style="color:var(--ok)">${r.ok}</b><small>to‘g‘ri</small></div><div class="stat"><b style="color:var(--bad)">${r.bad}</b><small>xato</small></div><div class="stat"><b>${r.sk}</b><small>javobsiz</small></div></div>
      <p class="small muted">Vaqt: ${fmtT(r.secs)} · ${s.items.length} ta savol${!isRev ? ` · ${passed ? "o‘tdi" : "o‘tmadi"} (${PASS}% dan)` : ""}</p>
      <div class="tm-acts">
        ${wrongItems.length ? `<button class="btn primary" id="rev">Xatolarni qayta ishlash (${wrongItems.length})</button>` : ""}
        ${parent ? `<button class="btn ${wrongItems.length ? "" : "primary"}" id="newT">${wrongItems.length ? "Xatolarni ko‘rmasdan yangi test" : "Yangi test"}</button>` : ""}
        <button class="btn" id="again">Qayta boshlash (shu savollar, boshqa tartibda)</button>
        <button class="btn" id="show">Javoblarni ko‘rish</button>
        <a class="btn" href="${BASE}">Test markaziga qaytish</a>
      </div>
      <div id="ansList"></div></div>`;
    const $ = A.$;
    $("#rev")?.addEventListener("click", () => {
      const items = shuffle(wrongItems).map((x) => makeItem(x.b, qOf(x), s.setup?.cfg?.shO !== false));
      newSess({ mode: "xato", banks: s.setup?.banks || [], topics: [], cfg: { ...(s.setup?.cfg || {}), time: 0, size: 0 } }, items, { parent, round: (s.round || 0) + 1 });
    });
    $("#newT")?.addEventListener("click", () => { if (!buildFromSetup(parent)) return; });
    $("#again").addEventListener("click", () => {
      const sh = s.setup?.cfg?.shO !== false;
      const items = shuffle(s.items).map((x) => makeItem(x.b, qOf(x), sh));
      newSess(s.setup || { mode: s.mode, banks: [], topics: [], cfg: { time: 0 } }, items, { parent: s.parent, round: s.round });
    });
    $("#show").addEventListener("click", () => {
      const box = $("#ansList");
      if (box.innerHTML) { box.innerHTML = ""; return; }
      box.innerHTML = s.items.map((it, i) => {
        const q = qOf(it);
        const mark = it.ok === true ? "✓" : it.ok === false ? "✗" : "–";
        return `<details class="tm-ans ${it.ok === true ? "ok" : it.ok === false ? "no" : ""}"><summary><b>${mark}</b> ${i + 1}. ${A.inline(q.q)}</summary>
          <div class="tm-al">${q.o.map((o, j) => `<div class="${q.c.includes(j) ? "right" : it.sel.includes(j) ? "wrong" : ""}">${q.c.includes(j) ? "✓" : it.sel.includes(j) ? "✗" : "·"} ${A.inline(o)}${it.sel.includes(j) ? " <small class='muted'>(sizning javobingiz)</small>" : ""}</div>`).join("")}</div></details>`;
      }).join("");
    });
  }
  const modeTitleOf = (m) => (m === "xato" ? "Xatolarni qayta ishlash" : m === "mavzu" ? "Mavzu bo‘yicha" : m === "aralash" ? "Aralash test" : "Imtihon");

  /* ---------- Kartochkalar ---------- */
  const DAY = 864e5;
  function dueCards(bs) {
    let n = 0;
    for (const b of bs) { const kn = store.get("know:" + b.id, {}); for (const k in kn) if (kn[k][0] === 1 && Date.now() - kn[k][1] > 3 * DAY) n++; }
    return n;
  }
  let deck = null;
  async function pageCards(query) {
    A.setChrome("Kartochkalar", true, "assyst");
    await loadBanks();
    const b = curBank();
    if (!b) { A.view.innerHTML = A.emptyState(A.ICX.warn, "Testlar yuklanmadi", ""); return; }
    const kn = store.get("know:" + b.id, {});
    const cfg = { topic: "", f: "all", ...store.get("cardcfg", {}) };
    const draw = () => {
      const qs = b.questions.filter((q) => (!cfg.topic || q.t === cfg.topic) &&
        (cfg.f === "all" || (cfg.f === "unk" && kn[q._k]?.[0] !== 1) || (cfg.f === "new" && !kn[q._k]) || (cfg.f === "due" && kn[q._k]?.[0] === 1 && Date.now() - kn[q._k][1] > 3 * DAY)));
      const knownN = b.questions.filter((q) => kn[q._k]?.[0] === 1).length;
      A.view.innerHTML = `<div class="hello"><h2>Kartochkalar</h2><p class="muted">Savol — old tomonda, to‘g‘ri javob — orqa tomonda. Bilganingizni belgilang.</p></div>
        <div class="tm-bank">${A.ring(pct(knownN, b.questions.length), 56)}<div class="tm-bank-t"><b>${esc(b.title)}</b><small>Bilaman: ${knownN} / ${b.questions.length}</small></div></div>
        <div class="tm-lbl">Mavzu</div>
        <select id="cTopic" class="tm-sel"><option value="">Barcha mavzular</option>${b.topics.filter((t) => b.questions.some((q) => q.t === t.id)).map((t) => `<option value="${esc(t.id)}" ${cfg.topic === t.id ? "selected" : ""}>${t.no ? t.no + ". " : ""}${esc(t.title.slice(0, 70))}</option>`).join("")}</select>
        <div class="tm-lbl">Qaysi kartochkalar</div>
        <div class="chips">${[["all", "Hammasi"], ["unk", "Bilmaganlarim"], ["new", "Yangilari"], ["due", "Takrorlash vaqti"]].map(([v, t]) => `<button class="tm-chip" data-f="${v}" aria-pressed="${cfg.f === v}">${t}</button>`).join("")}</div>
        <div class="tm-start"><div class="tm-cnt">Kartochkalar: <b>${qs.length}</b></div><button class="btn primary" id="cGo" ${qs.length ? "" : "disabled"}>Boshlash</button></div>`;
      A.$("#cTopic").addEventListener("change", (e) => { cfg.topic = e.target.value; store.set("cardcfg", cfg); draw(); });
      A.view.querySelectorAll("[data-f]").forEach((x) => x.addEventListener("click", () => { cfg.f = x.dataset.f; store.set("cardcfg", cfg); draw(); }));
      A.$("#cGo").addEventListener("click", () => { deck = { b, list: shuffle(qs), i: 0, ok: 0, no: 0, hist: [] }; runCards(); });
    };
    draw();
  }
  function runCards() {
    const d = deck, b = d.b;
    if (d.i >= d.list.length) {
      A.view.innerHTML = `<div class="tm-res"><h2 class="tm-msg">Kartochkalar tugadi</h2>
        <div class="stats3"><div class="stat"><b style="color:var(--ok)">${d.ok}</b><small>bilaman</small></div><div class="stat"><b style="color:var(--bad)">${d.no}</b><small>bilmayman</small></div><div class="stat"><b>${d.list.length}</b><small>jami</small></div></div>
        <div class="tm-acts">${d.no ? `<button class="btn primary" id="cUnk">Bilmaganlarni o‘rganish (${d.no})</button>` : ""}<a class="btn" href="${BASE}">Test markaziga qaytish</a></div></div>`;
      A.$("#cUnk")?.addEventListener("click", () => { const kn = store.get("know:" + b.id, {}); deck = { b, list: shuffle(d.list.filter((q) => kn[q._k]?.[0] !== 1)), i: 0, ok: 0, no: 0, hist: [] }; runCards(); });
      return;
    }
    const q = d.list[d.i];
    const ans = q.c.map((i) => q.o[i]);
    A.view.innerHTML = `<div class="tm-run"><div class="tm-top"><span class="tm-prog">${d.i + 1} / ${d.list.length}</span><span class="tm-sp"></span>
        <button class="btn" id="cUndo" ${d.hist.length ? "" : "disabled"}>↶ Qaytarish</button></div>
      <div class="progress tm-bar"><i style="width:${pct(d.i, d.list.length)}%"></i></div>
      <div class="flash" id="flash"><div class="flash-inner" role="button" tabindex="0" aria-label="Kartochkani aylantirish">
        <div class="flash-face"><strong style="font-size:1.08rem">${A.inline(q.q)}</strong><span class="flash-hint">Javobni ko‘rish uchun bosing</span></div>
        <div class="flash-face flash-back"><span style="font-size:1.05rem">${ans.map((x) => "• " + A.inline(x)).join("<br>")}</span></div></div></div>
      <div class="tm-nav" style="margin-top:0"><button class="btn danger" id="cNo">Bilmayman</button><button class="btn primary" id="cYes">Bilaman</button></div></div>`;
    const fl = A.$("#flash"), inner = A.$(".flash-inner");
    const flip = () => fl.classList.toggle("flipped");
    inner.addEventListener("click", flip);
    inner.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    const mark = (v) => {
      const kn = store.get("know:" + b.id, {});
      d.hist.push([q._k, kn[q._k] || null, v]);
      kn[q._k] = [v, Date.now()];
      store.set("know:" + b.id, kn);
      if (v) d.ok++; else d.no++;
      d.i++; runCards();
    };
    A.$("#cYes").addEventListener("click", () => mark(1));
    A.$("#cNo").addEventListener("click", () => mark(0));
    A.$("#cUndo").addEventListener("click", () => {
      const h = d.hist.pop(); if (!h) return;
      const kn = store.get("know:" + b.id, {});
      if (h[1]) kn[h[0]] = h[1]; else delete kn[h[0]];
      store.set("know:" + b.id, kn);
      if (h[2]) d.ok--; else d.no--;
      d.i--; runCards();
    });
  }

  /* ---------- Statistika ---------- */
  async function pageStats() {
    A.setChrome("Statistika", true, "assyst");
    await loadBanks();
    const hist = store.get("hist", []).filter((h) => !h.r);
    const all = store.get("hist", []);
    const tests = hist.length;
    const sumOk = all.reduce((a, h) => a + h.ok, 0), sumN = all.reduce((a, h) => a + h.ok + h.bad, 0);
    const passed = hist.filter((h) => pct(h.ok, h.n) >= PASS).length;
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
    const perDay = days.map((d) => { const a = d.getTime(), z = a + DAY; return all.filter((h) => h.at >= a && h.at < z).reduce((n, h) => n + h.ok + h.bad, 0); });
    const mx = Math.max(1, ...perDay);
    const b = curBank();
    const st = b ? stOf(b.id) : {};
    const topicRows = b ? b.topics.map((t) => {
      const qs = b.questions.filter((q) => q.t === t.id);
      if (!qs.length) return "";
      let ans = 0, ok = 0; qs.forEach((q) => { const s = st[q._k]; if (s) { ans++; ok += s[0]; } });
      return `<div class="tm-trow"><span class="tm-ttl">${t.no ?? ""}. ${esc(t.title)}</span><span class="tm-tbar"><i class="a" style="width:${pct(ans, qs.length)}%"></i><i class="o" style="width:${pct(ok, qs.length)}%"></i></span><small>${ok}/${qs.length}</small></div>`;
    }).join("") : "";
    A.view.innerHTML = `<div class="hello"><h2>Statistika</h2><p class="muted">Test markazidagi natijalaringiz.</p></div>
      <div class="stats3"><div class="stat"><b>${tests}</b><small>test ishlandi</small></div><div class="stat"><b>${sumN ? pct(sumOk, sumN) + "%" : "—"}</b><small>to‘g‘ri javoblar</small></div><div class="stat"><b>${passed}</b><small>o‘tgan testlar</small></div></div>
      <h3 class="group-label">Oxirgi 14 kun (javob berilgan savollar)</h3>
      <div class="tm-chart">${perDay.map((n, i) => `<div class="tm-col"><i style="height:${Math.max(n ? 6 : 2, pct(n, mx))}%" title="${n}"></i><small>${days[i].getDate()}</small></div>`).join("")}</div>
      ${b ? `<h3 class="group-label">${esc(b.title)} — mavzular bo‘yicha</h3><div class="tm-legend"><span><i class="a"></i> ishlangan</span><span><i class="o"></i> to‘g‘ri</span></div>${topicRows}` : ""}
      <h3 class="group-label">Oxirgi testlar</h3>
      ${hist.length ? hist.slice(-15).reverse().map((h) => { const d = new Date(h.at); return `<div class="read-row"><span><b class="small">${esc(modeTitleOf(h.m))}</b><br><span class="small muted">${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")} · ${h.n} ta savol · ${fmtT(h.s)}</span></span><span class="score-pill ${pct(h.ok, h.n) >= 86 ? "hi" : pct(h.ok, h.n) < PASS ? "lo" : ""}">${pct(h.ok, h.n)}%</span></div>`; }).join("")
        : A.emptyState(A.ICX.trophy, "Hali test ishlanmagan", "Birinchi testni ishlang — natijalar shu yerda ko‘rinadi.", `<a class="btn primary" href="${BASE}">Test markazi</a>`)}`;
  }

  /* ---------- O'z testini qo'shish ---------- */
  const AI_PROMPT = `Quyidagi matn asosida test savollari tuz. Qat'iy shu formatda yoz:
? Savol matni
+ To'g'ri javob
- Xato javob
- Xato javob
- Xato javob

Qoidalar: har savol "?" bilan boshlansin; to'g'ri javob "+", xato javob "-" bilan; har savolda 4 ta variant; bir nechta to'g'ri javob bo'lsa hammasiga "+" qo'y; savollar orasida bo'sh qator qoldir; boshqa izoh yozma.`;
  async function pageAdd() {
    A.setChrome("O‘z testim", true, "assyst");
    await loadBanks();
    const users = ctx.banks.filter((b) => b.user);
    A.view.innerHTML = `<div class="hello"><h2>O‘z testim</h2><p class="muted">Matnni joylang yoki .txt fayl tanlang. Test faqat shu telefonda saqlanadi.</p></div>
      <label class="field tm-f">Test nomi<input id="aTitle" placeholder="masalan, Farmakologiya — 1-bob"></label>
      <label class="field tm-f">Savollar<textarea id="aText" rows="9" placeholder="? Savol matni&#10;+ To'g'ri javob&#10;- Xato javob&#10;- Xato javob"></textarea></label>
      <div class="tm-cnt" id="aInfo">Savollar: <b>0</b></div>
      <div id="aErr"></div>
      <div class="tm-acts" style="margin-top:12px"><button class="btn primary" id="aSave" disabled>Saqlash</button>
        <button class="btn" id="aFile">.txt fayldan olish</button><input id="aPick" type="file" accept=".txt,text/plain" hidden>
        <button class="btn" id="aAi">AI uchun ko‘rsatmani nusxalash</button></div>
      <p class="small muted">Format: savol “?” bilan, to‘g‘ri javob “+”, xato javob “-” bilan boshlanadi. Bir nechta “+” bo‘lsa — ko‘p javobli savol.</p>
      <h3 class="group-label">Mening testlarim</h3>
      ${users.length ? users.map((u) => `<div class="read-row"><span><b>${esc(u.title)}</b><br><span class="small muted">${u.questions.length} ta savol</span></span>
        <span style="display:flex;gap:6px"><button class="btn" data-ex="${esc(u.id)}">Eksport</button><button class="btn danger" data-del="${esc(u.id)}">O‘chirish</button></span></div>`).join("")
        : `<p class="small muted">Hali o‘z testingiz yo‘q.</p>`}`;
    const $ = A.$;
    const upd = () => {
      const r = parseText($("#aText").value);
      $("#aInfo").innerHTML = `To‘g‘ri o‘qilgan savollar: <b>${r.qs.length}</b>${r.errs.length ? ` · xatolar: <b style="color:var(--bad)">${r.errs.length}</b>` : ""}`;
      $("#aErr").innerHTML = r.errs.length ? `<ul class="tm-errs">${r.errs.slice(0, 6).map((e) => `<li>${esc(e)}</li>`).join("")}${r.errs.length > 6 ? `<li>… yana ${r.errs.length - 6} ta</li>` : ""}</ul>` : "";
      $("#aSave").disabled = !r.qs.length;
      return r;
    };
    $("#aText").addEventListener("input", upd);
    $("#aFile").addEventListener("click", () => $("#aPick").click());
    $("#aPick").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      $("#aText").value = await f.text();
      if (!$("#aTitle").value) $("#aTitle").value = f.name.replace(/\.[^.]+$/, "");
      upd();
    });
    $("#aAi").addEventListener("click", async () => { try { await navigator.clipboard.writeText(AI_PROMPT); A.toast("Nusxalandi. AI ga konspektingiz bilan birga yuboring"); } catch { A.toast("Nusxalab bo‘lmadi"); } });
    $("#aSave").addEventListener("click", () => {
      const r = upd(); if (!r.qs.length) return;
      const arr = store.get("user", []);
      arr.push({ id: "u" + uid(), title: $("#aTitle").value.trim() || "Mening testim", questions: r.qs });
      store.set("user", arr); dropCtx();
      A.toast(`Saqlandi: ${r.qs.length} ta savol`); pageAdd();
    });
    A.view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Bu test o‘chirilsinmi? Natijalar ham o‘chadi.")) return;
      delUser(b.dataset.del); pageAdd();
    }));
    A.view.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => {
      const u = users.find((x) => x.id === b.dataset.ex);
      const txt = u.questions.map((q) => `? ${q.q}\n${q.o.map((o, i) => (q.c.includes(i) ? "+ " : "- ") + o).join("\n")}`).join("\n\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = u.title + ".txt";
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }));
  }

  /* ---------- Yo'naltirgich ---------- */
  async function page(api, p, query) {
    A = api;
    if (p[1] !== "run") stopTick();
    const sub = p[1];
    if (!sub) return pageHome();
    if (["mavzu", "aralash", "imtihon", "kartochka"].includes(sub)) {   // test bo'lmasa (masalan, tilga mos test hali yo'q) bosh sahifaga
      await loadBanks();
      if (!ctx.banks.length) { location.replace(BASE); return; }
    }
    if (sub === "mavzu") return p[2] ? pageSetup("mavzu", p[2], query) : pageTopics();
    if (sub === "aralash") return pageSetup("aralash", null, query);
    if (sub === "imtihon") return pageSetup("imtihon", null, query);
    if (sub === "run") return pageRun();
    if (sub === "natija") return pageResult();
    if (sub === "kartochka") return pageCards(query);
    if (sub === "statistika") return pageStats();
    if (sub === "qoshish") return pageAdd();
    return pageHome();
  }
  window.TM = { page, reset: dropCtx };
})();
