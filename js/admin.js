/* ALVORA Med — Statistika (faqat admin uchun): foydalanuvchilar, qurilmalar, Konsilium va limitlar.
   Ma'lumot Supabase'dagi admin_stats() funksiyasidan keladi; u adminlikni serverning o'zida tekshiradi. */
(() => {
  "use strict";
  let A = null, seq = 0;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/,/g, " ");
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
    const { data, error } = await c.sb.rpc("admin_stats");
    if (error) throw new Error(/forbidden/.test(error.message) ? "Bu sahifa faqat admin uchun" : "Statistika yuklanmadi");
    if (my !== seq) return;
    draw(data);
  }

  function draw(s) {
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
          <p><b>Sayt va yuklash kreditlari</b> Netlify panelida: <a href="https://app.netlify.com" target="_blank" rel="noopener">app.netlify.com</a> → Usage & billing.</p>
          <p><b>Barcha jadvallar va foydalanuvchilar</b> Supabase panelida: <a href="https://supabase.com/dashboard/project/tcyskjcdxgppdqnlkucc" target="_blank" rel="noopener">supabase.com/dashboard</a> → Table Editor, Authentication.</p>
        </div>
      </section>
      <h3 class="group-label">Oxirgi ro‘yxatdan o‘tganlar</h3>
      <section class="ad-card ad-tbl-wrap"><table class="ad-tbl"><thead><tr><th>Foydalanuvchi</th><th>Usul</th><th>Qurilma</th><th>Ro‘yxat</th><th>Oxirgi faollik</th></tr></thead><tbody>${recent || `<tr><td colspan="5" class="muted">Hali hech kim yo‘q</td></tr>`}</tbody></table></section>
      <p class="small muted" style="margin:14px 2px 0">Qurilma va kunlik faollik v1.0 dan boshlab yig‘iladi. Qurilma faqat noma’lum raqam bilan sanaladi, shaxsiy ma’lumot olinmaydi.</p>`;
    v.querySelector("#adRe").addEventListener("click", () => page(A));
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
