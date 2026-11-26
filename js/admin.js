/* ALVORA Med — Statistika (faqat admin uchun): foydalanuvchilar, qurilmalar, Konsilium va limitlar.
   Ma'lumot Supabase'dagi admin_stats() funksiyasidan keladi; u adminlikni serverning o'zida tekshiradi. */
(() => {
  "use strict";
  let A = null, seq = 0;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/,/g, " ");
  const LANGN = { uz: "O‘zbekcha", en: "English", "?": "Aniqlanmagan (eski versiya)" };
  const MON = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const day = (s) => { const d = new Date(s); return isNaN(d) ? "—" : d.getDate() + "-" + MON[d.getMonth()]; };
  const when = (s) => {
    if (!s) return "—";
    const d = new Date(s), m = Math.round((Date.now() - d) / 60000);
    if (m < 2) return "hozirgina";
    if (m < 60) return m + " daqiqa oldin";
    if (m < 1440) return Math.round(m / 60) + " soat oldin";
    if (m < 2880) return "kecha";
    return day(s) + " " + d.getFullYear();
  };
  const mb = (b) => (b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(b < 10 * 1048576 ? 1 : 0) + " MB");
  const PROV = { google: "Google", telegram: "Telegram", email: "Email" };
  const ROLE = { talaba: "Talaba", oqituvchi: "O‘qituvchi", boshqa: "Boshqa" };
  const SECN = { bosh: "Bosh sahifa", fan: "Fanlar va qo‘llanmalar", test: "Test markazi", battle: "Test battle", konsilium: "Konsilium", sim: "Simulyatorlar",
    kutubxona: "Kutubxona va PDF", reja: "Reja", yutuq: "Yutuqlar", sozlama: "Sozlamalar", qidiruv: "Qidiruv", boshqa: "Boshqa" };
  let S = null, win = 7;
  const dur = (sec) => { sec = Math.round(sec || 0); return sec < 90 ? sec + " soniya" : sec < 5400 ? Math.round(sec / 60) + " daqiqa" : (sec / 3600).toFixed(sec < 36000 ? 1 : 0) + " soat"; };
  // "1.2.10" > "1.2.9": raqamlar bilan solishtiriladi
  const vcmp = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };

  const tile = (v, l, sub) => `<div class="ad-tile"><b>${v}</b><span>${esc(l)}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
  function bars(obj, names = {}) {
    const rows = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return `<p class="small muted">Hali ma’lumot yo‘q</p>`;
    const max = Math.max(...rows.map((r) => r[1]), 1), tot = rows.reduce((n, r) => n + r[1], 0);
    return rows.map(([k, n]) => `<div class="ad-bar"><span class="ad-bl">${esc(names[k] || k)}</span>
      <span class="ad-bt"><i style="width:${Math.max(3, Math.round(n / max * 100))}%"></i></span><span class="ad-bn">${num(n)} <small>${Math.round(n / tot * 100)}%</small></span></div>`).join("");
  }
  function chart(daily) {
    const W = 600, H = 150, pad = 4, n = daily.length || 1, bw = (W - pad * 2) / n;
    const max = Math.max(1, ...daily.map((d) => Math.max(d.act, d.new)));
    const col = daily.map((d, i) => {
      const x = pad + i * bw, ha = d.act / max * (H - 20), hn = d.new / max * (H - 20);
      return `<rect x="${(x + 1).toFixed(1)}" y="${(H - ha).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${ha.toFixed(1)}" rx="2" class="ad-c-act"><title>${day(d.d)}: ${d.act} faol, ${d.new} yangi</title></rect>`
        + (d.new ? `<rect x="${(x + bw * 0.28).toFixed(1)}" y="${(H - hn).toFixed(1)}" width="${(bw * 0.44).toFixed(1)}" height="${hn.toFixed(1)}" rx="1.5" class="ad-c-new"></rect>` : "");
    }).join("");
    return `<svg class="ad-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Oxirgi 30 kun: kunlik faol va yangi foydalanuvchilar">${col}</svg>
      <div class="ad-axis small muted"><span>${day(daily[0]?.d)}</span><span>${day(daily[daily.length - 1]?.d)}</span></div>
      <div class="ad-legend small"><span><i class="ad-c-act"></i>Kunlik faol</span><span><i class="ad-c-new"></i>Yangi ro‘yxatdan o‘tgan</span></div>`;
  }
  function limit(label, used, max, fmt, note) {
    const pct = max ? Math.min(100, used / max * 100) : 0;
    return `<div class="ad-lim"><div class="ad-lim-h"><b>${esc(label)}</b><span>${fmt(used)} / ${fmt(max)}</span></div>
      <span class="ad-bt big${pct > 80 ? " warn" : ""}"><i style="width:${Math.max(1, pct).toFixed(1)}%"></i></span>${note ? `<small class="muted">${note}</small>` : ""}</div>`;
  }

  async function load(my) {
    const c = await window.ACC.ctx();
    if (!c.sb || !c.user) throw new Error("Hisobga kiring");
    const [{ data, error }, lg, us] = await Promise.all([c.sb.rpc("admin_stats"), c.sb.rpc("admin_lang_stats").then((x) => x, () => ({})), c.sb.rpc("admin_usage_stats").then((x) => x, () => ({}))]);
    if (error) throw new Error(/forbidden/.test(error.message) ? "Bu sahifa faqat admin uchun" : "Statistika yuklanmadi");
    if (my !== seq) return;
    draw({ ...data, ...(lg && lg.data ? lg.data : {}), ...(us && us.data ? { usage_ok: true, ...us.data } : {}) });
  }

  // Onlayn holat, versiyalar va bo'limlarda sarflangan vaqt (v1.2.4)
  function liveBlock(s) {
    if (!s.usage_ok) return `<h3 class="group-label">Hozir va foydalanish vaqti</h3><section class="ad-card"><p class="small muted">Bu ma’lumot hali yuklanmadi. “Yangilash” tugmasini bosing.</p></section>`;
    const cur = window.APP_VERSION || "";
    const v7 = s.version7 || {}, tot7 = Object.values(v7).reduce((n, x) => n + x, 0);
    const latest = [cur, ...Object.keys(v7)].filter((k) => /^\d/.test(k)).sort(vcmp).pop() || cur;
    const onLatest = v7[latest] || 0, behind = tot7 - onLatest - (v7["?"] || 0);
    const rows = (s.usage || []).filter((r) => r["secs" + win] > 0).sort((a, b) => b["secs" + win] - a["secs" + win]);
    const totSecs = rows.reduce((n, r) => n + r["secs" + win], 0), maxSecs = Math.max(1, ...rows.map((r) => r["secs" + win]));
    const trs = rows.map((r) => {
      const secs = r["secs" + win], us = r["users" + win];
      return `<tr><td><b>${esc(SECN[r.section] || r.section)}</b><span class="ad-bt" style="display:block;margin-top:5px"><i style="width:${Math.max(3, Math.round(secs / maxSecs * 100))}%"></i></span></td>
        <td>${dur(secs)}<small>${Math.round(secs / totSecs * 100)}%</small></td><td>${num(us)}</td><td>${dur(secs / Math.max(1, us))}</td></tr>`;
    }).join("");
    return `<h3 class="group-label">Hozir va foydalanish vaqti</h3>
      <div class="ad-grid">
        ${tile(num(s.online), "hozir onlayn", `oxirgi soatda: ${num(s.online_hour)}`)}
        ${tile(tot7 ? Math.round(onLatest / tot7 * 100) + "%" : "—", `${esc(latest)} versiyada`, `7 kunda faol ${num(tot7)} qurilmadan · eskida: ${num(behind)}`)}
        ${tile(dur(s.avg_day_secs7), "kuniga o‘rtacha", `faol foydalanuvchi, 7 kun · hisoblanganlar: ${num(s.tracked7)}`)}
      </div>
      <div class="ad-cols">
        <section class="ad-card"><h3>Hozir qaysi bo‘limda</h3>${bars(s.online_sections, SECN)}<small class="muted">Oxirgi 90 soniyada ping yuborganlar</small></section>
        <section class="ad-card"><h3>Versiya · 7 kunda faol</h3>${bars(v7)}<small class="muted">Qurilmalar soni; so‘nggi ochilgan versiyasi bo‘yicha</small></section>
        <section class="ad-card"><h3>Versiya · oxirgi 24 soat</h3>${bars(s.version1)}</section>
      </div>
      <section class="ad-card ad-tbl-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 4px 2px"><h3 style="margin:0">Bo‘limlarda sarflangan vaqt</h3>
          <span><button class="btn${win === 7 ? " primary" : ""}" data-win="7">7 kun</button> <button class="btn${win === 30 ? " primary" : ""}" data-win="30">30 kun</button></span></div>
        <table class="ad-tbl"><thead><tr><th>Bo‘lim</th><th>Jami</th><th>Foydalanuvchi</th><th>Odamga o‘rtacha</th></tr></thead>
          <tbody>${trs || `<tr><td colspan="4" class="muted">Hali ma’lumot yo‘q. Vaqt ${esc(cur || "1.2.4")} va undan yangi versiyada yig‘iladi.</td></tr>`}</tbody></table>
        <p class="small muted" style="margin:8px 4px 2px">Vaqt faqat ilova ochiq va foydalanuvchi faol bo‘lganda sanaladi (2 daqiqa tegmasa to‘xtaydi; Konsilium va Test battle'da to‘xtamaydi). Yangi versiyaga o‘tgan foydalanuvchilar ${num(s.tracked30)} ta (30 kun).</p>
      </section>`;
  }

  function draw(s) {
    S = s;
    const v = A.view;
    const recent = (s.recent || []).map((u) => `<tr><td><b>${esc(u.name || "—")}</b><small>${esc([ROLE[u.role] || "", u.faculty, u.course].filter(Boolean).join(" · "))}</small></td>
      <td>${esc(PROV[u.prov] || u.prov)}</td><td>${num(u.devs)}</td><td>${day(u.created_at)}</td><td>${when(u.seen)}</td></tr>`).join("");
    v.innerHTML = `<div class="hello"><h2>Statistika</h2><p class="muted">Faqat sizga ko‘rinadi · ${when(s.now)} yangilandi <button class="btn" id="adRe">Yangilash</button></p></div>
      <h3 class="group-label">Foydalanuvchilar</h3>
      <div class="ad-grid">
        ${tile(num(s.users), "ro‘yxatdan o‘tgan", `+${num(s.new7)} oxirgi 7 kunda`)}
        ${tile(num(s.act1), "bugun faol", "oxirgi 24 soat")}
        ${tile(num(s.act7), "7 kunda faol", `30 kunda: ${num(s.act30)}`)}
        ${tile(num(s.new1), "bugun yangi", `30 kunda: ${num(s.new30)}`)}
      </div>
      <section class="ad-card"><h3>Oxirgi 30 kun</h3>${chart(s.daily || [])}</section>
      ${liveBlock(s)}
      <h3 class="group-label">Qurilmalar</h3>
      <div class="ad-grid">
        ${tile(num(s.devices), "qurilma", "hisobga kirilgan")}
        ${tile(num(s.dev7), "7 kunda faol qurilma", "")}
        ${tile(num(s.installed), "bosh ekranga o‘rnatilgan", "ilova sifatida ochilgan")}
      </div>
      <div class="ad-cols">
        <section class="ad-card"><h3>Platforma</h3>${bars(s.platform)}</section>
        <section class="ad-card"><h3>Brauzer</h3>${bars(s.browser)}</section>
        <section class="ad-card"><h3>Kirish usuli</h3>${bars(s.prov, PROV)}</section>
        <section class="ad-card"><h3>Ilova versiyasi</h3>${bars(s.version)}</section>
      </div>
      <h3 class="group-label">Kimlar foydalanyapti</h3>
      <div class="ad-cols">
        <section class="ad-card"><h3>Fakultet</h3>${bars(s.faculty)}</section>
        <section class="ad-card"><h3>Kurs</h3>${bars(s.course)}</section>
        <section class="ad-card"><h3>Rol</h3>${bars(s.role, ROLE)}</section>
        <section class="ad-card"><h3>Ilova tili</h3>${bars(s.lang, LANGN)}<small class="muted">Hisobi bor foydalanuvchilar, oxirgi qurilmadagi til bo‘yicha</small></section>
        <section class="ad-card"><h3>Ilova tili · 30 kunda faol</h3>${bars(s.lang30, LANGN)}</section>
      </div>
      <h3 class="group-label">Konsilium</h3>
      <div class="ad-grid">
        ${tile(num(s.rooms), "xona ochilgan", `hozir ochiq: ${num(s.rooms_open)} · 30 kunda: ${num(s.rooms30)}`)}
        ${tile(num(s.msgs), "yozishma xabari", "")}
        ${tile(num(s.visits_month), "bu oy xonaga kirish", "")}
        ${tile(num(s.reports), "shikoyat", `7 kunda: ${num(s.reports7)}`)}
        ${tile(num(s.mod30), "avtomatik chiqarish", `30 kunda · taqiqlangan so‘zlar: ${num(s.terms)}`)}
      </div>
      <h3 class="group-label">Bepul tarif limitlari</h3>
      <section class="ad-card">
        ${limit("Supabase: oylik faol foydalanuvchi", s.act30, 50000, num, "Bepul tarifda oyiga 50 000 tagacha.")}
        ${limit("Supabase: baza hajmi", s.db_bytes, 500 * 1048576, mb, `Shundan sinxronlangan natijalar: ${mb(s.sync_bytes)}. Bepul tarifda 500 MB.`)}
        <div class="ad-links small">
          <p><b>Konsilium daqiqalari</b> (oyiga 5 000 ishtirokchi-daqiqa) aniq hisobi LiveKit panelida: <a href="https://cloud.livekit.io" target="_blank" rel="noopener">cloud.livekit.io</a> → Usage.</p>
          <p><b>Sayt (hosting) va katta fayllar</b> Cloudflare panelida: <a href="https://dash.cloudflare.com" target="_blank" rel="noopener">dash.cloudflare.com</a> → Workers & Pages → alvoramed (deploylar), R2 → alvoramed-files (katta PDF'lar). Trafik bepul va cheklanmagan.</p>
          <p><b>Barcha jadvallar va foydalanuvchilar</b> Supabase panelida: <a href="https://supabase.com/dashboard/project/tcyskjcdxgppdqnlkucc" target="_blank" rel="noopener">supabase.com/dashboard</a> → Table Editor, Authentication.</p>
        </div>
      </section>
      <h3 class="group-label">Oxirgi ro‘yxatdan o‘tganlar</h3>
      <section class="ad-card ad-tbl-wrap"><table class="ad-tbl"><thead><tr><th>Foydalanuvchi</th><th>Usul</th><th>Qurilma</th><th>Ro‘yxat</th><th>Oxirgi faollik</th></tr></thead><tbody>${recent || `<tr><td colspan="5" class="muted">Hali hech kim yo‘q</td></tr>`}</tbody></table></section>
      <p class="small muted" style="margin:14px 2px 0">Qurilma va kunlik faollik v1.0 dan boshlab yig‘iladi. Qurilma faqat noma’lum raqam bilan sanaladi, shaxsiy ma’lumot olinmaydi.</p>`;
    v.querySelector("#adRe").addEventListener("click", () => page(A));
    v.querySelectorAll("[data-win]").forEach((b) => b.addEventListener("click", () => { win = Number(b.dataset.win) || 7; const y = window.scrollY; draw(S); window.scrollTo(0, y); }));
  }

  function page(api) {
    A = api;
    const my = ++seq;
    A.setChrome("Statistika", true, "home");
    A.view.innerHTML = `<div class="hello"><h2>Statistika</h2><p class="muted">Yuklanmoqda…</p></div>`;
    load(my).catch((e) => {
      if (my !== seq) return;
      A.view.innerHTML = A.emptyState(A.ICX.warn, "Statistika ochilmadi", esc(e.message || "Xato") + ". Internetni tekshiring.", `<button class="btn primary" id="adRetry">Qayta urinish</button>`);
      A.$("#adRetry")?.addEventListener("click", () => page(A));
    });
  }
  window.ADMIN = { page, _t: { draw: (api, s) => { A = api; draw(s); } } };
})();
