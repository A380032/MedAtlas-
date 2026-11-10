/* Tibbiyot qo'llanma — asosiy ilova kodi.
   Kontent data/ papkasidagi JSON fayllarda turadi, bu kod faqat ularni ko'rsatadi. */
(() => {
  "use strict";

  /* ---------- Saqlash (telefon xotirasida) ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("tq:" + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("tq:" + key, JSON.stringify(value)); } catch { /* xotira yopiq */ }
      if (window.ACC) window.ACC.touch(key);
    }
  };

  /* ---------- Yordamchilar ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* **qalin**, ~pastki~, ^yuqori^ belgilarini ko'rsatadi */
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/~([^~\s][^~]*?)~/g, "<sub>$1</sub>")
    .replace(/\^([^\^\s][^\^]*?)\^/g, "<sup>$1</sup>");
  const plain = (s) => String(s ?? "").replace(/\*\*/g, "").replace(/~([^~\s][^~]*?)~/g, "$1").replace(/\^([^\^\s][^\^]*?)\^/g, "$1");
  const fold = (s) => plain(s).toLowerCase().replace(/[‘’ʻʼ`´]/g, "'");
  const view = $("#view");
  const titleEl = $("#pageTitle");
  const backBtn = $("#backBtn");

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- Ma'lumotlarni yuklash ---------- */
  const cache = {};
  async function loadJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path).then((r) => {
        if (!r.ok) throw new Error(path);
        return r.json();
      }).catch((e) => { delete cache[path]; throw e; });
    }
    return cache[path];
  }
  const catalog = () => loadJSON("data/catalog.json");

  async function findSubject(sid) {
    const cat = await catalog();
    for (const c of cat.courses) {
      const s = c.subjects.find((x) => x.id === sid);
      if (s) return { course: c, meta: s };
    }
    return null;
  }
  async function loadSubject(sid) {
    const f = await findSubject(sid);
    if (!f || f.meta.status !== "ready") return null;
    const data = await loadJSON(f.meta.file);
    return { ...f, data };
  }

  /* ---------- Holat: o'qilgan, saqlangan, oxirgi ---------- */
  const isDone = (sid, tid) => !!(store.get("done", {})[sid + "/" + tid]);
  function setDone(sid, tid, val) {
    const k = sid + "/" + tid;
    const d = store.get("done", {});
    if (val) d[k] = 1; else delete d[k];
    store.set("done", d);
    // o'qilgan sana (Yutuqlar uchun) va rejadagi shu mavzu
    const r = store.get("res", {});
    if (val) { if (!r[k]) r[k] = { at: new Date().toISOString(), score: null }; } else delete r[k];
    store.set("res", r);
    if (val) {
      const pl = store.get("plan", []), today = ymd(new Date());
      let ch = false;
      pl.forEach((p) => { if (p.sid === sid && p.tid === tid && !p.done && p.date <= today) { p.done = true; p.doneAt = new Date().toISOString(); ch = true; } });
      if (ch) { store.set("plan", pl); toast("Rejadagi mavzu bajarildi ✓"); checkWeekWin(today); }
    }
  }
  const isSaved = (sid, tid) => store.get("saved", []).includes(sid + "/" + tid);
  function toggleSaved(sid, tid) {
    const key = sid + "/" + tid;
    let s = store.get("saved", []);
    const had = s.includes(key);
    s = had ? s.filter((x) => x !== key) : [key, ...s];
    store.set("saved", s);
    return !had;
  }

  /* ---------- Kontent bloklarini chizish ---------- */
  const BOX_LABEL = { eslab: "Eslab qoling", yodlash: "Yodlash usuli", diqqat: "Diqqat", klinik: "Klinik ahamiyati" };

  function renderBlocks(blocks = []) {
    return blocks.map((b) => {
      switch (b.type) {
        case "h": return `<h3>${inline(b.text)}</h3>`;
        case "sub": return `<h4 class="sub">${inline(b.text)}</h4>`;
        case "p": return `<p>${inline(b.text)}</p>`;
        case "note": return `<div class="note">${inline(b.text)}</div>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          const start = b.ordered && b.start > 1 ? ` start="${b.start}"` : "";
          return `<${tag}${start}>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`;
        }
        case "table": return `<div class="tbl">${b.title ? `<p class="tbl-title">${inline(b.title)}</p>` : ""}
          <div class="table-wrap" tabindex="0"><table><thead><tr>${b.head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>
          <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
        case "img": return `<figure class="fig"><img loading="lazy" decoding="async" src="${esc(b.src)}" width="${b.w || ""}" height="${b.h || ""}" alt="${esc(plain(b.label + " " + (b.caption || "")).trim())}" data-zoom>
          ${b.label || b.caption ? `<figcaption>${b.label ? `<strong>${esc(b.label)}.</strong> ` : ""}${inline(b.caption || "")}</figcaption>` : ""}</figure>`;
        case "box": return `<aside class="box box-${esc(b.kind)}"><div class="box-label">${esc(BOX_LABEL[b.kind] || "")}</div>${renderBlocks(b.parts)}</aside>`;
        default: return "";
      }
    }).join("");
  }

  /* Rasmni kattalashtirish */
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-zoom]");
    if (!img) return;
    const box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML = `<button class="lb-close" aria-label="Yopish">✕</button><div class="lb-scroll"><img src="${esc(img.currentSrc || img.src)}" alt="${esc(img.alt)}"></div>`;
    const close = () => { box.remove(); document.body.classList.remove("noscroll"); };
    box.addEventListener("click", (ev) => { if (ev.target === box || ev.target.closest(".lb-close")) close(); });
    document.body.classList.add("noscroll");
    document.body.appendChild(box);
  });

  /* ---------- Ikonkalar ---------- */
  const svg = (d, w = 24, sw = 1.8) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    sim: '<path d="M6 3v6a5 5 0 0 0 10 0V3M11 14v2a4 4 0 0 0 8 0v-2"/><circle cx="19" cy="12" r="2"/>',
    assyst: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    redo: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    test: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    bookmark: '<path d="M7 3h10v18l-5-4-5 4z"/>'
  };
  const SUBJ = {
    "anatomiya-1": '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.3 8.3l7.4 7.4M5 9.5l-1 2.5M9.5 5L12 4M19 14.5l1-2.5M14.5 19L12 20"/>',
    gistologiya: '<path d="M9 3l3 6M7 9h6M10 14a4 4 0 0 0 7-3M5 20h14M12 17v3"/>',
    biologiya: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8"/>',
    lotin: '<path d="M4 18l5-12 5 12M6 14h6M16 12h4M18 12v6"/>',
    fiziologiya: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    biokimyo: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
    mikrobiologiya: '<rect x="5" y="9" width="14" height="6" rx="3" transform="rotate(-35 12 12)"/><circle cx="18.5" cy="5.5" r="1.5"/><circle cx="5.5" cy="18.5" r="1.5"/>',
    bkp: '<path d="M12 4v8M9 8C5 9 4 14 4 18c0 1.5 1.5 2 3 1l2-2V8M15 8c4 1 5 6 5 10 0 1.5-1.5 2-3 1l-2-2V8"/>',
    ikp: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    farmakologiya: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
    patanatomiya: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    patfiziologiya: '<path d="M4 18l4-6 3 3 4-8 5 9M4 21h16"/>'
  };
  const subjIco = (sid, w = 26) => svg(SUBJ[sid] || IC.book, w);
  const chev = `<svg class="chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ring = (pct, size = 56) => {
    const r = 22, c = 2 * Math.PI * r;
    return `<span class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 56 56" width="${size}" height="${size}" aria-hidden="true"><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 28 28)"/></svg><b>${pct}%</b></span>`;
  };

  /* ---------- Sahifalar ---------- */
  const navLinks = [...document.querySelectorAll(".tabbar a")];
  navLinks.forEach((a) => a.addEventListener("click", (e) => {
    const tab = a.dataset.tab, last = tabLast[tab];
    if (!last || tab === curTab || last === a.getAttribute("href")) return;   // shu bo'limda bo'lsa — bosh sahifasiga
    if (tab === "rooms" && !window.ROOMS?.active?.()) return;                 // xonadan chiqilgan bo'lsa — ro'yxat
    if (tab === "assyst" && /\/run$/.test(last) && !localStorage.getItem("tq:tm:sess")) return;
    e.preventDefault();
    location.hash = last;
  }));
  const srchBtn = $("#srchBtn"), accBtn = $("#accBtn");
  // Har bir bo'lim oxirgi ochilgan joyini eslab qoladi (masalan, yarim qolgan test)
  const tabLast = {}, TAB_KEEP = ["assyst", "sim", "rooms", "fanlar"];
  let curTab = "";
  function setChrome(title, back, tab, opt = {}) {
    curTab = tab;
    if (TAB_KEEP.includes(tab)) tabLast[tab] = location.hash;
    view.classList.remove("wide");
    titleEl.textContent = title;
    $(".topbar").classList.toggle("is-home", !!opt.home);
    document.title = opt.home ? "ALVORA Med" : title + " · ALVORA Med";
    backBtn.hidden = !back;
    $("#rdSearch").hidden = !(tab === "fanlar" && back);
    srchBtn.hidden = tab === "search" || (tab === "fanlar" && !!back);
    accBtn.hidden = !opt.home;
    navLinks.forEach((a) => {
      a.removeAttribute("aria-current"); a.removeAttribute("data-soft");
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
      else if (tab === "fanlar" && a.dataset.tab === "home") a.dataset.soft = "1";
    });
    const mb = $("#moreBtn");
    if (mb) { if (["lib", "saved", "sozlamalar", "yutuq", "reja", "search"].includes(tab)) mb.setAttribute("aria-current", "page"); else mb.removeAttribute("aria-current"); }
  }

  async function courseStats(course) {
    const done = store.get("done", {});
    return Promise.all(course.subjects.map(async (s) => {
      let total = 0, read = 0;
      if (s.status === "ready") {
        try {
          const d = await loadJSON(s.file);
          total = d.topics.length;
          read = d.topics.filter((t) => done[s.id + "/" + t.id]).length;
        } catch { /* offline va hali yuklanmagan */ }
      }
      return { s, total, read };
    }));
  }
  const subjCard = ({ s, total, read }) => s.status !== "ready"
    ? `<div class="fan-card soon" style="--c:${esc(s.color)}"><span class="fan-ico">${subjIco(s.id)}</span>
        <span class="fan-txt"><b>${esc(s.abbr)}</b><span class="fan-name">${esc(s.name)}</span><span class="fan-meta">Tayyorlanmoqda</span></span></div>`
    : `<a class="fan-card" href="#/fan/${esc(s.id)}" style="--c:${esc(s.color)}"><span class="fan-ico">${subjIco(s.id)}</span>
        <span class="fan-txt"><b>${esc(s.abbr)}</b><span class="fan-name">${esc(s.name)}</span><span class="fan-meta">${read} / ${total} mavzu</span>
        <span class="progress"><i style="width:${total ? Math.round(read / total * 100) : 0}%"></i></span></span></a>`;

  async function pageHome() {
    setChrome("Bosh sahifa", false, "home", { home: true });
    const cat = await catalog();
    const current = store.get("course", "3");
    const course = cat.courses.find((c) => c.id === current) || cat.courses[0];
    const last = store.get("last", null);
    const stats = await courseStats(course);
    const total = stats.reduce((n, x) => n + x.total, 0), read = stats.reduce((n, x) => n + x.read, 0);
    const pct = total ? Math.round(read / total * 100) : 0;
    const wn = Object.keys(store.get("wrong", {})).length;

    let resume = "";
    if (last) {
      resume = `<a class="resume" href="#/fan/${esc(last.sid)}/${esc(last.tid)}"><span class="play">${svg(IC.play, 22, 0)}</span>
        <span class="resume-txt"><small>Davom ettirish · ${esc(last.subject)}</small><strong>${esc(last.title)}</strong></span></a>`;
    }
    const lb = store.get("lastBook", null);
    if (lb && store.get("bookpos:" + lb.sid, 0) > 300) {
      resume += `<a class="resume alt" href="#/fan/${esc(lb.sid)}/kitob"><span class="play">${svg(IC.book, 22)}</span>
        <span class="resume-txt"><small>Qo‘llanmani davom ettirish</small><strong>${esc(lb.name)}</strong></span></a>`;
    }
    const quick = [
      ["#/reja", IC.plan, "Reja", ""],
      ["#/yutuqlar", ICX.trophy, "Yutuqlar", ""],
      ["#/testmarkazi", IC.assyst, "Test markazi", ""],
      ["#/xatolar", IC.redo, "Xatolar", wn ? String(wn) : ""]
    ].map(([h, ic, t, n]) => `<a class="quick" href="${h}"><span class="quick-ico">${svg(ic, 24)}${n ? `<i class="badge">${n}</i>` : ""}</span><span>${t}</span></a>`).join("");

    view.innerHTML = `
      <section class="hero">
        <div><h2>Xush kelibsiz 👋</h2><p class="muted">Bugun nimani o'qiymiz?</p></div>
      </section>
      <a class="goal" href="#/fanlar">${ring(pct, 62)}
        <span class="goal-txt"><b>Kurs bo'yicha jarayon</b><small>${esc(course.name)} · ${read} / ${total} mavzu o'qildi</small></span>${chev}</a>
      ${todayPlanHTML()}
      <div class="course-switch" role="group" aria-label="Kurs">
        ${cat.courses.map((c) => `<button data-course="${esc(c.id)}" aria-pressed="${c.id === course.id}">${esc(c.name)}</button>`).join("")}
      </div>
      ${resume}
      <div class="quick-row">${quick}</div>
      <div class="sec-head"><h3>Asosiy fanlar</h3><a href="#/fanlar">Barcha fanlar ›</a></div>
      <div class="fan-grid">${stats.map(subjCard).join("")}</div>`;

    view.querySelectorAll("[data-course]").forEach((b) => b.addEventListener("click", () => {
      store.set("course", b.dataset.course);
      pageHome();
    }));
    const tp = $("#todayPlan");
    if (tp) bindPlan(tp, () => { if ((location.hash || "#/") === "#/" || location.hash === "#") pageHome(); });
  }

  async function pageFanlar() {
    setChrome("Fanlar", false, "fanlar");
    const cat = await catalog();
    let cur = store.get("course", "3");
    if (!cat.courses.some((c) => c.id === cur)) cur = cat.courses[0].id;
    const draw = async () => {
      const course = cat.courses.find((c) => c.id === cur);
      const stats = await courseStats(course);
      $("#fanGrid").innerHTML = stats.map(subjCard).join("");
    };
    view.innerHTML = `<div class="hello"><h2>Fanlar</h2><p class="muted">Asosiy tibbiy fanlar bo'yicha mavzular, darsliklar va testlar.</p></div>
      <div class="seg flat" role="tablist">${cat.courses.map((c) => `<button role="tab" data-c="${esc(c.id)}" aria-selected="${c.id === cur}">${esc(c.name)}</button>`).join("")}</div>
      <div class="fan-grid" id="fanGrid"></div>`;
    view.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
      cur = b.dataset.c; store.set("course", cur);
      view.querySelectorAll("[data-c]").forEach((x) => x.setAttribute("aria-selected", x === b));
      draw();
    }));
    await draw();
  }

  /* Hali to'ldirilmagan bo'limlar */
  function pageSoon(tab, title, lead, chips, icon) {
    setChrome(title, false, tab);
    view.innerHTML = `<div class="hello"><h2>${esc(title)}</h2><p class="muted">${esc(lead)}</p></div>
      <div class="seg flat" aria-hidden="true">${chips.map((c, i) => `<button disabled aria-selected="${i === 0}">${esc(c)}</button>`).join("")}</div>
      <div class="soon-card"><span class="soon-ico">${svg(icon, 40, 1.6)}</span>
        <h3>Tez orada</h3><p class="muted">Bu bo'lim tayyorlanmoqda. Mazmuni keyinroq qo'shiladi.</p></div>`;
  }

  async function pageSettings() {
    setChrome("Sozlamalar", true, "sozlamalar");
    const th = store.get("theme", null);
    view.innerHTML = `<div class="hello"><h2>Sozlamalar</h2></div>
      <section class="settings acc-sec" id="accBox"><p class="small muted" style="margin:0">Hisob yuklanmoqda…</p></section>
      <section class="settings">
        <div class="setting-col"><span>Ko'rinish</span>
          <div class="seg flat" role="group" style="margin:8px 0 0">
            <button data-th="" aria-selected="${!th}">Avto</button><button data-th="light" aria-selected="${th === "light"}">Yorug‘</button><button data-th="dark" aria-selected="${th === "dark"}">Tungi</button></div></div>
        <div class="setting-row"><span>Ilovani telefonga o'rnatish</span><button class="btn" id="installBtn">Qanday?</button></div>
        <div class="setting-row about"><span class="small"><strong>ALVORA Med</strong><br>Yaratuvchi jamoa: ALVORA<br>Muallif: Asadbek Axmatkulov, 2-son davolash ishi</span></div>
        <div class="setting-row small muted"><span>Versiya 0.18.2</span></div>
      </section>`;
    view.querySelectorAll("[data-th]").forEach((b) => b.addEventListener("click", () => {
      store.set("theme", b.dataset.th || null);
      applyPrefs();
      view.querySelectorAll("[data-th]").forEach((x) => x.setAttribute("aria-selected", x === b));
    }));
    $("#installBtn").addEventListener("click", installHelp);
    const box = $("#accBox");
    window.ACC.page({ ...bridge(), view: box, setChrome: () => {}, compact: true }).catch(() => { box.innerHTML = `<p class="small muted" style="margin:0">Hisob ma’lumoti yuklanmadi</p>`; });
  }

  async function pageSubject(sid) {
    const s = await loadSubject(sid);
    if (!s) return pageNotFound();
    setChrome(s.meta.name, true, "fanlar");
    const done = store.get("done", {});
    const read = s.data.topics.filter((t) => done[sid + "/" + t.id]).length;
    const pct = s.data.topics.length ? Math.round(read / s.data.topics.length * 100) : 0;
    const counts = (t) => [
      t.quiz?.length ? `${t.quiz.length} test` : "",
      t.cards?.length ? `${t.cards.length} kartochka` : "",
      t.cases?.length ? `${t.cases.length} masala` : ""
    ].filter(Boolean).join(" · ");
    const nQ = s.data.topics.reduce((n, t) => n + (t.quiz?.length || 0), 0);
    const hasBook = s.data.topics.some((t) => t.sections?.length);
    const tiles = [
      hasBook ? `<a class="tile" href="#/fan/${esc(sid)}/kitob"><span class="tile-ico">${svg(IC.book, 22)}</span><span><b>Qo'llanma</b><small>${s.data.topics.length} ta mavzu${s.meta.pdf ? " · PDF" : ""}</small></span></a>` : "",
      nQ ? `<a class="tile" href="#/fan/${esc(sid)}/imtihon"><span class="tile-ico">${svg(IC.test, 22)}</span><span><b>Test</b><small>${nQ} ta savol</small></span></a>` : ""
    ].join("");
    view.innerHTML = `
      <div class="subj-head" style="--c:${esc(s.meta.color)}">
        <span class="fan-ico lg">${subjIco(sid, 30)}</span>
        <div class="subj-txt"><h2><span class="abbr">${esc(s.meta.abbr)}</span> ${esc(s.data.name)}</h2>
          <p class="muted small">${esc(s.course.name)} · ${s.data.topics.length} mavzu${s.data.description ? " · " + esc(s.data.description) : ""}</p></div>
        ${ring(pct, 54)}
      </div>
      ${tiles ? `<div class="tiles">${tiles}</div>` : ""}
      <h3 class="group-label">Mavzular</h3>
      <ol class="topics" style="--c:${esc(s.meta.color)}">
        ${s.data.topics.map((t, i) => `<li><a class="topic-link ${isDone(sid, t.id) ? "done" : ""}" href="#/fan/${esc(sid)}/${esc(t.id)}">
          <span class="topic-no">${isDone(sid, t.id) ? "✓" : (t.no || i + 1)}</span>
          <span><span class="topic-title">${esc(t.title)}</span>${counts(t) ? `<br><span class="small muted">${esc(counts(t))}</span>` : ""}</span>
          ${isSaved(sid, t.id) ? `<svg width="16" height="16" viewBox="0 0 24 24" aria-label="Saqlangan"><path d="M7 3h10v18l-5-4-5 4z" fill="currentColor"/></svg>` : "<span></span>"}
        </a></li>`).join("")}
      </ol>`;
  }

  /* PDF'ni ilova ichida ochish (orqaga tugmasi bilan) */
  async function pagePdf(sid) {
    const f = await findSubject(sid);
    if (!f || !f.meta.pdf) return pageNotFound();
    setChrome("PDF · " + f.meta.abbr, true, "fanlar");
    view.classList.add("wide");
    view.innerHTML = `<div class="pdf-bar"><span class="small muted">Ko‘rinmasa, yuklab oling</span><a class="btn" href="${esc(f.meta.pdf)}" download>Yuklab olish</a></div>
      <iframe class="sim-frame pdf-frame" title="${esc(f.meta.name)} (PDF)" src="${esc(f.meta.pdf)}#view=FitH"></iframe>`;
  }

  /* ---------- Qo'llanmani to'liq o'qish ---------- */
  async function pageBook(sid) {
    const s = await loadSubject(sid);
    if (!s) return pageNotFound();
    setChrome("Qo'llanma", true, "fanlar");
    const tp = s.data.topics;
    const topicHTML = (t) => {
      const parts = [];
      if (t.goals?.length) parts.push(`<h3>Mashg'ulot maqsadi</h3>${renderBlocks(t.goals)}`);
      (t.sections || []).forEach((sec) => parts.push(`${sec.title ? `<h3>${inline(sec.title)}</h3>` : ""}${renderBlocks(sec.blocks)}`));
      if (t.skills?.length) parts.push(`<h3>Amaliy ko'nikmalar</h3>` + t.skills.map((k) => `<h4>${inline(k.title)}</h4>${renderBlocks(k.blocks)}`).join(""));
      if (t.questions?.length) parts.push(`<h3>Nazorat savollari</h3><ol class="qlist">${t.questions.map((q) => `<li>${inline(q)}</li>`).join("")}</ol>`);
      if (t.cases?.length) parts.push(`<h3>Vaziyatli masalalar</h3>` + t.cases.map((c) => `<article class="case"><h4>${esc(c.title)}</h4><p>${inline(c.text)}</p>
        ${c.ask ? `<p class="ask"><strong>Savollar:</strong> ${inline(c.ask)}</p>` : ""}
        <details class="reveal"><summary>Javobni ko'rish</summary><p>${inline(c.answer)}</p></details></article>`).join(""));
      if (t.cards?.length) parts.push(`<h3>Tezkor takrorlash</h3><div class="table-wrap" tabindex="0"><table><tbody>${t.cards.map((c) => `<tr><td><strong>${inline(c.front)}</strong></td><td>${inline(c.back)}</td></tr>`).join("")}</tbody></table></div>`);
      return parts.join("");
    };
    view.innerHTML = `
      <div class="subject-head" style="--c:${esc(s.meta.color)}">
        <h2>${esc(s.data.name)}</h2>
        <p class="muted small">${esc(s.data.description || "")}${s.data.source ? " · " + esc(s.data.source) : ""}</p>
      </div>
      ${s.meta.pdf ? `<p style="margin:0 0 14px"><a class="btn" href="#/pdf/${esc(sid)}">PDF nusxasini ochish</a></p>` : ""}
      <details class="sec book-toc" open><summary>Mundarija</summary><div class="sec-body"><ol class="toc-list">
        ${tp.map((t) => `<li><button class="toc-link" data-go="bk-${esc(t.id)}"><span class="muted">${t.no}.</span> ${esc(t.title)}</button></li>`).join("")}
      </ol></div></details>
      <div class="bookread prose">${tp.map((t) => `<section class="book-topic" id="bk-${esc(t.id)}">
        <p class="book-no">${t.no}-mavzu</p><h2>${esc(t.title)}</h2>${topicHTML(t)}
        <p style="margin-top:16px"><a class="btn" href="#/fan/${esc(sid)}/${esc(t.id)}?test">Shu mavzu bo'yicha test</a></p></section>`).join("")}</div>`;
    document.body.classList.add("reading");
    view.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
      document.getElementById(b.dataset.go)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    const key = "bookpos:" + sid;
    const pos = store.get(key, 0);
    if (pos > 0) setTimeout(() => window.scrollTo(0, pos), 50);
    let tmr;
    const onScroll = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (location.hash.endsWith("/kitob")) { store.set(key, Math.round(window.scrollY)); store.set("lastBook", { sid, name: s.data.name }); } }, 300); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", () => window.removeEventListener("scroll", onScroll), { once: true });
  }

  /* ---------- Aralash imtihon ---------- */
  async function pageExam(sid) {
    const s = await loadSubject(sid);
    if (!s) return pageNotFound();
    setChrome("Aralash imtihon", true, "fanlar");
    const topics = s.data.topics.filter((t) => t.quiz?.length);
    const counts = [20, 40, 60, 0];
    let want = 40;
    view.innerHTML = `<div class="subject-head" style="--c:${esc(s.meta.color)}"><h2>Aralash imtihon</h2>
        <p class="muted small">${esc(s.data.name)} · tanlangan mavzulardan tasodifiy savollar</p></div>
      <div id="examBox">
        <div class="quiz-card">
          <p class="quiz-q" style="margin-top:0">Savollar soni</p>
          <div class="exam-row" id="cnt">${counts.map((n) => `<button class="btn" data-n="${n}" aria-pressed="${n === want}">${n ? n : "Hammasi"}</button>`).join("")}</div>
          <p class="quiz-q">Mavzular</p>
          <div class="exam-row"><button class="btn" id="allT">Hammasini belgilash</button><button class="btn" id="noneT">Tozalash</button></div>
          <div class="exam-topics">${topics.map((t) => `<label><input type="checkbox" data-t="${esc(t.id)}" checked>
            <span><b>${t.no}.</b> ${esc(t.title)} <span class="muted small">(${t.quiz.length})</span></span></label>`).join("")}</div>
          <p class="muted small" id="avail"></p>
          <button class="btn primary" id="startExam">Boshlash</button>
        </div></div>`;
    const box = $("#examBox");
    const chosen = () => topics.filter((t) => box.querySelector(`input[data-t="${t.id}"]`).checked);
    const refresh = () => {
      const total = chosen().reduce((n, t) => n + t.quiz.length, 0);
      $("#avail").textContent = total ? `Tanlangan mavzularda ${total} ta savol bor.` : "Kamida bitta mavzuni belgilang.";
      $("#startExam").disabled = !total;
    };
    box.querySelectorAll("input[data-t]").forEach((c) => c.addEventListener("change", refresh));
    $("#allT").addEventListener("click", () => { box.querySelectorAll("input[data-t]").forEach((c) => (c.checked = true)); refresh(); });
    $("#noneT").addEventListener("click", () => { box.querySelectorAll("input[data-t]").forEach((c) => (c.checked = false)); refresh(); });
    $("#cnt").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      want = Number(b.dataset.n);
      $("#cnt").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    }));
    $("#startExam").addEventListener("click", () => {
      const pool = chosen().flatMap((t) => t.quiz);
      const picked = want ? shuffle(pool).slice(0, want) : pool;
      window.scrollTo(0, 0);
      runQuiz(box, picked, "imtihon:" + sid);
    });
    refresh();
  }

  const TABS = [
    { id: "xulosa", label: "Qisqa xulosa", has: (t) => t.summary?.length },
    { id: "matn", label: "Matn", has: (t) => t.sections?.length || t.body?.length },
    { id: "bosqich", label: "Ko'nikmalar", has: (t) => t.skills?.length || t.steps?.length },
    { id: "savol", label: "Savollar", has: (t) => t.questions?.length },
    { id: "test", label: "Test", has: (t) => t.quiz?.length },
    { id: "masala", label: "Masalalar", has: (t) => t.cases?.length },
    { id: "karta", label: "Kartochka", has: (t) => t.cards?.length }
  ];

  const details = (title, inner, open = false, i = "") =>
    `<details class="sec"${open ? " open" : ""}${i === "" ? "" : ` data-i="${i}"`}><summary>${inline(title)}</summary><div class="sec-body prose">${inner}</div></details>`;

  /* Qidiruvdan kelgan so'zni matnda belgilab, shu joygacha o'tkazadi */
  function markTerms(root, words) {
    const re = new RegExp("(" + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['‘’ʻʼ`´]/g, "['‘’ʻʼ`´]")).join("|") + ")", "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest("summary,script,style,mark") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let first = null;
    for (const n of nodes) {
      const txt = n.nodeValue; re.lastIndex = 0;
      if (!re.test(txt)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = re.exec(txt))) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const mk = document.createElement("mark"); mk.className = "jump"; mk.textContent = m[0]; frag.appendChild(mk);
        if (!first) first = mk;
        last = m.index + m[0].length;
        if (!m[0].length) re.lastIndex++;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
    return first;
  }
  function jumpTo(body, tab, sIdx, q) {
    const words = fold(q || "").split(/\s+/).filter(Boolean).map((w) => (w.length > 6 ? w.slice(0, 6) : w));
    let target = null;
    if (sIdx !== "" && sIdx != null) {
      target = body.querySelector(`details.sec[data-i="${sIdx}"], article.case[data-i="${sIdx}"]`);
      if (target && target.tagName === "DETAILS") target.open = true;
    }
    let mk = null;
    if (words.length) {
      // so'zlarning birortasi uchraydigan eng yaqin joyni belgilaymiz
      mk = markTerms(target || body, words) || (target ? markTerms(body, words) : null);
    }
    const go = mk ? (mk.closest("p,li,td,h3,h4,.sum-item,.note,figcaption") || mk) : target;
    if (go) setTimeout(() => {
      go.scrollIntoView({ block: "center" });
      go.classList.add("flash-hit");
      setTimeout(() => go.classList.remove("flash-hit"), 2600);
    }, 80);
  }

  function topicBody(t, id, qd) {
    if (id === "xulosa") {
      return `<div class="summary-list">${t.summary.map((x) => typeof x === "string"
        ? `<div class="sum-item"><p>${inline(x)}</p></div>`
        : `<div class="sum-item sum-${esc(x.kind)}"><span class="sum-label">${esc(x.label)}</span><p>${inline(x.text)}</p></div>`).join("")}</div>`;
    }
    if (id === "matn") {
      if (t.body) return `<div class="prose">${renderBlocks(t.body)}</div>`;
      const goals = t.goals?.length ? details("Mashg'ulot maqsadi", renderBlocks(t.goals)) : "";
      const secs = t.sections.map((s, i) => details(s.title || "Kirish", renderBlocks(s.blocks), i === 0 && !goals && !qd, i)).join("");
      return `<div class="sec-tools"><button class="btn" data-toggle-all>Hammasini ochish</button></div>${goals}${secs}`;
    }
    if (id === "bosqich") {
      if (t.steps) return `<div class="steps">${t.steps.map((st, i) => `<div class="step"><b class="n">${i + 1}</b><div><strong>${esc(st.title)}</strong><p class="muted">${esc(st.text)}</p></div></div>`).join("")}</div>`;
      return `<p class="muted small">Amaliy ko'nikmalarni bajarish algoritmlari.</p>` + t.skills.map((s, i) => details(s.title, renderBlocks(s.blocks), i === 0 && !qd, i)).join("");
    }
    if (id === "savol") return `<div class="prose"><ol class="qlist">${t.questions.map((q) => `<li>${inline(q)}</li>`).join("")}</ol></div>`;
    if (id === "masala") {
      return t.cases.map((c, i) => `<article class="case" data-i="${i}"><h3>${esc(c.title)}</h3><p>${inline(c.text)}</p>
        ${c.ask ? `<p class="ask"><strong>Savollar:</strong> ${inline(c.ask)}</p>` : ""}
        <details class="reveal"><summary>Javobni ko'rish</summary><p>${inline(c.answer)}</p></details></article>`).join("");
    }
    return "";
  }

  async function pageTopic(sid, tid, tab) {
    const s = await loadSubject(sid);
    const t = s?.data.topics.find((x) => x.id === tid);
    if (!t) return pageNotFound();
    setChrome(s.meta.name, true, "fanlar");
    store.set("last", { sid, tid, title: t.title, subject: s.meta.abbr });

    const tabs = TABS.filter((x) => x.has(t));
    const qp = new URLSearchParams((tab || "").replace(/^([^=&]+)(&|$)/, "tab=$1&"));
    const active = tabs.find((x) => x.id === qp.get("tab"))?.id || tabs[0]?.id;
    let deep = qp.get("q") || qp.get("h") ? { s: qp.get("s"), q: qp.get("q"), h: qp.get("h") } : null;

    document.body.classList.add("reading");
    const cnt = [t.quiz?.length ? `${t.quiz.length} test` : "", t.cards?.length ? `${t.cards.length} kartochka` : "", t.cases?.length ? `${t.cases.length} masala` : ""].filter(Boolean).join(" · ");
    view.innerHTML = `
      <div class="topic-head"><span class="kicker">${esc(s.meta.abbr)}${t.no ? ` · ${t.no}-mavzu` : ""}</span><h2>${esc(t.title)}</h2>${cnt ? `<p class="meta">${esc(cnt)}</p>` : ""}</div>
      <div class="seg" role="tablist">
        ${tabs.map((x) => `<button role="tab" data-tab="${x.id}" aria-selected="${x.id === active}">${x.label}</button>`).join("")}
      </div>
      <div id="tabBody"></div>
      <div class="topic-actions">
        <button class="btn" id="doneBtn"></button>
        <button class="btn" id="saveBtn" aria-pressed="${isSaved(sid, tid)}">${isSaved(sid, tid) ? "Saqlangan" : "Saqlash"}</button>
        <button class="btn" id="planBtn">${svg(IC.plan, 18)} Rejaga qo‘shish</button>
      </div>`;
    const tTitle = (t.no ? t.no + "-mavzu. " : "") + t.title;
    const doneUI = () => {
      const b = $("#doneBtn"); if (!b) return;
      const sc = getRes()[sid + "/" + tid]?.score;
      b.innerHTML = isDone(sid, tid) ? `O'qilgan ✓${sc != null ? ` <span class="done-score">· ${sc} ball</span>` : ""}` : "O'qildi deb belgilash";
      b.classList.toggle("primary", !isDone(sid, tid));
    };
    doneUI();

    const body = $("#tabBody");
    const show = (id) => {
      view.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
      history.replaceState(null, "", `#/fan/${sid}/${tid}?${id}`); navSync();
      const dp = deep; deep = null;
      body.dataset.hl = "";
      if (id === "test") runQuiz(body, t.quiz, sid + "/" + tid);
      else if (id === "karta") runCards(body, t.cards, dp && dp.s != null ? Number(dp.s) || 0 : 0);
      else {
        body.innerHTML = topicBody(t, id, !!dp);
        Object.assign(body.dataset, { hl: HLTABS.includes(id) ? "1" : "", sid, tid, tab: id, title: tTitle, abbr: s.meta.abbr });
        if (HLTABS.includes(id)) applyHighlights(body, sid, tid, id);
        if (dp && dp.h) {
          const mk = body.querySelector(`mark.hl[data-h="${CSS.escape(dp.h)}"]`);
          if (mk) {
            const det = mk.closest("details"); if (det) det.open = true;
            setTimeout(() => { mk.scrollIntoView({ block: "center" }); mk.classList.add("flash-hit"); setTimeout(() => mk.classList.remove("flash-hit"), 2600); }, 80);
          } else toast("Belgilangan matn topilmadi (matn yangilangan bo‘lishi mumkin)");
        } else if (dp) jumpTo(body, id, dp.s, dp.q);
        const tg = $("[data-toggle-all]", body);
        if (tg) tg.addEventListener("click", () => {
          const all = body.querySelectorAll("details.sec");
          const open = tg.dataset.open !== "1";
          all.forEach((d) => { d.open = open; });
          tg.dataset.open = open ? "1" : "0";
          tg.textContent = open ? "Hammasini yopish" : "Hammasini ochish";
        });
      }
    };
    view.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { show(b.dataset.tab); window.scrollTo(0, 0); }));
    if (active) show(active);

    $("#doneBtn").addEventListener("click", () => {
      if (!isDone(sid, tid)) {
        setDone(sid, tid, true); doneUI();
        scoreSheet(sid, tid, tTitle, doneUI);
        return;
      }
      const sh = sheet(`<h3>O'qilgan mavzu</h3><p class="muted small" style="margin:0">${esc(tTitle)}</p>
        <div class="acts" style="flex-direction:column"><button class="btn primary" id="dEdit">Ballni yozish / o'zgartirish</button>
        <button class="btn danger" id="dUndo">“O'qilgan” belgisini olib tashlash</button><button class="btn" data-x="close">Yopish</button></div>`);
      $("#dEdit", sh.el).addEventListener("click", () => { sh.close(); scoreSheet(sid, tid, tTitle, doneUI); });
      $("#dUndo", sh.el).addEventListener("click", () => { setDone(sid, tid, false); sh.close(); doneUI(); toast("Belgi olib tashlandi"); });
    });
    $("#planBtn").addEventListener("click", () => planSheet({ sid, tid }, null));
    $("#saveBtn").addEventListener("click", () => {
      const now = toggleSaved(sid, tid);
      const b = $("#saveBtn");
      b.textContent = now ? "Saqlangan" : "Saqlash";
      b.setAttribute("aria-pressed", now);
      toast(now ? "Saqlanganlarga qo'shildi" : "Saqlanganlardan olib tashlandi");
    });
  }

  /* ---------- Test ---------- */
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const qid = (q) => fold(plain(q.q)).slice(0, 90);
  function trackWrong(q, ok) {
    const w = store.get("wrong", {});
    const id = qid(q);
    if (ok) { if (w[id]) { delete w[id]; store.set("wrong", w); } }
    else { w[id] = q; store.set("wrong", w); }
  }
  function runQuiz(el, questions, key) {
    const qs = shuffle(questions);
    let i = 0, score = 0;
    const draw = () => {
      if (i >= qs.length) {
        const best = Math.max(score, store.get("best:" + key, 0));
        store.set("best:" + key, best);
        el.innerHTML = `<div class="quiz-card" style="text-align:center">
          <p class="muted">Natija</p><div class="score">${score} / ${qs.length}</div>
          <p class="muted small">Eng yaxshi natija: ${best} / ${qs.length}</p>
          <button class="btn primary" id="again">Qayta ishlash</button></div>`;
        $("#again", el).addEventListener("click", () => runQuiz(el, questions, key));
        return;
      }
      const q = qs[i];
      const order = shuffle(q.options.map((text, idx) => ({ text, idx })));
      el.innerHTML = `<div class="quiz-card">
        <div class="quiz-meta"><span>Savol ${i + 1} / ${qs.length}</span><span>To'g'ri: ${score}</span></div>
        <p class="quiz-q">${inline(q.q)}</p>
        <div class="opts">${order.map((o) => `<button class="opt" data-idx="${o.idx}">${inline(o.text)}</button>`).join("")}</div>
        <div id="after"></div></div>`;
      el.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
        const pick = Number(b.dataset.idx);
        const ok = pick === q.answer;
        if (ok) score++;
        trackWrong(q, ok);
        el.querySelectorAll(".opt").forEach((o) => {
          o.disabled = true;
          if (Number(o.dataset.idx) === q.answer) o.classList.add("right");
        });
        if (!ok) b.classList.add("wrong");
        $("#after", el).innerHTML = `<div class="explain"><strong>${ok ? "To'g'ri." : "Noto'g'ri."}</strong>${q.explain ? " " + inline(q.explain) : ok ? "" : " To'g'ri javob yashil rangda."}</div>
          <div style="margin-top:12px"><button class="btn primary" id="next">${i + 1 < qs.length ? "Keyingi savol" : "Natijani ko'rish"}</button></div>`;
        $("#next", el).addEventListener("click", () => { i++; draw(); });
      }));
    };
    draw();
  }

  /* ---------- Kartochkalar ---------- */
  function runCards(el, cards, start = 0) {
    let deck = cards, i = Math.min(start, cards.length - 1);
    const draw = () => {
      const c = deck[i];
      el.innerHTML = `<div class="flash" id="flash"><div class="flash-inner" role="button" tabindex="0" aria-label="Kartochkani aylantirish">
          <div class="flash-face"><strong style="font-size:1.15rem">${inline(c.front)}</strong><span class="flash-hint">Javobni ko'rish uchun bosing</span></div>
          <div class="flash-face flash-back"><span style="font-size:1.1rem">${inline(c.back)}</span></div>
        </div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>Oldingi</button>
          <span class="muted small">${i + 1} / ${deck.length}</span>
          <button class="btn" id="nxt" ${i === deck.length - 1 ? "disabled" : ""}>Keyingi</button></div>
        <div style="text-align:center;margin-top:14px"><button class="btn" id="shuf">Aralashtirish</button></div>`;
      const f = $("#flash", el), inner = $(".flash-inner", el);
      const flip = () => f.classList.toggle("flipped");
      inner.addEventListener("click", flip);
      inner.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $("#prev", el).addEventListener("click", () => { i--; draw(); });
      $("#nxt", el).addEventListener("click", () => { i++; draw(); });
      $("#shuf", el).addEventListener("click", () => { deck = shuffle(cards); i = 0; draw(); toast("Kartochkalar aralashtirildi"); });
    };
    draw();
  }

  /* ---------- Qidiruv ---------- */
  function flattenBlocks(blocks, out = []) {
    for (const b of blocks || []) {
      if (b.text) out.push(b.text);
      if (b.items) out.push(...b.items);
      if (b.title) out.push(b.title);
      if (b.head) out.push(b.head.join(" "));
      if (b.rows) b.rows.forEach((r) => out.push(r.join(" ")));
      if (b.caption) out.push(b.caption);
      if (b.parts) flattenBlocks(b.parts, out);
    }
    return out;
  }

  let searchIndex = null;
  async function buildIndex() {
    if (searchIndex) return searchIndex;
    const cat = await catalog();
    const index = [];
    for (const c of cat.courses) for (const s of c.subjects) {
      if (s.status !== "ready") continue;
      try {
        const d = await loadJSON(s.file);
        for (const t of d.topics) {
          const base = { sid: s.id, abbr: s.abbr, t };
          if (t.sections) {
            t.sections.forEach((sec, i) => index.push({ ...base, where: sec.title, tab: "matn", i, text: flattenBlocks(sec.blocks).join(" ") }));
            (t.skills || []).forEach((k, i) => index.push({ ...base, where: k.title, tab: "bosqich", i, text: flattenBlocks(k.blocks).join(" ") }));
            (t.cases || []).forEach((k, i) => index.push({ ...base, where: k.title, tab: "masala", i, text: [k.text, k.ask, k.answer].join(" ") }));
            (t.summary || []).forEach((k) => index.push({ ...base, where: "Qisqa xulosa", tab: "xulosa", text: typeof k === "string" ? k : k.text }));
            (t.cards || []).forEach((k, i) => index.push({ ...base, where: "Kartochka", tab: "karta", i, text: k.front + " — " + k.back }));
          } else {
            index.push({ ...base, where: "", tab: "", text: [t.title, ...(t.summary || []), ...flattenBlocks(t.body)].join(" ") });
          }
        }
      } catch { /* yuklanmagan fan */ }
    }
    index.forEach((x) => { x.f = fold(x.text); x.ft = fold(x.t.title + " " + x.where); });
    searchIndex = index;
    return index;
  }

  let glossary = null, sentences = null;
  const termKeys = (term) => {
    const f = fold(term), keys = new Set([f]);
    const bare = f.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    if (bare) keys.add(bare);
    for (const m of f.matchAll(/\(([^)]{2,40})\)/g)) keys.add(m[1].trim());
    return [...keys];
  };
  const walkText = (n, out) => {
    if (typeof n === "string") out.push(n);
    else if (Array.isArray(n)) n.forEach((x) => walkText(x, out));
    else if (n && typeof n === "object") Object.values(n).forEach((x) => walkText(x, out));
  };
  /* Ta'rif bo'lmagan bo'laklarni (ro'yxat bandi, uzilgan jumla, "qarang") lug'atdan chiqarib tashlaydi */
  const goodMean = (m, card) => {
    if (m.length < (card ? 6 : 30)) return false;
    if (/[;:,]$/.test(m)) return false;
    if ((m.match(/\)/g) || []).length > (m.match(/\(/g) || []).length) return false;
    if (/^\d+-?\s*(mavzu|bob)/i.test(m) || /\bqarang\.?$/i.test(m)) return false;
    return true;
  };
  const goodTerm = (t) => !/^[\d≈<>≥≤=+\-–—“"«(]/.test(t) && !/[≈<>≥≤=→]/.test(t) && /[a-zа-яўқғҳ]{3}/i.test(t);
  async function buildGlossary() {
    if (glossary) return glossary;
    const cat = await catalog();
    const map = new Map();
    const add = (term, mean, abbr, rank, card) => {
      term = term.trim().replace(/[:;,.\s]+$/, ""); mean = mean.trim();
      if (term.length < 2 || term.length > 80 || term.split(/\s+/).length > 9) return;
      if (!goodTerm(term) || !goodMean(mean, card)) return;
      const key = fold(plain(term)).replace(/\s+/g, " ");
      let e = map.get(key);
      if (!e) { e = { term, means: [], keys: termKeys(plain(term)) }; map.set(key, e); }
      const fm = fold(mean).slice(0, 40);
      if (e.means.some((m) => m.f === fm)) return;
      const bad = (mean.length < 40 ? 2 : 0) + (/^[a-zа-яо‘'’]/.test(mean) && mean.split(/\s+/).length < 6 ? 1 : 0);
      e.means.push({ t: mean, abbr, rank: rank + bad, f: fm });
    };
    for (const c of cat.courses) for (const sj of c.subjects) {
      if (sj.status !== "ready") continue;
      try {
        const d = await loadJSON(sj.file);
        for (const t of d.topics) {
          const texts = []; walkText([t.sections, t.skills, t.goals], texts);
          for (const tx of texts) {
            for (const m of tx.matchAll(/\*\*([^*]{2,80})\*\*\s*[—–]\s*([^\n]{12,}?)(?:\.(?=\s+[A-ZА-ЯЎҚҒҲ“"])|\.?$|\n)/g)) {
              const mean = plain(m[2]).replace(/\s+/g, " ");
              add(plain(m[1]), mean.length > 320 ? mean.slice(0, 320).replace(/\s+\S*$/, "") + "…" : mean, sj.abbr, m.index <= 3 ? 0 : 2, false);
            }
          }
          for (const k of t.cards || []) add(plain(k.front), plain(k.back), sj.abbr, 1, true);
        }
      } catch { /* yuklanmagan fan */ }
    }
    glossary = [...map.values()].filter((e) => e.means.length).map((e) => {
      e.means.sort((a, b) => a.rank - b.rank);
      const best = e.means[0].rank;
      e.means = e.means.filter((m) => m.rank <= best + 1).slice(0, 3);
      e.ft = e.keys.join(" | ");
      e.abbrs = [...new Set(e.means.map((m) => m.abbr))];
      return e;
    }).sort((a, b) => a.term.localeCompare(b.term, "uz"));
    return glossary;
  }

  /* Jumlalar bazasi: lug'atda aniq ta'rifi bo'lmagan atama uchun matndan izohli jumla topadi */
  async function buildSentences() {
    if (sentences) return sentences;
    const cat = await catalog();
    const out = [];
    for (const c of cat.courses) for (const sj of c.subjects) {
      if (sj.status !== "ready") continue;
      try {
        const d = await loadJSON(sj.file);
        for (const t of d.topics) {
          (t.sections || []).forEach((sec, si) => {
            const texts = []; walkText(sec.blocks, texts);
            for (const tx of texts) for (const sn of plain(tx).split(/(?<=[.!?])\s+(?=[A-ZА-ЯЎҚҒҲ“"])/)) {
              if (sn.length < 40 || sn.length > 420) continue;
              out.push({ sid: sj.id, abbr: sj.abbr, t, si, text: sn, f: fold(sn) });
            }
          });
        }
      } catch { /* yuklanmagan fan */ }
    }
    return (sentences = out);
  }

  /* So'z o'zagi: o'zbek qo'shimchalaridan (-si, -ida, -lari ...) qat'i nazar solishtirish uchun */
  const stem = (w) => (w.length > 6 ? w.slice(0, 6) : w);
  const hasStems = (text, stems) => stems.every((st) => text.includes(st));
  const DEFWORDS = /deb ataladi|deb yuritiladi|ya'ni| bu | — |bo'lib,|bo'ladi|natijasida|ifodalanadi/;

  /* Toza qidiruv mantiqi (DOM'siz) */
  function searchTerms(g, raw) {
    const terms = fold(raw.trim()).split(/\s+/).filter(Boolean);
    const qq = terms.join(" ");
    const stems = terms.map(stem);
    const score = (x) => {
      if (x.keys.includes(qq)) return 0;
      if (x.keys.some((k) => k.startsWith(qq))) return 1;
      if (x.keys.some((k) => k.split(/[\s-]+/).some((w) => w.startsWith(terms[0])) && terms.every((w) => k.includes(w)))) return 2;
      if (terms.every((w) => x.ft.includes(w))) return 3;
      return stems.length > 1 && hasStems(x.ft, stems) ? 4 : 9;
    };
    const byTerm = g.map((x) => ({ x, sc: score(x) })).filter((r) => r.sc < 9)
      .sort((a, b) => a.sc - b.sc || a.x.term.length - b.x.term.length);
    const exact = byTerm.some((r) => r.sc <= 1);
    const hits = byTerm.map((r) => r.x);
    let byMean = [];
    if (!exact && hits.length < 5) {
      byMean = g.filter((x) => !hits.includes(x) && x.means.some((m) => hasStems(fold(m.t), stems))).slice(0, 8);
    }
    /* Tarkibidagi so'zlar bo'yicha yaqin atamalar (masalan "yallig'lanish giperemiyasi" -> Giperemiya, Yallig'lanish) */
    const related = [];
    if (!exact && terms.length > 1) {
      for (const w of terms) {
        if (w.length < 5) continue;
        const st = stem(w);
        const cand = g.filter((x) => x.keys.some((k) => k.split(" ").length <= 2 && k.split(/[\s-]+/)[0].startsWith(st)))
          .sort((a, b) => (a.keys[0].split(" ").length - b.keys[0].split(" ").length) || (a.means[0].rank - b.means[0].rank) || (a.term.length - b.term.length))[0];
        if (cand && !related.includes(cand)) related.push(cand);
      }
    }
    return { terms, stems, hits, byMean, exact, related };
  }

  let lastSearch = { q: "", y: 0 };
  async function pageSearch() {
    setChrome("Qidiruv", false, "search");
    let mode = store.get("searchMode", "atama");
    const restoreY = lastSearch.y || 0;
    view.innerHTML = `<div class="seg" role="tablist" style="margin-bottom:12px">
        <button role="tab" data-mode="atama" aria-selected="${mode === "atama"}">Atamalar lug'ati</button>
        <button role="tab" data-mode="kitob" aria-selected="${mode === "kitob"}">Kitoblarda qidirish</button></div>
      <label class="search-box"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input class="search-input" id="q" type="search" autocomplete="off" enterkeyhint="search"></label>
      <div id="sugg" class="chips"></div>
      <div id="results"></div>`;
    const input = $("#q"), out = $("#results"), sugg = $("#sugg");
    const remember = (v) => {
      v = v.trim(); if (fold(v).length < 3) return;
      const r = store.get("recentQ", []).filter((x) => fold(x) !== fold(v));
      r.unshift(v); store.set("recentQ", r.slice(0, 8));
    };
    let suggSeq = 0;
    const drawSugg = async () => {
      const my = ++suggSeq;
      const q = fold(input.value.trim());
      if (!q) {
        const rc = store.get("recentQ", []);
        sugg.innerHTML = rc.length ? `<span class="lbl">Oxirgi qidiruvlar <button type="button" data-clr>Tozalash</button></span>` + rc.map((r) => `<button type="button" class="chip recent" data-s="${esc(r)}">${esc(r)}</button>`).join("") : "";
        return;
      }
      if (q.length < 2) { sugg.innerHTML = ""; return; }
      const g = await buildGlossary();
      if (my !== suggSeq) return;
      const seen = new Set();
      const list = g.filter((x) => x.keys.some((k) => k.startsWith(q)) && !x.keys.includes(q))
        .sort((a, b) => a.term.length - b.term.length)
        .filter((x) => { const k = fold(plain(x.term)); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
      sugg.innerHTML = list.map((x) => `<button type="button" class="chip" data-s="${esc(plain(x.term))}">${hl(plain(x.term), [q])}</button>`).join("");
    };
    sugg.addEventListener("click", (e) => {
      if (e.target.closest("[data-clr]")) { store.set("recentQ", []); drawSugg(); return; }
      const c = e.target.closest("[data-s]"); if (!c) return;
      input.value = c.dataset.s; remember(c.dataset.s); run();
    });
    out.addEventListener("click", (e) => { if (e.target.closest("a")) remember(input.value); });
    let remT;
    input.value = lastSearch.q || "";
    const hl = (txt, terms) => {
      const re = new RegExp("(" + terms.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&#39;|'/g, "(?:'|&#39;|‘|’)")).join("|") + ")", "gi");
      return esc(txt).replace(re, (m) => `<mark>${m}</mark>`);
    };
    const emptyArt = (msg) => `<div class="empty-art"><svg viewBox="0 0 120 120" width="108" height="108" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="var(--accent)" opacity=".1"/><circle cx="54" cy="54" r="22" fill="none" stroke="var(--accent)" stroke-width="7"/><path d="M71 71l22 22" stroke="var(--accent)" stroke-width="8" stroke-linecap="round"/></svg><p>${msg}</p></div>`;
    const item = (x, terms) => `<div class="gloss"><strong>${hl(x.term, terms)}</strong><span class="gloss-tag">${esc(x.abbrs.join(", "))}</span>${x.means.map((m) => `<p>${hl(m.t, terms)}${x.abbrs.length > 1 ? ` <span class="gloss-tag">${esc(m.abbr)}</span>` : ""}</p>`).join("")}</div>`;
    const runTerms = async () => {
      const g = await buildGlossary();
      const raw = input.value.trim();
      if (fold(raw).length < 2) { out.innerHTML = emptyArt(`Lug'atda ${g.length} ta atama bor.<br>Atamani yozing — faqat uning ma'nosi ko'rsatiladi.`); return; }
      const r = searchTerms(g, raw);
      const { terms } = r;
      let html = "";
      if (r.exact) {
        html = r.hits.slice(0, 40).map((x) => item(x, terms)).join("");
      } else if (r.hits.length) {
        html = r.hits.slice(0, 40).map((x) => item(x, terms)).join("");
      } else {
        if (r.related.length) {
          html = `<p class="small muted" style="margin:0 0 8px">“${esc(raw)}” uchun alohida ta'rif topilmadi. Tarkibidagi atamalar ma'nosi:</p>` + r.related.map((x) => item(x, terms)).join("");
        } else {
          const S = await buildSentences();
          const sn = S.filter((x) => hasStems(x.f, r.stems) && DEFWORDS.test(x.f)).sort((a, b) => a.text.length - b.text.length).slice(0, 3);
          if (sn.length) {
            html = `<p class="small muted" style="margin:0 0 8px">“${esc(raw)}” uchun alohida ta'rif topilmadi. Matnda shunday izohlanadi:</p>` +
              sn.map((x) => `<a class="gloss gloss-link" href="#/fan/${esc(x.sid)}/${esc(x.t.id)}?matn&s=${x.si}&q=${encodeURIComponent(r.stems[0])}"><p style="margin:0">${hl(x.text, terms)}</p><span class="gloss-tag">${esc(x.abbr)}</span></a>`).join("");
          }
        }
      }
      if (!html && r.byMean.length) html = `<p class="small muted" style="margin:0 0 8px">Ma'nosida uchraydi:</p>` + r.byMean.map((x) => item(x, terms)).join("");
      out.innerHTML = html || emptyArt(`“${esc(raw)}” lug'atda topilmadi.<br>“Kitoblarda qidirish” bo'limida urinib ko'ring.`);
    };
    const runBooks = async () => {
      const raw = input.value.trim();
      const q = fold(raw);
      if (q.length < 2) { out.innerHTML = emptyArt("Atama kitoblarning qaysi mavzusi va bo'limida uchrashini ko'rsatadi."); return; }
      const index = await buildIndex();
      const terms = q.split(/\s+/).filter(Boolean);
      const stems = terms.map(stem);
      const hits = [];
      for (const x of index) {
        const all = x.f + " " + x.ft;
        if (!terms.every((w) => all.includes(w))) { if (!hasStems(all, stems)) continue; }
        const exactAll = terms.every((w) => x.f.includes(w) || x.ft.includes(w));
        const pos = x.f.indexOf(terms[0]);
        hits.push({ x, pos: pos >= 0 ? pos : Math.max(0, x.f.indexOf(stems[0])), title: terms.every((w) => x.ft.includes(w)), exact: exactAll });
      }
      hits.sort((a, b) => (b.title - a.title) || (b.exact - a.exact));
      if (!hits.length) { out.innerHTML = emptyArt(`“${esc(raw)}” bo'yicha hech narsa topilmadi.<br>Boshqa so'z bilan urinib ko'ring.`); return; }
      const shown = hits.slice(0, 40);
      out.innerHTML = `<p class="small muted" style="margin:0 0 8px">${hits.length} ta natija${hits.length > 40 ? " (dastlabki 40 tasi)" : ""}</p>` + shown.map((h) => {
        const txt = plain(h.x.text);
        const raw2 = txt.slice(Math.max(0, h.pos - 50), h.pos + terms[0].length + 90);
        const href = `#/fan/${esc(h.x.sid)}/${esc(h.x.t.id)}${h.x.tab ? "?" + h.x.tab + (h.x.i != null ? "&s=" + h.x.i : "") + "&q=" + encodeURIComponent(terms.join(" ")) : ""}`;
        return `<a class="result" href="${href}"><strong>${esc(h.x.t.no ? h.x.t.no + "-mavzu. " : "")}${esc(h.x.where || h.x.t.title)}</strong>
          <div class="small muted">${esc(h.x.abbr)} · …${hl(raw2, terms)}…</div></a>`;
      }).join("");
    };
    const run = () => { lastSearch.q = input.value; drawSugg(); clearTimeout(remT); remT = setTimeout(() => remember(input.value), 2000); return mode === "atama" ? runTerms() : runBooks(); };
    const setMode = (m) => {
      mode = m; store.set("searchMode", m);
      view.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-selected", b.dataset.mode === m));
      input.placeholder = m === "atama" ? "Atama, masalan: gipoksiya" : "Atama yoki mavzu, masalan: surfaktant";
      return run();
    };
    view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { setMode(b.dataset.mode); input.focus(); }));
    let timer;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 120); });
    await setMode(mode);
    if (lastSearch.q) pendingScroll = restoreY;
    else if (matchMedia("(pointer:fine)").matches) input.focus();
    setTimeout(() => {
      const keepY = () => { if (location.hash.startsWith("#/qidiruv")) lastSearch.y = window.scrollY; };
      window.addEventListener("scroll", keepY, { passive: true });
      window.addEventListener("hashchange", () => window.removeEventListener("scroll", keepY), { once: true });
    }, 400);
  }

  /* ---------- Simulyatorlar ---------- */
  const SIMCAT = [["all", "Barchasi"], ["klinik", "Klinik"], ["laboratoriya", "Laboratoriya"], ["diagnostik", "Diagnostik"]];
  async function pageSims() {
    setChrome("Simulyatorlar", false, "sim");
    const cat = await catalog();
    let f = store.get("simCat", "all");
    const ready = cat.simulators.filter((x) => x.status === "ready").length;
    view.innerHTML = `<div class="hello"><h2>Simulyatorlar</h2>
      <p class="muted">Virtual bemorlar, klinik va laboratoriya tekshiruvlari, atlaslar: ${ready} ta.</p></div>
      <div class="seg flat" role="tablist">${SIMCAT.map(([k, n]) => `<button role="tab" data-f="${k}" aria-selected="${k === f}">${n}</button>`).join("")}</div>
      <div class="fan-grid sim-grid" id="simList"></div>`;
    const draw = () => {
      $("#simList").innerHTML = cat.simulators.filter((x) => f === "all" || x.cat === f).map((s) => s.status === "ready"
        ? `<a class="sim-card" href="#/sim/${esc(s.id)}" style="--c:${esc(s.color)}"><span class="fan-ico">${subjIco(s.subject)}</span>
          <span class="fan-txt"><span class="fan-name strong">${esc(s.name)}</span><span class="fan-meta">${esc(s.note)}</span></span>${chev}</a>`
        : `<div class="sim-card soon" style="--c:${esc(s.color)}"><span class="fan-ico">${subjIco(s.subject)}</span>
          <span class="fan-txt"><span class="fan-name strong">${esc(s.name)}</span><span class="fan-meta">${esc(s.note)}</span></span></div>`).join("") || emptyState(IC.sim, "Hozircha simulyator yo‘q", "Bu toifaga simulyatorlar keyinroq qo‘shiladi.");
    };
    view.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
      f = b.dataset.f; store.set("simCat", f);
      view.querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-selected", x === b));
      draw();
    }));
    draw();
  }

  /* ---------- Simulyatorni ochish ---------- */
  async function pageSim(id) {
    const cat = await catalog();
    const s = (cat.simulators || []).find((x) => x.id === id && x.status === "ready");
    if (!s) return pageNotFound();
    setChrome(s.name, true, "sim");
    view.classList.add("wide");
    view.innerHTML = `<iframe class="sim-frame" title="${esc(s.name)}" src="${esc(s.file)}" loading="eager"></iframe>`;
    const fr = $(".sim-frame", view);
    fr.addEventListener("load", () => {
      try {
        const th = store.get("theme", null);
        if (th) fr.contentDocument.documentElement.dataset.theme = th;
      } catch { /* boshqa manba */ }
    });
  }

  /* ---------- Kutubxona ---------- */
  const LANG = { uz: "O‘zbekcha", ru: "Ruscha", en: "Inglizcha" };
  async function pageLibrary() {
    setChrome("Kutubxona", false, "lib");
    const lib = await loadJSON("data/library.json");
    const cats = lib.cats || [];
    const mark = () => store.get("libMark", {});
    let st = store.get("libSt", "all");
    let cat = store.get("libCat", "all"), sub = store.get("libGroup", "all"), lang = store.get("libLang", "all");
    const gmap = Object.fromEntries(lib.groups.map((g) => [g.id, g]));
    if (cat !== "all" && !cats.some((c) => c.id === cat)) cat = "all";
    if (sub !== "all" && (!gmap[sub] || (cat !== "all" && gmap[sub].cat !== cat))) sub = "all";
    view.innerHTML = `<div id="libwrap">
      <div class="hello"><h2>Kutubxona</h2><p class="muted">Darsliklar va qo‘llanmalar: ${lib.books.length} ta kitob. Fayllar Google Drive’da ochiladi: buning uchun o‘sha Google hisobga kirgan bo‘lishingiz kerak.</p></div>
      <input class="search-input" id="lq" type="search" placeholder="Kitob, muallif yoki yil" autocomplete="off" style="margin-bottom:10px">
      <div class="lib-chips cat-chips" role="group" aria-label="Toifa"></div>
      <div class="lib-chips sub-chips" role="group" aria-label="Fan"></div>
      <div class="lib-chips lang-chips" role="group" aria-label="Til"></div>
      <div class="lib-chips st-chips" role="group" aria-label="Holat"></div>
      <div id="shelves"></div></div>`;
    const matchQ = (b, q) => !q || fold([b.title, b.authors, b.year, b.publisher, b.kind, b.format].join(" ")).includes(q);
    const stOf = (b) => mark()[b.id] || {};
    const inSt = (b) => st === "all" || (st === "fav" && stOf(b).fav) || (st === "read" && stOf(b).s === "read") || (st === "done" && stOf(b).s === "done");
    const chip = (attr, val, label, on, n) => `<button data-${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}${n != null ? ` <span class="cnt">${n}</span>` : ""}</button>`;
    const draw = () => {
      const q = fold($("#lq").value.trim());
      const inCat = (b) => cat === "all" || gmap[b.subject]?.cat === cat;
      const inSub = (b) => sub === "all" || b.subject === sub;
      const keep = [...view.querySelectorAll(".lib-chips")].map((r) => r.scrollLeft);
      // toifa tugmalari
      $(".cat-chips").innerHTML = chip("c", "all", "Hammasi", cat === "all", lib.books.filter((b) => matchQ(b, q)).length) +
        cats.map((c) => chip("c", c.id, c.name, cat === c.id, lib.books.filter((b) => gmap[b.subject]?.cat === c.id && matchQ(b, q)).length)).join("");
      // fan tugmalari (tanlangan toifa ichidan, tanlangan til bo'yicha sonlari)
      const inLang = (b) => lang === "all" || b.lang === lang;
      $(".sub-chips").innerHTML = chip("g", "all", "Barcha fanlar", sub === "all", null) +
        lib.groups.filter((g) => cat === "all" || g.cat === cat).map((g) => chip("g", g.id, g.name, sub === g.id, lib.books.filter((b) => b.subject === g.id && inLang(b) && matchQ(b, q)).length)).join("");
      // til tugmalari: tanlangan toifa va fan bo'yicha sonlari
      const base = lib.books.filter((b) => inCat(b) && inSub(b) && inSt(b) && matchQ(b, q));
      $(".lang-chips").innerHTML = chip("l", "all", "Barcha tillar", lang === "all", base.length) +
        Object.entries(LANG).map(([k, v]) => chip("l", k, v, lang === k, base.filter((b) => b.lang === k).length)).join("");
      const mk = mark(), cnt = (f) => lib.books.filter((b) => f(mk[b.id] || {})).length;
      $(".st-chips").innerHTML = chip("s", "all", "Barcha kitoblar", st === "all", null) + chip("s", "fav", "★ Sevimli", st === "fav", cnt((m) => m.fav)) + chip("s", "read", "O‘qiyapman", st === "read", cnt((m) => m.s === "read")) + chip("s", "done", "Tugatganim", st === "done", cnt((m) => m.s === "done"));
      view.querySelectorAll(".lib-chips").forEach((r, i) => { r.scrollLeft = keep[i] || 0; });
      const out = [];
      for (const code of ["uz", "ru", "en"]) {
        if (lang !== "all" && lang !== code) continue;
        let inner = "", total = 0;
        for (const grp of lib.groups) {
          const list = base.filter((b) => b.lang === code && b.subject === grp.id)
            .sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));
          if (!list.length) continue;
          total += list.length;
          inner += `<h4 class="shelf-title" style="--c:${esc(grp.color)}"><i></i>${esc(grp.name)} <span class="muted small">${list.length}</span></h4><div class="books">${list.map((b) => bookCard(b, grp)).join("")}</div>`;
        }
        if (total) out.push(`<section class="lang-sec"><h3 class="lang-title">${LANG[code]} kitoblar <span>${total}</span></h3>${inner}</section>`);
      }
      $("#shelves").innerHTML = out.join("") || emptyState(IC.book, "Kitob topilmadi", "Filtrlarni o‘zgartiring yoki boshqa so‘z bilan qidiring.");
    };
    const bookCard = (b, grp) => {
      const tags = [b.kind, LANG[b.lang], b.script === "kirill" ? "Kirill" : "", b.edition, b.pages ? b.pages + " bet" : "", b.format + (b.sizeMB ? " · " + (b.sizeMB >= 100 ? Math.round(b.sizeMB) : b.sizeMB) + " MB" : "")].filter(Boolean);
      return `<article class="book" style="--c:${esc(grp.color)}">
        <div class="cover">${b.cover ? `<img loading="lazy" src="data/library/covers/${esc(b.cover)}.webp" alt="">` : esc(grp.abbr)}</div>
        <div><h4 class="book-title">${esc(b.title)}${b.year ? ` <span>(${b.year})</span>` : ""}</h4>
          ${b.authors || b.publisher ? `<p class="book-authors">${esc(b.authors)}${b.publisher ? (b.authors ? " · " : "") + esc(b.publisher) : ""}</p>` : ""}
          <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          ${b.note ? `<p class="book-note">${esc(b.note)}</p>` : ""}
          ${/^(DJVU|DOC)$/.test(b.format) ? `<p class="book-note">${b.format === "DJVU" ? "DJVU format: telefon ochmasligi mumkin, noutbukda DjVu dasturi kerak." : "DOC format: Drive’da ko‘rinadi, lekin shakli biroz buzilishi mumkin."}</p>` : ""}
          <div class="book-actions">
            ${b.file ? `<a class="btn primary" data-open="${esc(b.id)}" href="${esc(b.file)}" target="_blank" rel="noopener">Ochish</a>` : `<span class="btn" aria-disabled="true">Fayl tez orada</span>`}
            <button class="btn star" data-fav="${esc(b.id)}" aria-pressed="${!!stOf(b).fav}" aria-label="Sevimlilarga qo‘shish">${stOf(b).fav ? "★" : "☆"}</button>
            <button class="btn" data-stat="${esc(b.id)}">${stOf(b).s === "done" ? "Tugatdim ✓" : stOf(b).s === "read" ? "O‘qiyapman" : "Belgilash"}</button>
          </div>
        </div></article>`;
    };
    $("#libwrap").addEventListener("click", (e) => {
      const fav = e.target.closest("[data-fav]"), stt = e.target.closest("[data-stat]"), op = e.target.closest("[data-open]");
      if (fav || stt || op) {
        const id = (fav || stt || op).dataset.fav || (stt || op).dataset.stat || op.dataset.open;
        const m = mark(); m[id] = m[id] || {};
        if (fav) m[id].fav = !m[id].fav;
        else if (stt) m[id].s = { undefined: "read", read: "done", done: undefined }[m[id].s];
        else if (!m[id].s) m[id].s = "read";
        store.set("libMark", m);
        if (!op) { const y = window.scrollY; draw(); window.scrollTo(0, y); }
        return;
      }
      const b = e.target.closest("button[data-c],button[data-g],button[data-l],button[data-s]");
      if (!b) return;
      if (b.dataset.c !== undefined) {
        cat = b.dataset.c; store.set("libCat", cat);
        if (sub !== "all" && cat !== "all" && gmap[sub]?.cat !== cat) { sub = "all"; store.set("libGroup", sub); }
      } else if (b.dataset.g !== undefined) { sub = b.dataset.g; store.set("libGroup", sub); }
      else if (b.dataset.s !== undefined) { st = b.dataset.s; store.set("libSt", st); }
      else { lang = b.dataset.l; store.set("libLang", lang); }
      draw();
    });
    let t; $("#lq").addEventListener("input", () => { clearTimeout(t); t = setTimeout(draw, 120); });
    draw();
  }

  /* ---------- Xatolar ustida ishlash ---------- */
  async function pageWrong() {
    setChrome("Xatolar ustida ishlash", true, "saved");
    const w = Object.values(store.get("wrong", {}));
    if (!w.length) {
      view.innerHTML = emptyState(IC.redo, "Xato javoblar yo‘q", "Testlarda noto‘g‘ri javob bergan savollaringiz shu yerga yig‘iladi. To‘g‘ri javob bersangiz, savol ro‘yxatdan chiqadi.", `<a class="btn primary" href="#/fanlar">Test ishlash</a>`);
      return;
    }
    view.innerHTML = `<div class="hello"><h2>Xatolar ustida ishlash</h2><p class="muted">${w.length} ta savol. To‘g‘ri javob bersangiz, u ro‘yxatdan o‘chadi.</p></div>
      <div id="wbox"></div>
      <p style="margin-top:18px"><button class="btn" id="wclear">Ro‘yxatni tozalash</button></p>`;
    runQuiz($("#wbox"), w, "xatolar");
    $("#wclear").addEventListener("click", () => { if (confirm("Barcha xato savollar o‘chirilsinmi?")) { store.set("wrong", {}); pageWrong(); } });
  }

  /* ---------- Saqlanganlar ---------- */
  async function pageSaved() {
    setChrome("Saqlangan mavzular", false, "saved");
    const saved = store.get("saved", []);
    const wn = Object.keys(store.get("wrong", {})).length;
    const hn = store.get("hl", []).length;
    const wrongLink = `<div class="tiles" style="margin-bottom:14px"><a class="tile" href="#/xatolar"><span class="tile-ico">${svg(IC.redo, 22)}</span><span><b>Xatolar</b><small>${wn ? wn + " ta savol" : "Takrorlash"}</small></span></a>
      <a class="tile" href="#/belgilar"><span class="tile-ico" style="color:#b8860b;background:#ffe06640">${svg(ICX.marker, 22)}</span><span><b>Belgilanganlar</b><small>${hn ? hn + " ta joy" : "Marker"}</small></span></a></div>`;
    if (!saved.length) {
      view.innerHTML = wrongLink + `<div class="empty-art"><svg viewBox="0 0 120 120" width="108" height="108" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="var(--accent)" opacity=".1"/><path d="M42 30h36v62L60 78 42 92z" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linejoin="round"/></svg><p>Hali hech narsa saqlanmagan.<br>Mavzu ichidagi “Saqlash” tugmasini bosing, u shu yerda paydo bo'ladi.</p></div>`;
      return;
    }
    const items = [];
    for (const key of saved) {
      const [sid, tid] = key.split("/");
      const s = await loadSubject(sid).catch(() => null);
      const t = s?.data.topics.find((x) => x.id === tid);
      if (t) items.push(`<a class="result" href="#/fan/${esc(sid)}/${esc(tid)}"><strong>${esc(t.title)}</strong><div class="small muted">${esc(s.meta.abbr)} · ${esc(s.meta.name)}</div></a>`);
    }
    view.innerHTML = wrongLink + (items.join("") || `<p class="empty">Saqlangan mavzular topilmadi.</p>`);
  }

  function pageNotFound() {
    setChrome("Topilmadi", true, "");
    view.innerHTML = emptyState(ICX.warn, "Sahifa topilmadi", "Havola eskirgan yoki noto‘g‘ri bo‘lishi mumkin.", `<a class="btn primary" href="#/">Bosh sahifaga qaytish</a>`);
  }

  /* ---------- O'rnatish yo'riqnomasi ---------- */
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });
  function installHelp() {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    toast(ios ? "Safari'da “Ulashish” tugmasini bosing, so'ng “Bosh ekranga qo'shish”ni tanlang" : "Brauzer menyusidan “Ilovani o'rnatish”ni tanlang");
  }

  /* ---------- Sozlamalar ---------- */
  function applyPrefs() {
    const theme = store.get("theme", null);
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    const dark = theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.querySelector('meta[name="theme-color"]').content = dark ? "#0b1f1e" : "#eef7f5";
    try { const fr = document.querySelector(".sim-frame"); if (fr && !fr.classList.contains("pdf-frame")) { if (theme) fr.contentDocument.documentElement.dataset.theme = theme; else delete fr.contentDocument.documentElement.dataset.theme; } } catch { /* boshqa manba */ }
  }
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    store.set("theme", cur === "dark" ? "light" : "dark");
    applyPrefs();
  });
  srchBtn.addEventListener("click", () => { location.hash = "#/qidiruv"; setTimeout(() => $("#q")?.focus(), 200); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) { e.preventDefault(); location.hash = "#/qidiruv"; setTimeout(() => $("#q")?.focus(), 150); }
  });

  /* Orqaga: ilova ichida bir sahifa oldingi ko'rilgan joyga qaytadi */
  const hist = [location.hash || "#/"];
  function navSync() { hist[hist.length - 1] = location.hash || "#/"; }
  window.addEventListener("hashchange", () => {
    const h = location.hash || "#/";
    if (hist.length > 1 && hist[hist.length - 2] === h) hist.pop(); else hist.push(h);
  });
  backBtn.addEventListener("click", () => {
    if (hist.length > 1) { history.back(); return; }
    const parts = location.hash.split("?")[0].split("/").filter(Boolean);
    if (parts[0] === "fan" && parts.length === 3) location.hash = `#/fan/${parts[1]}`;
    else if (parts[0] === "fan" || parts[0] === "pdf") location.hash = "#/fanlar";
    else if (parts[0] === "sim") location.hash = "#/simulyatorlar";
    else location.hash = "#/";
  });
  let pendingScroll = 0;

  /* =====================================================================
     v0.11: Reja, Yutuqlar, Belgilash, varaqlar, harakatlar
     Hamma ma'lumot telefonning o'zida (localStorage) saqlanadi — profilsiz ishlaydi.
     ===================================================================== */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
  const fmtDay = (d) => `${d.getDate()}-${MONTHS[d.getMonth()]}`;
  const weekLabel = (ws) => { const we = addDays(ws, 6); return ws.getMonth() === we.getMonth() ? `${ws.getDate()}–${we.getDate()} ${MONTHS[ws.getMonth()]}` : `${fmtDay(ws)} – ${fmtDay(we)}`; };
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const getRes = () => store.get("res", {});
  const getPlan = () => store.get("plan", []);
  const isLate = (p) => { const t = ymd(new Date()); return !p.done && (p.date < t || (p.date === t && p.time < nowHM())); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const ICX = {
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M12 13v5M9.5 15.5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z"/>',
    marker: '<path d="M15 4l5 5-9 9H6v-5z"/><path d="M4 21h16"/>',
    warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>'
  };


  /* ---------- Menyu varag'i (3 chiziq) ---------- */
  const moreBtn = $("#moreBtn");
  function openMore() {
    const ic = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const acc = window.ACC?.me?.() || {};
    const accIco = acc.photo ? `<img src="${esc(acc.photo)}" alt="" referrerpolicy="no-referrer">` : ic('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/>');
    const items = [
      ["#/sozlamalar", accIco, "Sozlamalar", acc.name ? acc.name + " · profil va ko‘rinish" : "Profil, kirish va ko‘rinish"],
      ["#/fanlar", ic('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'), "Fanlar", "Barcha fanlar va mavzular"],
      ["#/reja", ic('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>'), "Reja", "Haftalik o‘quv reja"],
      ["#/yutuqlar", ic('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z"/>'), "Yutuqlar", "Ballar, belgilar va natijalar"],
      ["#/kutubxona", ic('<path d="M4 4h4v16H4zM9 4h4v16H9zM14.5 5.5l3.8-1 3.2 14.8-3.8 1z"/>'), "Kutubxona", "Kitoblar va qo‘llanmalar"],
      ["#/saqlangan", ic('<path d="M7 3h10v18l-5-4-5 4z"/>'), "Saqlangan", "Belgilar va saqlanganlar"],
      ["#/qidiruv", ic('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'), "Qidiruv", "Atamalar lug‘ati va kitoblarda qidirish"]
    ];
    moreBtn.setAttribute("aria-expanded", "true");
    const sh = sheet(`<h3>Menyu</h3><div class="more-list">${items.map(([h, i, t, d]) => `<a href="${h}" data-x="close"><span class="mi">${i}</span><span>${esc(t)}<small>${esc(d)}</small></span></a>`).join("")}</div>`);
    const done = () => moreBtn.setAttribute("aria-expanded", "false");
    sh.el.parentNode.addEventListener("click", done);
    window.addEventListener("hashchange", done, { once: true });
  }
  moreBtn?.addEventListener("click", openMore);

  /* ---------- O'qish paytidagi tezkor qidiruv ---------- */
  function quickSearch() {
    let mode = store.get("searchMode", "atama");
    const sh = sheet(`<div class="qs"><h3>Qidiruv</h3>
      <div class="seg flat" role="tablist"><button role="tab" data-qm="atama" aria-selected="${mode === "atama"}">Atamalar</button><button role="tab" data-qm="kitob" aria-selected="${mode === "kitob"}">Kitoblarda</button></div>
      <label class="search-box"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input class="search-input" id="qsIn" type="search" autocomplete="off" enterkeyhint="search"></label>
      <div class="qs-res" id="qsOut"><p class="small muted">Atamani yozing: izoh shu yerning o‘zida chiqadi, o‘qishingiz to‘xtamaydi.</p></div></div>`);
    const inp = $("#qsIn", sh.el), out = $("#qsOut", sh.el);
    const hl = (txt, terms) => {
      const re = new RegExp("(" + terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "(?:'|‘|’)")).join("|") + ")", "gi");
      return esc(txt).replace(re, (m) => `<mark>${m}</mark>`);
    };
    const run = async () => {
      const raw = inp.value.trim(), q = fold(raw);
      if (q.length < 2) { out.innerHTML = `<p class="small muted">Kamida 2 ta harf yozing.</p>`; return; }
      if (mode === "atama") {
        const g = await buildGlossary();
        const r = searchTerms(g, raw);
        const list = (r.hits.length ? r.hits : r.related.length ? r.related : r.byMean).slice(0, 6);
        out.innerHTML = list.length ? list.map((x) => `<div class="gloss"><strong>${hl(x.term, r.terms)}</strong><span class="gloss-tag">${esc(x.abbrs.join(", "))}</span>${x.means.map((m) => `<p>${hl(m.t, r.terms)}</p>`).join("")}</div>`).join("")
          : `<p class="small muted">“${esc(raw)}” lug‘atda topilmadi. “Kitoblarda” bo‘limida urinib ko‘ring.</p>`;
      } else {
        const index = await buildIndex();
        const terms = q.split(/\s+/).filter(Boolean), stems = terms.map(stem), hits = [];
        for (const x of index) {
          const all = x.f + " " + x.ft;
          if (!terms.every((w) => all.includes(w)) && !hasStems(all, stems)) continue;
          const pos = x.f.indexOf(terms[0]);
          hits.push({ x, pos: pos >= 0 ? pos : Math.max(0, x.f.indexOf(stems[0])), title: terms.every((w) => x.ft.includes(w)) });
        }
        hits.sort((a, b) => b.title - a.title);
        out.innerHTML = hits.length ? hits.slice(0, 20).map((h) => {
          const txt = plain(h.x.text), snip = txt.slice(Math.max(0, h.pos - 50), h.pos + terms[0].length + 90);
          const href = `#/fan/${esc(h.x.sid)}/${esc(h.x.t.id)}${h.x.tab ? "?" + h.x.tab + (h.x.i != null ? "&s=" + h.x.i : "") + "&q=" + encodeURIComponent(terms.join(" ")) : ""}`;
          return `<a class="result" href="${href}" data-x="close"><strong>${esc(h.x.t.no ? h.x.t.no + "-mavzu. " : "")}${esc(h.x.where || h.x.t.title)}</strong><div class="small muted">${esc(h.x.abbr)} · …${hl(snip, terms)}…</div></a>`;
        }).join("") : `<p class="small muted">“${esc(raw)}” bo‘yicha hech narsa topilmadi.</p>`;
      }
    };
    let t; inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 150); });
    sh.el.querySelectorAll("[data-qm]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.qm; store.set("searchMode", mode);
      sh.el.querySelectorAll("[data-qm]").forEach((x) => x.setAttribute("aria-selected", x === b));
      inp.placeholder = mode === "atama" ? "Atama, masalan: gipoksiya" : "Atama yoki mavzu";
      run();
    }));
    inp.placeholder = mode === "atama" ? "Atama, masalan: gipoksiya" : "Atama yoki mavzu";
    setTimeout(() => inp.focus(), 250);
  }
  $("#rdSearch")?.addEventListener("click", quickSearch);

  /* Bo'sh holat */
  const emptyState = (icon, title, text, action = "") =>
    `<div class="empty-state"><span class="es-ico">${svg(icon, 44, 1.6)}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;

  /* Pastki varaq (sheet) */
  function sheet(html) {
    const back = document.createElement("div");
    back.className = "sheet-back";
    back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => { back.remove(); if (!document.querySelector(".sheet-back,.lightbox")) document.body.classList.remove("noscroll"); };
    back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-x=close]")) close(); });
    document.body.appendChild(back);
    document.body.classList.add("noscroll");
    window.addEventListener("hashchange", close, { once: true });
    return { el: back.querySelector(".sheet"), close };
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ---------- Ball (0–100) ---------- */
  function scoreSheet(sid, tid, title, onDone) {
    const k = sid + "/" + tid;
    const r = getRes()[k] || {};
    const sh = sheet(`<h3>${isDone(sid, tid) ? "Mavzu o'qildi 🎉" : "Ball"}</h3><p class="muted small" style="margin:0">${esc(title)}</p>
      <label class="field">Universitetda shu mavzudan olgan balingiz (0–100)
        <input id="scIn" type="number" inputmode="numeric" min="0" max="100" step="1" placeholder="masalan, 86" value="${r.score ?? ""}"></label>
      <p class="small muted" style="margin:0">Ixtiyoriy. Keyin “Yutuqlar” bo‘limida o‘zgartirsa bo‘ladi.</p>
      <div class="acts"><button class="btn" data-x="close">Keyinroq</button><button class="btn primary" id="scSave">Saqlash</button></div>`);
    const inp = $("#scIn", sh.el);
    setTimeout(() => inp.focus(), 250);
    const save = () => {
      const v = inp.value.trim();
      const res = getRes();
      if (!res[k]) res[k] = { at: new Date().toISOString(), score: null };
      if (v === "") res[k].score = null;
      else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100) { inp.setCustomValidity("0 dan 100 gacha"); inp.reportValidity(); toast("Ball 0 dan 100 gacha bo‘lishi kerak"); return; }
        res[k].score = Math.round(n);
      }
      store.set("res", res);
      sh.close();
      toast(res[k].score != null ? `Ball saqlandi: ${res[k].score}` : "Saqlandi");
      onDone && onDone();
    };
    inp.addEventListener("input", () => inp.setCustomValidity(""));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    $("#scSave", sh.el).addEventListener("click", save);
  }

  /* ---------- Reja ---------- */
  const icsEsc = (s) => String(s).replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const icsFold = (line) => { const out = []; while (line.length > 60) { out.push(line.slice(0, 60)); line = " " + line.slice(60); } out.push(line); return out.join("\r\n"); };
  function icsFor(items) {
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ALVORA Med//Reja//UZ", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    for (const p of items) {
      const [h, m] = p.time.split(":").map(Number);
      const st = parseYmd(p.date); st.setHours(h, m);
      const en = new Date(st.getTime() + 60 * 60000);
      const f = (d) => ymd(d).replace(/-/g, "") + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
      L.push("BEGIN:VEVENT", "UID:" + p.id + "@alvora-med", "DTSTAMP:" + stamp, "DTSTART:" + f(st), "DTEND:" + f(en),
        icsFold("SUMMARY:" + icsEsc(`${p.abbr}: ${p.title}`)),
        icsFold("DESCRIPTION:" + icsEsc("ALVORA Med — rejadagi mavzuni o‘qish vaqti")),
        "BEGIN:VALARM", "ACTION:DISPLAY", icsFold("DESCRIPTION:" + icsEsc("Mavzuni o‘qish vaqti: " + p.title)), "TRIGGER:PT0S", "END:VALARM", "END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.join("\r\n") + "\r\n";
  }
  const toCalendar = (items, name) => {
    if (!items.length) return;
    download(name, icsFor(items), "text/calendar");
    toast("Fayl ochilgach, “Kalendarga qo‘shish”ni tanlang");
  };

  function planItemHTML(p, compact) {
    const late = isLate(p);
    const tag = p.done ? `<i class="tagx ok">Bajarildi</i>` : late ? `<i class="tagx late">Vaqti o‘tdi</i>` : "";
    const when = compact && p.date !== ymd(new Date()) ? " · " + fmtDay(parseYmd(p.date)) : "";
    return `<div class="plan-item${p.done ? " done" : ""}${late ? " late" : ""}" data-pid="${esc(p.id)}">
      <span class="tm">${esc(p.time)}</span>
      <a href="#/fan/${esc(p.sid)}/${esc(p.tid)}"><span class="pt">${esc(p.title)}</span><span class="pm">${esc(p.abbr)}${when} ${tag}</span></a>
      <span class="pi-acts"><button class="chk" data-act="chk" aria-pressed="${!!p.done}" aria-label="Bajarildi deb belgilash">${svg(ICX.check, 24)}</button></span>${compact ? "" :
        `<span class="pi-more"><button data-act="ics">${svg(ICX.cal, 16)} Kalendarga</button><button data-act="del">${svg(ICX.trash, 16)} O‘chirish</button></span>`}</div>`;
  }
  function bindPlan(box, rerender) {
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const id = b.closest("[data-pid]")?.dataset.pid;
      const pl = getPlan();
      const p = pl.find((x) => x.id === id);
      if (!p) return;
      if (b.dataset.act === "chk") {
        p.done = !p.done; p.doneAt = p.done ? new Date().toISOString() : null;
        store.set("plan", pl);
        if (p.done && !isDone(p.sid, p.tid)) { setDone(p.sid, p.tid, true); scoreSheet(p.sid, p.tid, p.title, rerender); }
        else toast(p.done ? "Bajarildi ✓" : "Belgi olib tashlandi");
        checkWeekWin(p.date);
        rerender();
      } else if (b.dataset.act === "ics") toCalendar([p], `reja-${p.date}-${p.time.replace(":", "")}.ics`);
      else if (b.dataset.act === "del") {
        store.set("plan", pl.filter((x) => x.id !== id));
        toast("Rejadan o‘chirildi");
        rerender();
      }
    });
  }
  function weekWon(ws) {
    const a = ymd(ws), z = ymd(addDays(ws, 6));
    const items = getPlan().filter((p) => p.date >= a && p.date <= z);
    return items.length > 0 && items.every((p) => p.done);
  }
  function checkWeekWin(dateStr) {
    const ws = weekStart(parseYmd(dateStr));
    if (weekWon(ws)) setTimeout(() => toast(`🏆 Haftalik yutuq: ${weekLabel(ws)} rejasi to‘liq bajarildi!`), 600);
  }

  async function planSheet(pre, onSave) {
    const cat = await catalog();
    const last = store.get("planLast", { time: "14:00" });
    const sh = sheet(`<h3>Rejaga mavzu qo‘shish</h3>
      <div class="row2"><label class="field">Sana<input type="date" id="pDate" value="${esc(pre.date || ymd(new Date()))}"></label>
        <label class="field">Soat<input type="time" id="pTime" value="${esc(pre.time || last.time || "14:00")}"></label></div>
      <label class="field">Kurs<select id="pCourse">${cat.courses.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field">Fan<select id="pSub"></select></label>
      <label class="field">Mavzu<select id="pTop"></select></label>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="pSave">Qo‘shish</button></div>`);
    const E = (id) => $("#" + id, sh.el);
    const fillTopics = async () => {
      const s = await loadSubject(E("pSub").value).catch(() => null);
      E("pTop").innerHTML = s ? s.data.topics.map((t) => `<option value="${esc(t.id)}">${t.no ? t.no + ". " : ""}${esc(t.title)}</option>`).join("") : `<option value="">Mavzu yo‘q</option>`;
      if (pre.tid && s?.data.topics.some((t) => t.id === pre.tid)) E("pTop").value = pre.tid;
    };
    const fillSubs = async () => {
      const c = cat.courses.find((x) => x.id === E("pCourse").value);
      const ready = c.subjects.filter((x) => x.status === "ready");
      E("pSub").innerHTML = ready.length ? ready.map((x) => `<option value="${esc(x.id)}">${esc(x.abbr)} — ${esc(x.name)}</option>`).join("") : `<option value="">Bu kursda fan hali yo‘q</option>`;
      if (pre.sid && ready.some((x) => x.id === pre.sid)) E("pSub").value = pre.sid;
      await fillTopics();
    };
    let course = store.get("course", "3");
    if (pre.sid) { const f = await findSubject(pre.sid); if (f) course = f.course.id; }
    E("pCourse").value = cat.courses.some((c) => c.id === course) ? course : cat.courses[0].id;
    E("pCourse").addEventListener("change", () => { pre = {}; fillSubs(); });
    E("pSub").addEventListener("change", () => { pre.tid = null; fillTopics(); });
    await fillSubs();
    E("pSave").addEventListener("click", async () => {
      const date = E("pDate").value, time = E("pTime").value, sid = E("pSub").value, tid = E("pTop").value;
      if (!date || !time) { toast("Sana va soatni tanlang"); return; }
      if (!sid || !tid) { toast("Fan va mavzuni tanlang"); return; }
      const s = await loadSubject(sid);
      const t = s.data.topics.find((x) => x.id === tid);
      const pl = getPlan();
      pl.push({ id: uid(), date, time, sid, tid, title: (t.no ? t.no + "-mavzu. " : "") + t.title, abbr: s.meta.abbr, done: false });
      store.set("plan", pl);
      store.set("planLast", { time });
      sh.close();
      const d = parseYmd(date);
      toast(`Rejaga qo‘shildi: ${DAYS[(d.getDay() + 6) % 7]}, ${fmtDay(d)}, ${time}`);
      rejaWeek = weekStart(d);
      onSave && onSave();
    });
  }

  let rejaWeek = null;
  function pageReja() {
    setChrome("Reja", false, "reja");
    if (!rejaWeek) rejaWeek = weekStart(new Date());
    const draw = () => {
      const ws = rejaWeek, a = ymd(ws), z = ymd(addDays(ws, 6)), today = ymd(new Date());
      const items = getPlan().filter((p) => p.date >= a && p.date <= z).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
      const nDone = items.filter((p) => p.done).length;
      const won = items.length > 0 && nDone === items.length;
      const isCur = ymd(weekStart(new Date())) === a;
      view.innerHTML = `<div class="hello"><h2>Reja</h2><p class="muted">Qaysi kuni, soat nechada, qaysi mavzuni o‘qishingizni belgilang.</p></div>
        <div class="week-nav"><button class="icon-btn" id="wPrev" aria-label="Oldingi hafta">${svg(ICX.left, 22, 2.2)}</button>
          <span class="wk">${weekLabel(ws)}${isCur ? "" : `<br><button class="btn" id="wToday" style="padding:4px 10px;font-size:.78rem;margin-top:4px">Shu haftaga qaytish</button>`}</span>
          <button class="icon-btn" id="wNext" aria-label="Keyingi hafta">${svg(ICX.right, 22, 2.2)}</button></div>
        <div class="week-sum${won ? " won" : ""}"><b>${won ? "🏆 Haftalik yutuq qo‘lga kiritildi!" : "Haftalik reja"}</b>
          <div class="small muted">${items.length ? `${nDone} / ${items.length} mavzu bajarildi` : "Bu haftaga hali mavzu qo‘shilmagan"}</div>
          ${items.length ? `<div class="progress"><i style="width:${Math.round(nDone / items.length * 100)}%"></i></div>` : ""}
          <div class="week-acts"><button class="btn primary" id="wAdd">${svg(ICX.plus, 18, 2.2)} Mavzu qo‘shish</button>
            ${items.length ? `<button class="btn" id="wIcs">${svg(ICX.cal, 18)} Haftani kalendarga</button>` : ""}</div></div>
        <div id="days">${[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const d = addDays(ws, i), ds = ymd(d);
          const its = items.filter((p) => p.date === ds);
          return `<section class="day${ds === today ? " today" : ""}"><div class="day-h"><b>${DAYS[i]}</b><small>${fmtDay(d)}</small></div>
            ${its.map((p) => planItemHTML(p, false)).join("")}
            <button class="day-add" data-add="${ds}">+ Qo‘shish</button></section>`;
        }).join("")}</div>
        <p class="small muted">🔔 Ilova yopiq bo‘lsa, o‘zi ogohlantira olmaydi. Aynan soatida eslatma olish uchun ${svg(ICX.cal, 14)} tugmasi bilan mavzuni telefon kalendariga qo‘shing — kalendar o‘zi eslatadi.</p>`;
      $("#wPrev").addEventListener("click", () => { rejaWeek = addDays(rejaWeek, -7); draw(); });
      $("#wNext").addEventListener("click", () => { rejaWeek = addDays(rejaWeek, 7); draw(); });
      $("#wToday")?.addEventListener("click", () => { rejaWeek = weekStart(new Date()); draw(); });
      $("#wAdd").addEventListener("click", () => planSheet({ date: isCur ? today : a }, draw));
      $("#wIcs")?.addEventListener("click", () => toCalendar(items, `reja-${a}.ics`));
      view.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => planSheet({ date: b.dataset.add }, draw)));
    };
    draw();
    bindPlan(view, () => { if (location.hash.startsWith("#/reja")) draw(); });
  }

  function todayPlanHTML() {
    const t = ymd(new Date());
    const pl = getPlan();
    const list = [...pl.filter((p) => isLate(p) && p.date < t), ...pl.filter((p) => p.date === t)]
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!list.length) {
      return `<a class="goal" href="#/reja"><span class="tile-ico">${svg(IC.plan, 22)}</span>
        <span class="goal-txt"><b>Bugungi reja</b><small>Bugunga mavzu rejalashtirilmagan. Haftalik reja tuzing.</small></span>${chev}</a>`;
    }
    const late = list.filter(isLate).length;
    return `<div class="today-card" id="todayPlan"><div class="tc-h"><b>Bugungi reja${late ? ` <i class="tagx late">${late} ta kechikkan</i>` : ""}</b><a href="#/reja">Hammasi ›</a></div>
      ${list.slice(0, 4).map((p) => planItemHTML(p, true)).join("")}</div>`;
  }

  /* ---------- Yutuqlar ---------- */
  function weeklyWins() {
    const by = {};
    for (const p of getPlan()) { const k = ymd(weekStart(parseYmd(p.date))); (by[k] = by[k] || []).push(p); }
    return Object.entries(by).filter(([, a]) => a.every((p) => p.done)).map(([k, a]) => ({ ws: parseYmd(k), n: a.length })).sort((a, b) => b.ws - a.ws);
  }
  async function pageYutuq() {
    setChrome("Yutuqlar", false, "yutuq");
    const done = store.get("done", {});
    const keys = Object.keys(done);
    const res = getRes();
    const scores = keys.map((k) => res[k]?.score).filter((x) => x != null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const wins = weeklyWins();
    const n = keys.length, hi = scores.filter((x) => x >= 86).length;
    const tmAll = store.get("tm:hist", []), tmTests = tmAll.filter((h) => !h.r);
    const tmOk = tmAll.reduce((a, h) => a + h.ok, 0), tmN = tmAll.reduce((a, h) => a + h.ok + h.bad, 0);
    const B = [
      ["🌱", "Birinchi qadam", "1 ta mavzu", n >= 1], ["📗", "Izchil", "5 ta mavzu", n >= 5], ["📘", "Bilimdon", "10 ta mavzu", n >= 10],
      ["📚", "Kitobxon", "25 ta mavzu", n >= 25], ["🎓", "Ustoz", "50 ta mavzu", n >= 50], ["🏛️", "Akademik", "100 ta mavzu", n >= 100],
      ["⭐", "A’lochi", "5 ta mavzuda 86+ ball", hi >= 5], ["💯", "Mukammal", "100 ball olingan mavzu", scores.includes(100)], ["📈", "Barqaror", "O‘rtacha ball 80+ (5+ mavzu)", scores.length >= 5 && avg >= 80],
      ["🗓️", "Rejali hafta", "1 hafta reja to‘liq", wins.length >= 1], ["🔥", "To‘rt hafta", "4 hafta reja to‘liq", wins.length >= 4], ["🏆", "Semestr", "12 hafta reja to‘liq", wins.length >= 12],
      ["🧪", "Birinchi test", "Test markazida 1 ta test", tmTests.length >= 1], ["📝", "Sinovchi", "10 ta test ishlandi", tmTests.length >= 10],
      ["🎯", "Xatosiz", "10+ savolli testda 100%", tmTests.some((h) => h.n >= 10 && h.ok === h.n)], ["💪", "Yuz savol", "100 ta to‘g‘ri javob", tmOk >= 100],
      ["🧠", "Besh yuz", "500 ta to‘g‘ri javob", tmOk >= 500], ["🏅", "Imtihonchi", "Imtihonda 56%+ (20+ savol)", tmTests.some((h) => h.m === "imtihon" && h.n >= 20 && h.ok / h.n >= 0.56)]
    ];
    // o'qilgan mavzular nomlari
    const rows = [];
    const subs = {};
    for (const k of keys) {
      const [sid, tid] = k.split("/");
      if (!(sid in subs)) subs[sid] = await loadSubject(sid).catch(() => null);
      const s = subs[sid]; const t = s?.data.topics.find((x) => x.id === tid);
      if (t) rows.push({ k, sid, tid, abbr: s.meta.abbr, title: (t.no ? t.no + "-mavzu. " : "") + t.title, at: res[k]?.at || "", score: res[k]?.score ?? null });
    }
    rows.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const pill = (r) => `<button class="score-pill${r.score == null ? " none" : r.score >= 86 ? " hi" : r.score < 56 ? " lo" : ""}" data-sc="${esc(r.k)}">${r.score == null ? "+ ball" : r.score}</button>`;
    view.innerHTML = `<div class="hello"><h2>Yutuqlar</h2><p class="muted">O‘qigan mavzularingiz, universitetdagi ballaringiz va nishonlar.</p></div>
      <div class="stats3"><div class="stat"><b>${n}</b><small>o‘qilgan mavzu</small></div><div class="stat"><b>${avg ?? "—"}</b><small>o‘rtacha ball</small></div><div class="stat"><b>${wins.length}</b><small>haftalik yutuq</small></div></div>
      <h3 class="group-label">Test markazi</h3>
      <div class="stats3"><div class="stat"><b>${tmTests.length}</b><small>test ishlandi</small></div><div class="stat"><b>${tmN ? Math.round(tmOk / tmN * 100) + "%" : "—"}</b><small>to‘g‘ri javoblar</small></div><div class="stat"><b>${tmOk}</b><small>to‘g‘ri savol</small></div></div>
      <p class="small muted" style="margin:-6px 0 4px"><a href="#/testmarkazi/statistika">Batafsil statistika ›</a></p>
      <h3 class="group-label">Nishonlar</h3>
      <div class="badges">${B.map(([i, t, d, ok]) => `<div class="badge-card ${ok ? "got" : "locked"}"><span class="bi">${i}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div>
      <h3 class="group-label">Haftalik yutuqlar</h3>
      ${wins.length ? wins.map((w) => `<div class="week-win"><span class="bi">🏆</span><span><b>${weekLabel(w.ws)}</b><br><span class="small muted">Haftalik reja to‘liq bajarildi · ${w.n} ta mavzu</span></span></div>`).join("")
        : `<p class="small muted">“Reja” bo‘limida haftaga mavzular qo‘shing va hammasini bajaring — shu yerda haftalik yutuq paydo bo‘ladi. <a href="#/reja">Reja tuzish ›</a></p>`}
      <h3 class="group-label">O‘qilgan mavzular</h3>
      <div id="readList">${rows.length ? rows.map((r) => `<div class="read-row"><a href="#/fan/${esc(r.sid)}/${esc(r.tid)}"><b class="small" style="color:var(--accent)">${esc(r.abbr)}</b> <span>${esc(r.title)}</span><br>
          <span class="small muted">${r.at ? "O‘qildi: " + fmtDay(new Date(r.at)) + " " + new Date(r.at).getFullYear() : "Sana yozilmagan"}</span></a>${pill(r)}</div>`).join("")
        : emptyState(ICX.trophy, "Hali o‘qilgan mavzu yo‘q", "Mavzuni o‘qib bo‘lgach, “O‘qildi” deb belgilang va universitetdan olgan balingizni yozing.", `<a class="btn primary" href="#/fanlar">Fanlarni ochish</a>`)}</div>`;
    view.querySelectorAll("[data-sc]").forEach((b) => b.addEventListener("click", () => {
      const r = rows.find((x) => x.k === b.dataset.sc);
      scoreSheet(r.sid, r.tid, r.title, () => pageYutuq());
    }));
  }

  /* ---------- Belgilash (marker) ---------- */
  const HLTABS = ["matn", "bosqich", "xulosa", "masala"];
  const BLK = "p,li,td,th,h3,h4,figcaption,.note";
  function wrapText(block, str, id) {
    const full = block.textContent;
    const idx = full.indexOf(str);
    if (idx < 0) return null;
    const end = idx + str.length;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let pos = 0, first = null;
    for (const n of nodes) {
      const len = n.nodeValue.length, s0 = pos; pos += len;
      if (s0 + len <= idx || s0 >= end) continue;
      const a = Math.max(idx, s0) - s0, b = Math.min(end, s0 + len) - s0;
      let target = n;
      if (b < len) target.splitText(b);
      if (a > 0) target = target.splitText(a);
      const mk = document.createElement("mark");
      mk.className = "hl"; mk.dataset.h = id;
      target.parentNode.replaceChild(mk, target); mk.appendChild(target);
      first = first || mk;
    }
    return first;
  }
  function applyHighlights(body, sid, tid, tab) {
    for (const h of store.get("hl", []).filter((x) => x.sid === sid && x.tid === tid && x.tab === tab)) {
      const scope = (h.s !== "" && body.querySelector(`[data-i="${h.s}"]`)) || body;
      for (const b of scope.querySelectorAll(BLK)) if (b.textContent.includes(h.text) && wrapText(b, h.text, h.id)) break;
    }
  }
  function removeHighlight(id) {
    store.set("hl", store.get("hl", []).filter((x) => x.id !== id));
    document.querySelectorAll(`mark.hl[data-h="${id}"]`).forEach((m) => m.replaceWith(...m.childNodes));
  }
  const hlBtn = $("#hlBtn");
  let hlSel = null;
  const elOf = (n) => (n && n.nodeType === 1 ? n : n?.parentElement);
  document.addEventListener("selectionchange", () => {
    const sel = getSelection();
    hlSel = null;
    const body = $("#tabBody");
    if (body && body.dataset.hl === "1" && sel && !sel.isCollapsed && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      const a = elOf(r.startContainer)?.closest(BLK), b = elOf(r.endContainer)?.closest(BLK);
      const txt = sel.toString().replace(/\s+/g, " ").trim();
      if (a && a === b && body.contains(a) && !a.closest("summary") && txt.length >= 3 && txt.length <= 600 && a.textContent.includes(txt)) hlSel = { block: a, text: txt };
    }
    hlBtn.hidden = !hlSel;
  });
  hlBtn.addEventListener("pointerdown", (e) => e.preventDefault());
  hlBtn.addEventListener("click", () => {
    if (!hlSel) return;
    const body = $("#tabBody");
    const holder = hlSel.block.closest("[data-i]");
    const h = { id: uid(), sid: body.dataset.sid, tid: body.dataset.tid, tab: body.dataset.tab, s: holder ? holder.dataset.i : "", text: hlSel.text,
      at: new Date().toISOString(), title: body.dataset.title, abbr: body.dataset.abbr };
    const list = store.get("hl", []); list.unshift(h); store.set("hl", list);
    wrapText(hlSel.block, h.text, h.id);
    getSelection().removeAllRanges();
    hlBtn.hidden = true; hlSel = null;
    toast("Belgilandi · “Saqlangan” → “Belgilanganlar”");
  });
  document.addEventListener("click", (e) => {
    const m = e.target.closest("mark.hl");
    if (!m || !getSelection().isCollapsed) return;
    const h = store.get("hl", []).find((x) => x.id === m.dataset.h);
    if (!h) return;
    const sh = sheet(`<h3>Belgilangan joy</h3><p style="background:#ffe06655;border-radius:10px;padding:10px 12px;margin:8px 0">${esc(h.text)}</p>
      <div class="acts"><button class="btn danger" id="hlDel">${svg(ICX.trash, 18)} Belgini o‘chirish</button><button class="btn" data-x="close">Yopish</button></div>`);
    $("#hlDel", sh.el).addEventListener("click", () => { removeHighlight(h.id); sh.close(); toast("Belgi o‘chirildi"); });
  });

  function pageBelgilar() {
    setChrome("Belgilanganlar", true, "saved");
    const list = store.get("hl", []);
    view.innerHTML = `<div class="hello"><h2>Belgilanganlar</h2><p class="muted">Mavzu matnida sariq marker bilan belgilagan joylaringiz. Bossangiz, aynan o‘sha joy ochiladi.</p></div>
      <div id="hlList">${list.length ? list.map((h) => `<a class="hl-card" href="#/fan/${esc(h.sid)}/${esc(h.tid)}?${esc(h.tab)}&s=${esc(h.s)}&h=${esc(h.id)}">
          <q>${esc(h.text)}</q><span class="hl-meta"><span><b>${esc(h.abbr || "")}</b> · ${esc(h.title || "")}</span>
          <button class="icon-btn" data-del="${esc(h.id)}" aria-label="O‘chirish" style="width:36px;height:36px">${svg(ICX.trash, 18)}</button></span></a>`).join("")
        : emptyState(ICX.marker, "Hali belgilangan joy yo‘q", "Mavzu matnida kerakli gapni barmoq bilan bosib turib belgilang, so‘ng pastda chiqadigan “🖍 Belgilash” tugmasini bosing.")}</div>`;
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      removeHighlight(b.dataset.del); pageBelgilar(); toast("Belgi o‘chirildi");
    }));
  }

  /* ---------- Umumiy: yuqoriga, o'qish chizig'i, pastga tortib yangilash ---------- */
  const toTop = $("#toTop"), rp = $(".read-progress i");
  const onScrollAll = () => {
    const y = window.scrollY;
    toTop.hidden = y < 600 || view.classList.contains("wide");
    if (document.body.classList.contains("reading")) {
      const h = document.documentElement.scrollHeight - innerHeight;
      rp.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScrollAll, { passive: true });
  toTop.addEventListener("click", () => {
    const toc = view.querySelector(".book-toc");
    if (toc) { toc.open = true; toc.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const ptr = $(".ptr");
  let ptrY = null, ptrD = 0, ptrBusy = false;
  async function refreshApp() {
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch { /* oflayn */ }
    for (const k of Object.keys(cache)) delete cache[k];
    searchIndex = null; glossary = null; sentences = null;
    await route();
    toast("Yangilandi");
  }
  window.addEventListener("touchstart", (e) => {
    ptrY = (!ptrBusy && window.scrollY <= 0 && e.touches.length === 1 && !view.classList.contains("wide") && !document.querySelector(".sheet-back,.lightbox") && !getSelection().toString())
      ? e.touches[0].clientY : null;
    ptrD = 0;
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (ptrY == null) return;
    ptrD = window.scrollY > 0 ? 0 : Math.max(0, e.touches[0].clientY - ptrY);
    const d = Math.min(ptrD * 0.5, 84);
    ptr.style.transition = "none";
    ptr.style.opacity = d > 10 ? Math.min(1, d / 60) : 0;
    ptr.style.transform = `translateY(${d - 50}px) rotate(${d * 4}deg)`;
  }, { passive: true });
  window.addEventListener("touchend", async () => {
    if (ptrY == null) return;
    const d = Math.min(ptrD * 0.5, 84);
    ptrY = null;
    ptr.style.transition = "transform .25s ease, opacity .25s ease";
    if (d >= 62) {
      ptrBusy = true;
      ptr.style.transform = "translateY(14px)"; ptr.classList.add("spin");
      await refreshApp();
      setTimeout(() => { ptr.classList.remove("spin"); ptr.style.opacity = 0; ptr.style.transform = ""; ptrBusy = false; }, 350);
    } else { ptr.style.opacity = 0; ptr.style.transform = ""; }
  });

  const SKEL = `<div class="skel"><div class="sk h1"></div><div class="sk h2"></div><div class="sk card"></div><div class="sk row"><i></i><i></i><i></i><i></i></div><div class="sk card"></div><div class="sk card"></div></div>`;
  const STAG = ".hero, .goal, .today-card, .course-switch, .resume, .quick, .fan-card, .sim-card, .tile, .topics li, .result, .gloss, .book, .plan-item, .day, .week-sum, .stat, .badge-card, .week-win, .read-row, .hl-card, .empty-state, .empty-art, .soon-card, .settings, .sum-item, .case";
  function animateIn() {
    view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
    let i = 0;
    view.querySelectorAll(STAG).forEach((el) => {
      if (i > 14 || el.getBoundingClientRect().top > innerHeight + 40) return;
      el.style.setProperty("--i", i++); el.classList.add("stag");
    });
  }

  /* ---------- Test markazi (js/tests.js) uchun ko'prik ---------- */
  const bridge = () => ({ store, esc, inline, plain, fold, svg, IC, ICX, chev, ring, sheet, toast, setChrome, emptyState, shuffle, view, $, loadJSON, refresh: () => route() });

  /* Eski keshdan qolgan sahifada skript bo'lmasa, uni yuklab olish */
  const needScript = (g, src) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src + "?v=" + Date.now();
    s.onload = () => res(); s.onerror = () => rej(new Error("script")); document.head.appendChild(s);
  });

  /* ---------- Yo'naltirgich (router) ---------- */
  async function route() {
    const [path, query] = location.hash.replace(/^#/, "").split("?");
    const p = (path || "/").split("/").filter(Boolean);
    document.body.classList.remove("reading");
    hlBtn.hidden = true;
    const skT = setTimeout(() => { view.classList.remove("wide"); view.innerHTML = SKEL; }, 140);
    try {
      if (!p.length) await pageHome();
      else if (p[0] === "fan" && p.length === 2) await pageSubject(p[1]);
      else if (p[0] === "fan" && p.length === 3 && p[2] === "imtihon") await pageExam(p[1]);
      else if (p[0] === "fan" && p.length === 3 && p[2] === "kitob") await pageBook(p[1]);
      else if (p[0] === "fan" && p.length === 3) await pageTopic(p[1], p[2], query);
      else if (p[0] === "fanlar") await pageFanlar();
      else if (p[0] === "assyst") { location.replace("#/testmarkazi"); return; }
      else if (p[0] === "profil") { location.replace("#/sozlamalar"); return; }
      else if (p[0] === "xonalar" || p[0] === "xona") { location.replace(p[1] ? "#/konsilium/" + p[1] + (query ? "?" + query : "") : "#/konsilium"); return; }
      else if (p[0] === "konsilium") { await needScript("ROOMS", "js/rooms.js"); await window.ROOMS.page(bridge(), p, query); }
      else if (p[0] === "testmarkazi") await window.TM.page(bridge(), p, query);
      else if (p[0] === "reja") pageReja();
      else if (p[0] === "yutuqlar") await pageYutuq();
      else if (p[0] === "belgilar") pageBelgilar();
      else if (p[0] === "sozlamalar") await pageSettings();
      else if (p[0] === "pdf" && p[1]) await pagePdf(p[1]);
      else if (p[0] === "qidiruv") await pageSearch();
      else if (p[0] === "simulyatorlar") await pageSims();
      else if (p[0] === "sim" && p[1]) await pageSim(p[1]);
      else if (p[0] === "kutubxona") await pageLibrary();
      else if (p[0] === "saqlangan") await pageSaved();
      else if (p[0] === "xatolar") await pageWrong();
      else pageNotFound();
    } catch (e) {
      console.error(e);
      view.innerHTML = p[0] === "konsilium"
        ? emptyState(ICX.warn, "Konsilium ochilmadi", "Bu bo‘lim faqat internet bilan ishlaydi. Internetni tekshirib, qayta urinib ko‘ring.", `<button class="btn primary" onclick="location.reload()">Qayta urinish</button>`)
        : emptyState(ICX.warn, "Ma'lumot yuklanmadi", "Internetga ulanib, sahifani pastga tortib yangilang — keyin u oflayn ham ochiladi.");
    }
    clearTimeout(skT);
    const y = pendingScroll; pendingScroll = 0;
    window.scrollTo(0, y);
    animateIn();
    onScrollAll();
  }
  window.addEventListener("hashchange", route);

  applyPrefs();
  window.ACC.boot(bridge());
  route();

  /* ---------- Offline ishlash ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Yangi versiya tayyor. Ilovani qayta oching.");
        });
      });
    }).catch(() => {});
  }
})();
