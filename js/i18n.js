/* ALVORA Med — til tizimi (O'zbekcha asos, English qo'shimcha).
   1) Interfeys matni sahifada paydo bo'lishi bilan avtomatik tarjima qilinadi (DOM kuzatuvchisi):
      lug'atdagi O'zbekcha matn -> tanlangan til. {0},{1} — o'zgaruvchan qismlar (raqam, ism...).
      Tarjimasi yo'q matn O'zbekcha qoladi (ilova hech qachon buzilmaydi).
   2) Kontent fayllari (data/..., sim/...): data/en/..., sim/en/... bo'lsa shu ishlatiladi,
      bo'lmasa O'zbekchasi. Mavjud fayllar ro'yxati data/<til>/manifest.json da. */
(() => {
  "use strict";
  const SUPPORTED = ["uz", "en"];
  const NAMES = { uz: "O‘zbekcha", en: "English" };
  let lang = "uz";
  try {
    const v = JSON.parse(localStorage.getItem("tq:lang"));
    if (SUPPORTED.includes(v)) lang = v;
  } catch { /* xotira yopiq */ }

  /* Apostrof turlari va bo'shliqlar bir xil ko'riladi */
  const norm = (s) => String(s).replace(/[ʻʼ‘’`´]/g, "'").replace(/[“”«»]/g, '"').replace(/\s+/g, " ").trim();
  const esc = (s) => s.replace(/[.*+?^$|\\()[\]]/g, "\\$&");

  const exact = {};       // norm(uz) -> en
  const patterns = [];    // { re, out }
  let avail = new Set();
  const missing = new Set();

  function register(l, obj) {
    if (l !== "en" && l !== lang) return;
    for (const [k, v] of Object.entries(obj)) {
      const nk = norm(k);
      if (/\{\d+\}/.test(nk)) {
        const re = new RegExp("^" + nk.split(/(\{\d+\})/).map((p) => (/^\{\d+\}$/.test(p) ? "(.+?)" : esc(p))).join("") + "$");
        patterns.push({ re, out: v, len: nk.length });
      } else exact[nk] = v;
    }
    patterns.sort((a, b) => b.len - a.len);
  }

  /* Bitta matn bo'lagini tarjima qiladi; topilmasa null */
  function tr(text) {
    const k = norm(text);
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(exact, k)) return exact[k];
    for (const p of patterns) {
      const m = p.re.exec(k);
      if (m) return p.out.replace(/\{(\d+)\}/g, (x, i) => {
        const g = m[+i + 1] ?? "";
        const inner = tr(g);          // ichki bo'lak ham tarjima bo'lishi mumkin (masalan, oy nomi)
        return inner == null ? g : (g.match(/^\s*/)[0] + inner + g.match(/\s*$/)[0]);
      });
    }
    /* "A · B" kabi birikmalarni bo'lib tarjima qilish */
    for (const sep of [" · ", " — ", " / "]) {
      if (k.includes(sep)) {
        const parts = k.split(sep), out = parts.map((x) => tr(x));
        if (out.some((x) => x != null)) return parts.map((x, i) => (out[i] == null ? x : out[i])).join(sep);
      }
    }
    return null;
  }

  function t(s, vars) {
    let r = s;
    if (lang !== "uz") {
      const x = tr(s);
      if (x != null) r = x; else if (s) missing.add(s);
    }
    if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return r;
  }

  /* ---------- DOM tarjimasi ---------- */
  const ATTRS = ["aria-label", "title", "placeholder", "alt"];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|CODE|PRE)$/;          // matn tugunlari uchun (OPTION matni tarjima qilinadi)
  const SKIP_ATTR = /^(SCRIPT|STYLE|NOSCRIPT)$/;                          // atributlar (placeholder, title...) INPUT/TEXTAREA da ham tarjima qilinadi
  const done = new WeakMap();   // tugun -> oxirgi tarjima qilingan qiymat

  function textNode(n) {
    const v = n.nodeValue;
    if (done.get(n) === v) return;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    const r = tr(v);
    if (r != null && r !== norm(v)) { const nv = lead + r + trail; n.nodeValue = nv; done.set(n, nv); }
    else if (r == null && /[A-Za-zʻ‘’']{3,}/.test(v)) missing.add(norm(v));
  }
  function attrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), r = tr(v);
      if (r != null && r !== v) el.setAttribute(a, r);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentElement && !SKIP.test(root.parentElement.tagName)) textNode(root); return; }
    if (root.nodeType !== 1 || SKIP_ATTR.test(root.tagName) || root.closest?.("[data-notr]")) return;
    attrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { const p = n.parentElement; if (p && !SKIP.test(p.tagName) && !p.closest("[data-notr]")) textNode(n); }
      else if (!SKIP_ATTR.test(n.tagName)) attrs(n);
    }
  }

  let queued = new Set(), raf = 0, obs = null;
  function flush() {
    raf = 0;
    const list = [...queued]; queued = new Set();
    obs?.disconnect();
    try { for (const n of list) if (n.isConnected !== false) walk(n); } finally { obs?.observe(document.body, OPTS); }
  }
  const OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  function start() {
    if (lang === "uz" || obs) return;
    document.documentElement.lang = lang;
    const d = document.title && tr(document.title); if (d) document.title = d;
    const md = document.querySelector('meta[name="description"]'); if (md) { const r = tr(md.content); if (r) md.content = r; }
    walk(document.body);
    obs = new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === "childList") r.addedNodes.forEach((n) => queued.add(n));
        else if (r.type === "characterData") queued.add(r.target);
        else if (r.type === "attributes") queued.add(r.target);
      }
      if (!raf) raf = requestAnimationFrame(flush);
    });
    obs.observe(document.body, OPTS);
  }
  const translateStatic = () => { if (lang !== "uz") { walk(document.body); start(); } };

  /* ---------- Kontent fayllari ---------- */
  function path(p) {
    if (lang === "uz" || typeof p !== "string") return p;
    const q = p.replace(/^(data|sim)\//, "$1/" + lang + "/");
    return avail.has(q) ? q : p;
  }
  const hasLocal = (p) => lang === "uz" || avail.has(String(p).replace(/^(data|sim)\//, "$1/" + lang + "/"));
  const locale = () => (lang === "uz" ? "uz-UZ" : "en-US");

  const ready = (async () => {
    document.documentElement.lang = lang;
    if (lang === "uz") return;
    try {
      const r = await fetch("data/" + lang + "/manifest.json", { cache: "no-cache" });
      if (r.ok) { const j = await r.json(); avail = new Set(j.files || []); }
    } catch { /* oflayn — O'zbekcha qoladi */ }
  })();

  window.I18N = {
    SUPPORTED, NAMES, ready, t, tr, path, hasLocal, locale, translateStatic, missing, register,
    get lang() { return lang; }
  };
  window.t = t;
})();
