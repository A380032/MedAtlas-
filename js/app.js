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

  /* ---------- Sahifalar ---------- */
  function setChrome(title, back, tab) {
    view.classList.remove("wide");
    titleEl.textContent = title;
    document.title = title === "MedAtlas" ? "MedAtlas by ALVORA" : title + " · MedAtlas";
    backBtn.hidden = !back;
    document.querySelectorAll(".tabbar a").forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  async function pageHome() {
    setChrome("MedAtlas", false, "home");
    const cat = await catalog();
    const current = store.get("course", "3");
    const course = cat.courses.find((c) => c.id === current) || cat.courses[0];
    const last = store.get("last", null);
    const done = store.get("done", {});

    let continueHTML = "";
    if (last) {
      continueHTML = `<a class="continue" href="#/fan/${esc(last.sid)}/${esc(last.tid)}">
        <span class="small">Davom ettirish · ${esc(last.subject)}</span>
        <strong>${esc(last.title)}</strong></a>`;
    }

    const lb = store.get("lastBook", null);
    if (lb && store.get("bookpos:" + lb.sid, 0) > 300) {
      continueHTML += `<a class="continue" href="#/fan/${esc(lb.sid)}/kitob"><span class="small">Qo‘llanmani davom ettirish</span><strong>${esc(lb.name)}</strong></a>`;
    }
    const spines = await Promise.all(course.subjects.map(async (s) => {
      if (s.status !== "ready") {
        return `<div class="spine soon" style="--c:${esc(s.color)}"><span class="spine-abbr">${esc(s.abbr)}</span>
          <span><span class="spine-name">${esc(s.name)}</span><br><span class="spine-meta">Tayyorlanmoqda</span></span><span></span></div>`;
      }
      let total = 0, read = 0;
      try {
        const d = await loadJSON(s.file);
        total = d.topics.length;
        read = d.topics.filter((t) => done[s.id + "/" + t.id]).length;
      } catch { /* offline va hali yuklanmagan */ }
      const pct = total ? Math.round((read / total) * 100) : 0;
      return `<a class="spine" href="#/fan/${esc(s.id)}" style="--c:${esc(s.color)}">
        <span class="spine-abbr">${esc(s.abbr)}</span>
        <span><span class="spine-name">${esc(s.name)}</span><br>
          <span class="spine-meta">${read} / ${total} mavzu o'qildi</span>
          <span class="progress"><i style="width:${pct}%"></i></span></span>
        <svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>`;
    }));

    view.innerHTML = `
      <div class="hello"><h2>Bugun nimani o'qiymiz?</h2>
        <p class="muted">Kursni tanlang, so'ng fanni oching.</p></div>
      <div class="course-switch" role="group" aria-label="Kurs">
        ${cat.courses.map((c) => `<button data-course="${esc(c.id)}" aria-pressed="${c.id === course.id}">${esc(c.name)}</button>`).join("")}
      </div>
      ${continueHTML}
      ${Object.keys(store.get("wrong", {})).length ? `<a class="continue alt" href="#/xatolar"><span class="small">Takrorlash</span><strong>Xatolar ustida ishlash · ${Object.keys(store.get("wrong", {})).length} ta savol</strong></a>` : ""}
      <div class="shelf">${spines.join("")}</div>
      ${settingsHTML()}`;

    view.querySelectorAll("[data-course]").forEach((b) => b.addEventListener("click", () => {
      store.set("course", b.dataset.course);
      pageHome();
    }));
    bindSettings();
  }

  function settingsHTML() {
    const fs = store.get("fs", 1);
    return `<section class="settings" aria-label="Sozlamalar">
      <div class="setting-row"><span>Matn o'lchami</span>
        <span class="stepper"><button data-fs="-1" aria-label="Kichikroq">A−</button><button data-fs="1" aria-label="Kattaroq">A+</button></span></div>
      <div class="setting-row"><span>Ilovani telefonga o'rnatish</span>
        <button class="btn" id="installBtn">Qanday?</button></div>
      <div class="setting-row about"><span class="small"><strong>MedAtlas by ALVORA</strong><br>Yaratuvchi jamoa: ALVORA<br>Muallif: Asadbek Axmatkulov, 2-son davolash ishi</span></div>
      <div class="setting-row small muted"><span>Versiya 0.9.11 · offline ishlaydi</span><span>${Math.round(fs * 100)}%</span></div>
    </section>`;
  }
  function bindSettings() {
    view.querySelectorAll("[data-fs]").forEach((b) => b.addEventListener("click", () => {
      let fs = store.get("fs", 1) + Number(b.dataset.fs) * 0.1;
      fs = Math.min(1.4, Math.max(0.85, Math.round(fs * 100) / 100));
      store.set("fs", fs);
      applyPrefs();
      pageHome();
    }));
    const ib = $("#installBtn");
    if (ib) ib.addEventListener("click", installHelp);
  }

  async function pageSubject(sid) {
    const s = await loadSubject(sid);
    if (!s) return pageNotFound();
    setChrome(s.meta.name, true, "home");
    const cat = await catalog();
    const simHTML = ""; // simulyatorlar faqat "Simulyator" bo'limida
    const counts = (t) => [
      t.quiz?.length ? `${t.quiz.length} test` : "",
      t.cards?.length ? `${t.cards.length} kartochka` : "",
      t.cases?.length ? `${t.cases.length} masala` : ""
    ].filter(Boolean).join(" · ");
    view.innerHTML = `
      <div class="subject-head" style="--c:${esc(s.meta.color)}">
        <h2>${esc(s.data.name)}</h2>
        <p class="muted small">${esc(s.course.name)}${s.data.description ? " · " + esc(s.data.description) : ""}</p>
      </div>
      ${(() => {
        const nQ = s.data.topics.reduce((n, t) => n + (t.quiz?.length || 0), 0);
        const examHTML = nQ ? `<a class="spine" href="#/fan/${esc(sid)}/imtihon" style="--c:${esc(s.meta.color)}">
          <span class="spine-abbr">TEST</span>
          <span><span class="spine-name">Aralash imtihon</span><br><span class="spine-meta">${nQ} ta savol · mavzularni tanlab ishlang</span></span>
          <svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>` : "";
        const bookHTML = s.data.topics.some((t) => t.sections?.length) ? `<a class="spine" href="#/fan/${esc(sid)}/kitob" style="--c:${esc(s.meta.color)}">
          <span class="spine-abbr">KITOB</span>
          <span><span class="spine-name">Qo'llanma</span><br><span class="spine-meta">${s.data.topics.length} ta mavzu · to'liq o'qish${s.meta.pdf ? " · PDF" : ""}</span></span>
          <svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>` : "";
        return (simHTML || examHTML || bookHTML) ? `<div class="shelf" style="margin-bottom:6px">${simHTML}${bookHTML}${examHTML}</div><h3 class="group-label">Mavzular</h3>` : "";
      })()}
      <ol class="topics" style="--c:${esc(s.meta.color)}">
        ${s.data.topics.map((t, i) => `<li><a class="topic-link ${isDone(sid, t.id) ? "done" : ""}" href="#/fan/${esc(sid)}/${esc(t.id)}">
          <span class="topic-no">${t.no || i + 1}</span>
          <span><span class="topic-title">${esc(t.title)}</span>${counts(t) ? `<br><span class="small muted">${esc(counts(t))}</span>` : ""}</span>
          ${isSaved(sid, t.id) ? `<svg width="16" height="16" viewBox="0 0 24 24" aria-label="Saqlangan"><path d="M7 3h10v18l-5-4-5 4z" fill="currentColor"/></svg>` : "<span></span>"}
        </a></li>`).join("")}
      </ol>`;
  }

  /* ---------- Qo'llanmani to'liq o'qish ---------- */
  async function pageBook(sid) {
    const s = await loadSubject(sid);
    if (!s) return pageNotFound();
    setChrome("Qo'llanma", true, "home");
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
      ${s.meta.pdf ? `<p style="margin:0 0 14px"><a class="btn" href="${esc(s.meta.pdf)}" target="_blank" rel="noopener">PDF nusxasini ochish</a></p>` : ""}
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
    setChrome("Aralash imtihon", true, "home");
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

  const details = (title, inner, open = false) =>
    `<details class="sec"${open ? " open" : ""}><summary>${inline(title)}</summary><div class="sec-body prose">${inner}</div></details>`;

  function topicBody(t, id) {
    if (id === "xulosa") {
      return `<div class="summary-list">${t.summary.map((x) => typeof x === "string"
        ? `<div class="sum-item"><p>${inline(x)}</p></div>`
        : `<div class="sum-item sum-${esc(x.kind)}"><span class="sum-label">${esc(x.label)}</span><p>${inline(x.text)}</p></div>`).join("")}</div>`;
    }
    if (id === "matn") {
      if (t.body) return `<div class="prose">${renderBlocks(t.body)}</div>`;
      const goals = t.goals?.length ? details("Mashg'ulot maqsadi", renderBlocks(t.goals)) : "";
      const secs = t.sections.map((s, i) => details(s.title || "Kirish", renderBlocks(s.blocks), i === 0 && !goals)).join("");
      return `<div class="sec-tools"><button class="btn" data-toggle-all>Hammasini ochish</button></div>${goals}${secs}`;
    }
    if (id === "bosqich") {
      if (t.steps) return `<div class="steps">${t.steps.map((st, i) => `<div class="step"><b class="n">${i + 1}</b><div><strong>${esc(st.title)}</strong><p class="muted">${esc(st.text)}</p></div></div>`).join("")}</div>`;
      return `<p class="muted small">Amaliy ko'nikmalarni bajarish algoritmlari.</p>` + t.skills.map((s, i) => details(s.title, renderBlocks(s.blocks), i === 0)).join("");
    }
    if (id === "savol") return `<div class="prose"><ol class="qlist">${t.questions.map((q) => `<li>${inline(q)}</li>`).join("")}</ol></div>`;
    if (id === "masala") {
      return t.cases.map((c, i) => `<article class="case"><h3>${esc(c.title)}</h3><p>${inline(c.text)}</p>
        ${c.ask ? `<p class="ask"><strong>Savollar:</strong> ${inline(c.ask)}</p>` : ""}
        <details class="reveal"><summary>Javobni ko'rish</summary><p>${inline(c.answer)}</p></details></article>`).join("");
    }
    return "";
  }

  async function pageTopic(sid, tid, tab) {
    const s = await loadSubject(sid);
    const t = s?.data.topics.find((x) => x.id === tid);
    if (!t) return pageNotFound();
    setChrome(s.meta.name, true, "home");
    store.set("last", { sid, tid, title: t.title, subject: s.meta.abbr });

    const tabs = TABS.filter((x) => x.has(t));
    const active = tabs.find((x) => x.id === tab)?.id || tabs[0]?.id;

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
      history.replaceState(null, "", `#/fan/${sid}/${tid}?${id}`);
      if (id === "test") runQuiz(body, t.quiz, sid + "/" + tid);
      else if (id === "karta") runCards(body, t.cards);
      else {
        body.innerHTML = topicBody(t, id);
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
  function runCards(el, cards) {
    let deck = cards, i = 0;
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
            for (const sec of t.sections) index.push({ ...base, where: sec.title, text: flattenBlocks(sec.blocks).join(" ") });
            (t.skills || []).forEach((k) => index.push({ ...base, where: k.title, tab: "bosqich", text: flattenBlocks(k.blocks).join(" ") }));
            (t.cases || []).forEach((k) => index.push({ ...base, where: k.title, tab: "masala", text: [k.text, k.ask, k.answer].join(" ") }));
            (t.summary || []).forEach((k) => index.push({ ...base, where: "Qisqa xulosa", tab: "xulosa", text: k.text }));
            (t.cards || []).forEach((k) => index.push({ ...base, where: "Kartochka", tab: "karta", text: k.front + " — " + k.back }));
          } else {
            index.push({ ...base, where: "", text: [t.title, ...(t.summary || []), ...flattenBlocks(t.body)].join(" ") });
          }
        }
      } catch { /* yuklanmagan fan */ }
    }
    index.forEach((x) => { x.f = fold(x.text); x.ft = fold(x.t.title + " " + x.where); });
    searchIndex = index;
    return index;
  }

  let glossary = null;
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
  async function buildGlossary() {
    if (glossary) return glossary;
    const cat = await catalog();
    const map = new Map();
    const add = (term, mean, abbr, rank) => {
      term = term.trim().replace(/[:;,.\s]+$/, ""); mean = mean.trim();
      if (term.length < 2 || term.length > 80 || mean.length < 8 || term.split(/\s+/).length > 9) return;
      const key = fold(plain(term)).replace(/\s+/g, " ");
      let e = map.get(key);
      if (!e) { e = { term, means: [], keys: termKeys(plain(term)) }; map.set(key, e); }
      const fm = fold(mean).slice(0, 40);
      if (e.means.some((m) => m.f === fm)) return;
      const bad = (/[;,:]$/.test(mean) ? 3 : 0) + (mean.length < 40 ? 2 : 0) + (/^[a-zа-яо‘'’]/.test(mean) && mean.split(/\s+/).length < 6 ? 1 : 0);
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
              add(plain(m[1]), mean.length > 320 ? mean.slice(0, 320).replace(/\s+\S*$/, "") + "…" : mean, sj.abbr, m.index <= 3 ? 0 : 2);
            }
          }
          for (const k of t.cards || []) add(plain(k.front), plain(k.back), sj.abbr, 1);
        }
      } catch { /* yuklanmagan fan */ }
    }
    glossary = [...map.values()].map((e) => {
      e.means.sort((a, b) => a.rank - b.rank);
      const best = e.means[0].rank;
      e.means = e.means.filter((m) => m.rank <= best + 1).slice(0, 3);
      e.ft = e.keys.join(" | ");
      e.abbrs = [...new Set(e.means.map((m) => m.abbr))];
      return e;
    }).sort((a, b) => a.term.localeCompare(b.term, "uz"));
    return glossary;
  }

  async function pageSearch() {
    setChrome("Qidiruv", false, "search");
    let mode = store.get("searchMode", "atama");
    view.innerHTML = `<div class="seg" role="tablist" style="margin-bottom:12px">
        <button role="tab" data-mode="atama" aria-selected="${mode === "atama"}">Atamalar lug'ati</button>
        <button role="tab" data-mode="kitob" aria-selected="${mode === "kitob"}">Kitoblarda qidirish</button></div>
      <input class="search-input" id="q" type="search" autocomplete="off" enterkeyhint="search">
      <div id="results"></div>`;
    const input = $("#q"), out = $("#results");
    if (matchMedia("(pointer:fine)").matches) input.focus();
    const hl = (txt, terms) => {
      const re = new RegExp("(" + terms.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&#39;|'/g, "(?:'|&#39;|‘|’)")).join("|") + ")", "gi");
      return esc(txt).replace(re, (m) => `<mark>${m}</mark>`);
    };
    const runTerms = async () => {
      const g = await buildGlossary();
      const q = fold(input.value.trim());
      if (q.length < 2) { out.innerHTML = `<p class="empty">Lug'atda ${g.length} ta atama bor. Atamani yozing — faqat uning ma'nosi ko'rsatiladi.</p>`; return; }
      const terms = q.split(/\s+/).filter(Boolean);
      const qq = terms.join(" ");
      const score = (x) => {
        if (x.keys.includes(qq)) return 0;
        if (x.keys.some((k) => k.startsWith(qq))) return 1;
        if (x.keys.some((k) => k.split(/[\s-]+/).some((w) => w.startsWith(terms[0])) && terms.every((w) => k.includes(w)))) return 2;
        return terms.every((w) => x.ft.includes(w)) ? 3 : 9;
      };
      const byTerm = g.map((x) => ({ x, sc: score(x) })).filter((r) => r.sc < 9)
        .sort((a, b) => a.sc - b.sc || a.x.term.length - b.x.term.length).map((r) => r.x);
      const byMean = byTerm.length < 5 ? g.filter((x) => !byTerm.includes(x) && x.means.some((m) => terms.every((w) => fold(m.t).includes(w)))).slice(0, 10) : [];
      if (!byTerm.length && !byMean.length) { out.innerHTML = `<p class="empty">“${esc(input.value.trim())}” lug'atda topilmadi. "Kitoblarda qidirish" bo'limida urinib ko'ring.</p>`; return; }
      const item = (x) => `<div class="gloss"><strong>${hl(x.term, terms)}</strong><span class="gloss-tag">${esc(x.abbrs.join(", "))}</span>${x.means.map((m) => `<p>${hl(m.t, terms)}${x.abbrs.length > 1 ? ` <span class="gloss-tag">${esc(m.abbr)}</span>` : ""}</p>`).join("")}</div>`;
      out.innerHTML = byTerm.slice(0, 40).map(item).join("") +
        (byMean.length ? `<p class="small muted" style="margin:14px 0 6px">Ma'nosida uchraydi:</p>` + byMean.map(item).join("") : "");
    };
    const runBooks = async () => {
      const q = fold(input.value.trim());
      if (q.length < 2) { out.innerHTML = `<p class="empty">Atama kitoblarning qaysi mavzusi va bo'limida uchrashini ko'rsatadi.</p>`; return; }
      const index = await buildIndex();
      const terms = q.split(/\s+/).filter(Boolean);
      const hits = [];
      for (const x of index) {
        if (!terms.every((w) => x.f.includes(w) || x.ft.includes(w))) continue;
        hits.push({ x, pos: x.f.indexOf(terms[0]), title: terms.every((w) => x.ft.includes(w)) });
      }
      hits.sort((a, b) => (b.title - a.title));
      if (!hits.length) { out.innerHTML = `<p class="empty">“${esc(input.value.trim())}” bo'yicha hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring.</p>`; return; }
      const shown = hits.slice(0, 40);
      out.innerHTML = `<p class="small muted" style="margin:0 0 8px">${hits.length} ta natija${hits.length > 40 ? " (dastlabki 40 tasi)" : ""}</p>` + shown.map((h) => {
        const txt = plain(h.x.text);
        const pos = h.pos >= 0 ? h.pos : 0;
        const raw = txt.slice(Math.max(0, pos - 50), pos + terms[0].length + 90);
        const href = `#/fan/${esc(h.x.sid)}/${esc(h.x.t.id)}${h.x.tab ? "?" + h.x.tab : ""}`;
        return `<a class="result" href="${href}"><strong>${esc(h.x.t.no ? h.x.t.no + "-mavzu. " : "")}${esc(h.x.where || h.x.t.title)}</strong>
          <div class="small muted">${esc(h.x.abbr)} · …${hl(raw, terms)}…</div></a>`;
      }).join("");
    };
    const run = () => (mode === "atama" ? runTerms() : runBooks());
    const setMode = (m) => {
      mode = m; store.set("searchMode", m);
      view.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-selected", b.dataset.mode === m));
      input.placeholder = m === "atama" ? "Atama, masalan: gipoksiya" : "Atama yoki mavzu, masalan: surfaktant";
      run();
    };
    view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { setMode(b.dataset.mode); input.focus(); }));
    let timer;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 120); });
    setMode(mode);
    input.focus();
  }

  /* ---------- Simulyatorlar ---------- */
  async function pageSims() {
    setChrome("Simulyatorlar", false, "sim");
    const cat = await catalog();
    view.innerHTML = `<div class="hello"><h2>Simulyatorlar</h2>
      <p class="muted">Virtual bemorlar, fizikal tekshiruv va atlaslar: ${cat.simulators.filter((x) => x.status === "ready").length} ta.</p></div>
      <div class="shelf">${cat.simulators.map((s) => s.status === "ready"
        ? `<a class="spine" href="#/sim/${esc(s.id)}" style="--c:${esc(s.color)}"><span class="spine-abbr">${esc(s.abbr || s.subject.toUpperCase())}</span>
          <span><span class="spine-name">${esc(s.name)}</span><br><span class="spine-meta">${esc(s.note)}</span></span>
          <svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>`
        : `<div class="spine soon" style="--c:${esc(s.color)}"><span class="spine-abbr">${esc(s.subject.toUpperCase())}</span>
          <span><span class="spine-name">${esc(s.name)}</span><br><span class="spine-meta">${esc(s.note)}</span></span><span></span></div>`).join("")}</div>`;
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
      view.innerHTML = wrongLink + `<p class="empty">Hali hech narsa saqlanmagan.<br>Mavzu ichidagi “Saqlash” tugmasini bosing, u shu yerda paydo bo'ladi.</p>`;
      return;
    }
    const items = [];
    for (const key of saved) {
      const [sid, tid] = key.split("/");
      const s = await loadSubject(sid).catch(() => null);
      const t = s?.data.topics.find((x) => x.id === tid);
      if (t) items.push(`<a class="result" href="#/fan/${esc(sid)}/${esc(tid)}"><strong>${esc(t.title)}</strong><div class="small muted">${esc(s.meta.name)}</div></a>`);
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
    document.documentElement.style.setProperty("--fs", store.get("fs", 1));
    const fsv = store.get("fs", 1);
    $("#fsDown")?.toggleAttribute("disabled", fsv <= 0.86);
    $("#fsUp")?.toggleAttribute("disabled", fsv >= 1.39);
    const dark = theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.querySelector('meta[name="theme-color"]').content = dark ? "#0f1d1c" : "#eef3ef";
  }
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    store.set("theme", cur === "dark" ? "light" : "dark");
    applyPrefs();
  });
  const stepFs = (d) => {
    const fs = Math.min(1.4, Math.max(0.85, Math.round((store.get("fs", 1) + d * 0.1) * 100) / 100));
    store.set("fs", fs); applyPrefs(); toast("Matn o‘lchami: " + Math.round(fs * 100) + "%");
  };
  $("#fsDown").addEventListener("click", () => stepFs(-1));
  $("#fsUp").addEventListener("click", () => stepFs(1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) { e.preventDefault(); location.hash = "#/qidiruv"; setTimeout(() => $("#q")?.focus(), 150); }
  });
  backBtn.addEventListener("click", () => {
    const parts = location.hash.split("?")[0].split("/").filter(Boolean);
    if (parts[0] === "fan" && parts.length === 3) location.hash = `#/fan/${parts[1]}`;
    else if (parts[0] === "sim") history.length > 1 ? history.back() : (location.hash = "#/simulyatorlar");
    else location.hash = "#/";
  });

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
    window.scrollTo(0, 0);
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
