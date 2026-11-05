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
    const d = store.get("done", {});
    if (val) d[sid + "/" + tid] = 1; else delete d[sid + "/" + tid];
    store.set("done", d);
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
  const setBtn = $("#setBtn");
  function setChrome(title, back, tab, opt = {}) {
    view.classList.remove("wide");
    titleEl.textContent = title;
    $(".topbar").classList.toggle("is-home", !!opt.home);
    document.title = opt.home ? "ALVORA Med" : title + " · ALVORA Med";
    backBtn.hidden = !back;
    setBtn.hidden = !opt.home;
    navLinks.forEach((a) => {
      a.removeAttribute("aria-current"); a.removeAttribute("data-soft");
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
      else if (tab === "fanlar" && a.dataset.tab === "home") a.dataset.soft = "1";
    });
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
      ["#/simulyatorlar", IC.sim, "Simulyator", ""],
      ["#/assyst", IC.assyst, "Assyst", ""],
      ["#/reja", IC.plan, "Reja", ""],
      ["#/xatolar", IC.redo, "Xatolar", wn ? String(wn) : ""]
    ].map(([h, ic, t, n]) => `<a class="quick" href="${h}"><span class="quick-ico">${svg(ic, 24)}${n ? `<i class="badge">${n}</i>` : ""}</span><span>${t}</span></a>`).join("");

    view.innerHTML = `
      <section class="hero">
        <div><h2>Xush kelibsiz 👋</h2><p class="muted">Bugun nimani o'qiymiz?</p></div>
      </section>
      <a class="goal" href="#/fanlar">${ring(pct, 62)}
        <span class="goal-txt"><b>Kurs bo'yicha jarayon</b><small>${esc(course.name)} · ${read} / ${total} mavzu o'qildi</small></span>${chev}</a>
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
      <section class="settings">
        <div class="setting-col"><span>Ko'rinish</span>
          <div class="seg flat" role="group" style="margin:8px 0 0">
            <button data-th="" aria-selected="${!th}">Avto</button><button data-th="light" aria-selected="${th === "light"}">Yorug‘</button><button data-th="dark" aria-selected="${th === "dark"}">Tungi</button></div></div>
        <div class="setting-row"><span>Ilovani telefonga o'rnatish</span><button class="btn" id="installBtn">Qanday?</button></div>
        <div class="setting-row about"><span class="small"><strong>ALVORA Med</strong><br>Yaratuvchi jamoa: ALVORA<br>Muallif: Asadbek Axmatkulov, 2-son davolash ishi</span></div>
        <div class="setting-row small muted"><span>Versiya 0.10.0 · offline ishlaydi</span></div>
      </section>`;
    view.querySelectorAll("[data-th]").forEach((b) => b.addEventListener("click", () => {
      store.set("theme", b.dataset.th || null);
      applyPrefs();
      view.querySelectorAll("[data-th]").forEach((x) => x.setAttribute("aria-selected", x === b));
    }));
    $("#installBtn").addEventListener("click", installHelp);
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
    document.querySelector(".to-top")?.remove();
    const up = document.createElement("button");
    up.className = "to-top"; up.type = "button"; up.hidden = true;
    up.setAttribute("aria-label", "Mundarijaga qaytish");
    up.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    document.body.appendChild(up);
    up.addEventListener("click", () => {
      const toc = view.querySelector(".book-toc");
      if (toc) { toc.open = true; toc.scrollIntoView({ behavior: "smooth", block: "start" }); } else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const toggleUp = () => { up.hidden = window.scrollY < 600; };
    window.addEventListener("scroll", toggleUp, { passive: true }); toggleUp();
    window.addEventListener("hashchange", () => { window.removeEventListener("scroll", toggleUp); up.remove(); }, { once: true });
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
    let deep = qp.get("q") ? { s: qp.get("s"), q: qp.get("q") } : null;

    view.innerHTML = `
      <h2 style="margin-bottom:12px">${t.no ? `<span class="muted">${t.no}-mavzu.</span> ` : ""}${esc(t.title)}</h2>
      <div class="seg" role="tablist">
        ${tabs.map((x) => `<button role="tab" data-tab="${x.id}" aria-selected="${x.id === active}">${x.label}</button>`).join("")}
      </div>
      <div id="tabBody"></div>
      <div class="topic-actions">
        <button class="btn ${isDone(sid, tid) ? "" : "primary"}" id="doneBtn">${isDone(sid, tid) ? "O'qilgan ✓" : "O'qildi deb belgilash"}</button>
        <button class="btn" id="saveBtn" aria-pressed="${isSaved(sid, tid)}">${isSaved(sid, tid) ? "Saqlangan" : "Saqlash"}</button>
      </div>`;

    const body = $("#tabBody");
    const show = (id) => {
      view.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
      history.replaceState(null, "", `#/fan/${sid}/${tid}?${id}`); navSync();
      const dp = deep; deep = null;
      if (id === "test") runQuiz(body, t.quiz, sid + "/" + tid);
      else if (id === "karta") runCards(body, t.cards, dp && dp.s != null ? Number(dp.s) || 0 : 0);
      else {
        body.innerHTML = topicBody(t, id, !!dp);
        if (dp) jumpTo(body, id, dp.s, dp.q);
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
      const now = !isDone(sid, tid);
      setDone(sid, tid, now);
      const b = $("#doneBtn");
      b.textContent = now ? "O'qilgan ✓" : "O'qildi deb belgilash";
      b.classList.toggle("primary", !now);
      toast(now ? "Mavzu o'qilgan deb belgilandi" : "Belgi olib tashlandi");
    });
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
      <div id="results"></div>`;
    const input = $("#q"), out = $("#results");
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
    const run = () => { lastSearch.q = input.value; return mode === "atama" ? runTerms() : runBooks(); };
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
          <span class="fan-txt"><span class="fan-name strong">${esc(s.name)}</span><span class="fan-meta">${esc(s.note)}</span></span></div>`).join("") || `<p class="empty">Bu toifada hozircha simulyator yo'q.</p>`;
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
      $("#shelves").innerHTML = out.join("") || `<p class="empty">Hech narsa topilmadi.</p>`;
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
      view.innerHTML = `<p class="empty">Hozircha xato javoblar yo‘q.<br>Testlarda noto‘g‘ri javob bergan savollaringiz shu yerga yig‘iladi. To‘g‘ri javob bersangiz, savol ro‘yxatdan chiqadi.</p>`;
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
    const wrongLink = `<a class="continue" href="#/xatolar"><span class="small">Takrorlash</span><strong>Xatolar ustida ishlash${wn ? " · " + wn + " ta savol" : ""}</strong></a>`;
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
    view.innerHTML = `<p class="empty">Bu sahifa topilmadi. <a href="#/">Bosh sahifaga qaytish</a></p>`;
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
  setBtn.addEventListener("click", () => { location.hash = "#/sozlamalar"; });
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

  /* ---------- Yo'naltirgich (router) ---------- */
  async function route() {
    const [path, query] = location.hash.replace(/^#/, "").split("?");
    const p = (path || "/").split("/").filter(Boolean);
    try {
      if (!p.length) await pageHome();
      else if (p[0] === "fan" && p.length === 2) await pageSubject(p[1]);
      else if (p[0] === "fan" && p.length === 3 && p[2] === "imtihon") await pageExam(p[1]);
      else if (p[0] === "fan" && p.length === 3 && p[2] === "kitob") await pageBook(p[1]);
      else if (p[0] === "fan" && p.length === 3) await pageTopic(p[1], p[2], query);
      else if (p[0] === "fanlar") await pageFanlar();
      else if (p[0] === "assyst") pageSoon("assyst", "Assyst", "Bilimingizni tekshiring va mustahkamlang.", ["Mavzu bo'yicha", "Aralash", "Imtihon"], IC.assyst);
      else if (p[0] === "reja") pageSoon("reja", "Reja", "Kunlik va haftalik o'quv rejangiz.", ["Bugun", "Hafta", "Maqsadlar"], IC.plan);
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
      view.innerHTML = `<p class="empty">Ma'lumot yuklanmadi. Internetga ulanib, sahifani yangilang — keyin u offline ham ochiladi.</p>`;
    }
    const y = pendingScroll; pendingScroll = 0;
    window.scrollTo(0, y);
  }
  window.addEventListener("hashchange", route);

  applyPrefs();
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
