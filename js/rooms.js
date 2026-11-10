/* ALVORA Med — Konsilium: ovozli suhbat, maruza, ekran ulashish va yozishma (LiveKit).
   Faqat internet bilan ishlaydi. Sahifalar: #/konsilium (ro'yxat), #/konsilium/<id>?code=XXXXXX (xona). */
(() => {
  "use strict";
  let A = null;
  const BASE = "#/konsilium";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    micOff: '<path d="M3 3l18 18M9 9v2a3 3 0 0 0 5 2.2M15 10V6a3 3 0 0 0-5.8-1M5 11a7 7 0 0 0 11.2 5.6M19 11a7 7 0 0 1-.6 2.8M12 18v3"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-12.2 3.1L3.3 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',
    leave: '<path d="M10 17l-5-5 5-5M5 12h11M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.9c2 .6 3.2 2.2 3.5 5.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'
  };
  const ROLE = { talaba: "Talaba", oqituvchi: "O‘qituvchi" };
  const canShare = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  /* ---------- Yordamchilar ---------- */
  const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
  async function ctx() {
    if (!window.ACC?.ctx) return {};
    return withTimeout(window.ACC.ctx(), 12000, "Hisob ma’lumoti yuklanmadi (kutish vaqti tugadi)");
  }
  async function call(body) {
    const c = await ctx();
    if (!c.sb || !c.user) throw new Error("Avval hisobga kiring");
    const { data: s } = await withTimeout(c.sb.auth.getSession(), 10000, "Hisob sessiyasi ochilmadi");
    let r;
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 15000);
    try {
      r = await fetch(c.url + "/functions/v1/livekit", {
        signal: ac.signal,
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: c.key, Authorization: "Bearer " + (s.session?.access_token || "") },
        body: JSON.stringify(body)
      });
    } catch { throw new Error("Server javob bermadi. Internetni tekshiring"); }
    finally { clearTimeout(tm); }
    let j = {}; try { j = await r.json(); } catch { /* */ }
    if (!r.ok || j.error) { const e = new Error(j.error || "Xatolik"); e.kicked = !!j.kicked; throw e; }
    return j;
  }
  let libP = null;
  const lib = () => libP || (libP = new Promise((res, rej) => {
    if (window.LivekitClient) return res(window.LivekitClient);
    const s = document.createElement("script");
    s.src = "vendor/livekit-client.umd.js";
    s.onload = () => res(window.LivekitClient);
    s.onerror = () => { libP = null; rej(new Error("lib")); };
    document.head.appendChild(s);
  }));
  const profCache = new Map();
  async function profiles(ids) {
    const need = [...new Set(ids)].filter((id) => id && !profCache.has(id));
    if (need.length) {
      try {
        const c = await ctx();
        const { data } = await c.sb.from("profiles").select("id,name,photo,avatar_url,faculty,course,role,role_note").in("id", need);
        for (const p of data || []) profCache.set(p.id, p);
      } catch { /* */ }
      for (const id of need) if (!profCache.has(id)) profCache.set(id, {});
    }
    return ids.map((id) => profCache.get(id) || {});
  }
  const roleText = (p) => (p.role === "boshqa" ? (p.role_note || "") : ROLE[p.role] || "");
  const avatar = (p, name, size = 64) => {
    const src = p.photo || p.avatar_url || "";
    return `<span class="rm-av" style="width:${size}px;height:${size}px">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : esc((name || "?").trim()[0] || "?").toUpperCase()}</span>`;
  };
  const head = (t) => `<div class="hello"><h2>Konsilium</h2><p class="muted">${t}</p></div>`;
  const needLogin = () => {
    A.view.innerHTML = head("Mavzu bo‘yicha jonli suhbat, maruza va ekran orqali tushuntirish.") +
      A.emptyState(I.users, "Avval hisobga kiring", "Konsiliumga faqat hisobga kirgan foydalanuvchilar qo‘shila oladi. Bu xavfsizlik uchun kerak.", `<a class="btn primary" href="#/profil">Kirish</a>`);
  };
  const needNet = (retry) => {
    A.view.innerHTML = head("Bu bo‘lim faqat internet bilan ishlaydi.") +
      A.emptyState(A.ICX.warn, "Internet yo‘q", "Internetga ulaning va qayta urinib ko‘ring. Kitoblar, testlar va simulyatorlar internetsiz ham ochiladi.", `<button class="btn primary" id="rmRetry">Qayta urinish</button>`);
    A.$("#rmRetry").addEventListener("click", retry);
  };
  const failBox = (msg, retry) => {
    A.view.innerHTML = head("Bu bo‘lim faqat internet bilan ishlaydi.") +
      A.emptyState(A.ICX.warn, "Ochilmadi", esc(msg), `<button class="btn primary" id="rmRetry">Qayta urinish</button>`);
    A.$("#rmRetry").addEventListener("click", retry);
  };

  /* ---------- Ro'yxat ---------- */
  let listTimer = null;
  async function pageList() {
    A.setChrome("Konsilium", false, "rooms");
    if (!navigator.onLine) return needNet(pageList);
    A.view.innerHTML = head("Yuklanmoqda…");
    let c;
    try { c = await ctx(); } catch (e) { return failBox(e.message, pageList); }
    if (!c.user) return needLogin();
    A.view.innerHTML = head("Suhbatda hamma gapiradi. Maruzada tinglovchilar qo‘l ko‘tarib so‘z oladi. Ekran orqali tushuntirish va yozishma ham bor.") + `
      <div class="tm-acts rm-top"><button class="btn primary" id="rmNew">${ico(I.plus, 18)} Xona ochish</button><button class="btn" id="rmCode">${ico(I.key, 18)} Kod bilan kirish</button><span id="rmAdm" style="display:contents"></span></div>
      <div id="rmList" class="rm-list"><p class="small muted">Yuklanmoqda…</p></div>`;
    A.$("#rmNew").addEventListener("click", createSheet);
    A.$("#rmCode").addEventListener("click", codeSheet);
    const draw = async () => {
      if (!(location.hash === BASE || location.hash.startsWith(BASE + "?"))) { clearInterval(listTimer); return; }
      let j;
      try { j = await call({ action: "list" }); }
      catch (e) { const el = A.$("#rmList"); if (el) el.innerHTML = `<p class="small muted">${esc(e.message)} <button class="btn" id="rmLR">Qayta urinish</button></p>`; A.$("#rmLR")?.addEventListener("click", draw); return; }
      const box = A.$("#rmAdm");
      if (j.admin && box && !box.innerHTML) {
        box.innerHTML = `<button class="btn" id="rmRep">${ico(I.flag, 18)} Shikoyatlar</button><button class="btn" id="rmTerms">${ico(I.ban, 18)} Taqiqlangan so‘zlar</button>`;
        A.$("#rmRep").addEventListener("click", reportsSheet);
        A.$("#rmTerms").addEventListener("click", termsSheet);
      }
      const rooms = j.rooms || [];
      const el = A.$("#rmList"); if (!el) return;
      el.innerHTML = rooms.length ? rooms.map((r) => `<a class="rm-card" href="${BASE}/${esc(r.id)}">
          <span class="rm-ico ${r.mode}">${ico(r.mode === "maruza" ? I.wave : I.users, 22)}</span>
          <span class="rm-txt"><b>${esc(r.title)}${r.kind === "closed" ? ` <span class="rm-lock" title="Yopiq xona">${ico(I.lock, 14)}</span>` : ""}</b>
            ${r.topic ? `<small>${esc(r.topic)}</small>` : ""}
            <small class="muted">${r.mode === "maruza" ? "Maruza" : "Suhbat"} · ${esc(r.owner_name || "—")}${r.code ? ` · kod: <b>${esc(r.code)}</b>` : ""}</small></span>
          <span class="rm-cnt${r.count ? " on" : ""}">${r.count}/${r.max}</span></a>`).join("")
        : A.emptyState(I.users, "Hozir faol xona yo‘q", "Birinchi bo‘lib xona oching: mavzuni yozing va do‘stlaringizni chaqiring.");
    };
    clearInterval(listTimer);
    await draw();
    listTimer = setInterval(draw, 20000);
  }

  function createSheet() {
    const sh = A.sheet(`<h3>Yangi xona</h3>
      <label class="field">Xona nomi<input id="nTitle" maxlength="60" placeholder="masalan, Biokimyo: glikoliz" autocomplete="off"></label>
      <label class="field">Mavzu (ixtiyoriy)<input id="nTopic" maxlength="140" placeholder="Nima haqida gaplashamiz?" autocomplete="off"></label>
      <div class="field">Turi<div class="seg flat" role="group" id="nMode"><button data-v="suhbat" aria-selected="true">Suhbat · 20 kishi</button><button data-v="maruza" aria-selected="false">Maruza · 100 kishi</button></div></div>
      <div class="field">Kim kira oladi<div class="seg flat" role="group" id="nKind"><button data-v="open" aria-selected="true">Hamma (ochiq)</button><button data-v="closed" aria-selected="false">Faqat kod bilan</button></div></div>
      <p class="small muted" style="margin:0">Xona egasi sifatida siz moderator tayinlaysiz, ovozni o‘chirasiz va qoidani buzganni chiqarasiz. Bo‘sh qolgan xona 30 daqiqadan keyin yopiladi.</p>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="nOk">Ochish</button></div>`);
    const q = (s) => sh.el.querySelector(s);
    const seg = (id) => { q(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => q(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b)))); };
    seg("#nMode"); seg("#nKind");
    const val = (id) => q(id + " [aria-selected=true]").dataset.v;
    setTimeout(() => q("#nTitle").focus(), 250);
    q("#nOk").addEventListener("click", async () => {
      const title = q("#nTitle").value.trim();
      if (title.length < 2) { A.toast("Xona nomini yozing"); return; }
      q("#nOk").disabled = true;
      try {
        const c = await ctx();
        const { data, error } = await c.sb.from("rooms").insert({ title, topic: q("#nTopic").value.trim() || null, mode: val("#nMode"), kind: val("#nKind") }).select("id").single();
        if (error) throw error;
        sh.close();
        location.hash = BASE + "/" + data.id;
      } catch (e) {
        q("#nOk").disabled = false;
        A.toast(/too_many_rooms/.test(e.message || "") ? "Bir vaqtda 2 tadan ortiq xona ochib bo‘lmaydi" : "Xona ochilmadi. Qayta urinib ko‘ring");
      }
    });
  }

  function codeSheet() {
    const sh = A.sheet(`<h3>Kod bilan kirish</h3>
      <label class="field">Xona kodi (6 belgi)<input id="cIn" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="masalan, 3F9A1C" style="text-transform:uppercase;letter-spacing:.2em"></label>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="cOk">Kirish</button></div>`);
    const inp = sh.el.querySelector("#cIn");
    setTimeout(() => inp.focus(), 250);
    const go = async () => {
      const code = inp.value.trim().toUpperCase();
      try { const j = await call({ action: "find", code }); sh.close(); location.hash = `${BASE}/${j.room.id}?code=${code}`; }
      catch (e) { A.toast(e.message); }
    };
    sh.el.querySelector("#cOk").addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  async function reportsSheet() {
    const c = await ctx();
    const [{ data: reps }, { data: evs }] = await Promise.all([
      c.sb.from("reports").select("id,reporter,target,reason,created_at").order("created_at", { ascending: false }).limit(40),
      c.sb.from("moderation_events").select("id,user_id,kind,detail,created_at").order("created_at", { ascending: false }).limit(40)
    ]);
    await profiles([...(reps || []).flatMap((r) => [r.reporter, r.target]), ...(evs || []).map((e) => e.user_id)].filter(Boolean));
    const nm = (id) => esc(profCache.get(id)?.name || "Noma’lum");
    const dt = (s) => new Date(s).toLocaleString("uz");
    A.sheet(`<h3>Shikoyatlar va avtomatik chiqarishlar</h3><div class="rm-reps">
      ${(evs || []).map((e) => `<div class="rm-rep auto"><small class="muted">${dt(e.created_at)} · avtomatik</small><br><b>${nm(e.user_id)}</b><p>${esc(e.detail || "")}</p></div>`).join("")}
      ${(reps || []).map((r) => `<div class="rm-rep"><small class="muted">${dt(r.created_at)} · shikoyat</small><br><b>${nm(r.reporter)}</b> → <b>${nm(r.target)}</b><p>${esc(r.reason)}</p></div>`).join("")}
      ${!(reps || []).length && !(evs || []).length ? `<p class="small muted">Hozircha hech narsa yo‘q.</p>` : ""}</div>
      <div class="acts"><button class="btn" data-x="close">Yopish</button></div>`);
  }

  async function termsSheet() {
    const c = await ctx();
    const sh = A.sheet(`<h3>Taqiqlangan so‘zlar</h3>
      <p class="small muted" style="margin:0 0 8px">Yozishmada shu so‘z (yoki shu bilan boshlanadigan so‘z) yozilsa, odam darhol xonadan chiqariladi va sizga Telegram orqali xabar keladi. Bank karta raqamlari ham avtomatik ushlanadi.</p>
      <div style="display:flex;gap:8px"><input id="tIn" maxlength="60" placeholder="Yangi so‘z" autocomplete="off" style="flex:1"><button class="btn primary" id="tAdd">Qo‘shish</button></div>
      <div class="chips rm-terms" id="tList"><span class="small muted">Yuklanmoqda…</span></div>
      <div class="acts"><button class="btn" data-x="close">Yopish</button></div>`);
    const list = sh.el.querySelector("#tList"), inp = sh.el.querySelector("#tIn");
    const load = async () => {
      const { data } = await c.sb.from("banned_terms").select("term").order("term");
      list.innerHTML = (data || []).map((t) => `<button class="chip" data-t="${esc(t.term)}" title="O‘chirish">${esc(t.term)} ✕</button>`).join("") || `<span class="small muted">Ro‘yxat bo‘sh</span>`;
    };
    list.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      await c.sb.from("banned_terms").delete().eq("term", b.dataset.t); load();
    });
    sh.el.querySelector("#tAdd").addEventListener("click", async () => {
      const t = inp.value.trim().toLowerCase(); if (t.length < 2) return;
      const { error } = await c.sb.from("banned_terms").insert({ term: t });
      if (error && !/duplicate/i.test(error.message)) { A.toast("Qo‘shib bo‘lmadi"); return; }
      inp.value = ""; load();
    });
    load();
  }

  /* ---------- Xona ---------- */
  let cur = null;
  function cleanup() {
    document.querySelectorAll("audio.rm-audio").forEach((a) => a.remove());
  }
  function leave(silent) {
    if (!cur) return;
    const lk = cur.lk; cur = null;
    try { lk.disconnect(); } catch { /* */ }
    cleanup();
    if (!silent) A.toast("Xonadan chiqdingiz");
  }
  window.addEventListener("hashchange", () => { if (cur && !location.hash.startsWith(BASE + "/" + cur.info.room.id)) leave(true); });
  window.addEventListener("pagehide", () => leave(true));

  async function pageRoom(id, query) {
    A.setChrome("Konsilium", true, "rooms");
    const retry = () => pageRoom(id, query);
    if (!navigator.onLine) return needNet(retry);
    A.view.innerHTML = head("Xonaga ulanmoqda…");
    let c;
    try { c = await ctx(); } catch (e) { return failBox(e.message, retry); }
    if (!c.user) return needLogin();
    if (cur && cur.info.room.id === id) return buildRoom();
    const code = new URLSearchParams(query || "").get("code") || "";
    let info;
    try { info = await call({ action: "token", room_id: id, code }); }
    catch (e) {
      A.view.innerHTML = A.emptyState(A.ICX.warn, "Xonaga kirib bo‘lmadi", esc(e.message), `<a class="btn" href="${BASE}">Xonalar ro‘yxati</a>`);
      return;
    }
    A.setChrome(info.room.title, true, "rooms");
    const r = info.room;
    A.view.innerHTML = `<div class="rm-pre">
        <span class="rm-ico big ${r.mode}">${ico(r.mode === "maruza" ? I.wave : I.users, 34)}</span>
        <h2>${esc(r.title)}</h2>${r.topic ? `<p class="muted">${esc(r.topic)}</p>` : ""}
        <p class="small muted">${r.mode === "maruza" ? "Maruza: so‘zlovchi gapiradi, tinglovchilar qo‘l ko‘tarib so‘z so‘raydi." : "Suhbat: hamma gapira oladi. Kirgach mikrofoningiz o‘chiq bo‘ladi."}</p>
        <ul class="rm-rules small">
          <li>Bir-biringizni hurmat qiling. Haqorat, reklama va shaxsiy ma’lumot (karta raqami va h.k.) mumkin emas.</li>
          <li>Taqiqlangan so‘z yozilsa, yozgan odam darhol xonadan chiqariladi.</li>
          <li>Ism, rasm, fakultet va kursingiz xonadagilarga ko‘rinadi.</li>
          <li>Qoidani buzganlar haqida “Shikoyat” orqali xabar bering.</li></ul>
        <button class="btn primary rm-join" id="rmJoin">${ico(I.mic, 20)} Xonaga kirish</button>
      </div>`;
    A.$("#rmJoin").addEventListener("click", async () => {
      const b = A.$("#rmJoin"); b.disabled = true; b.textContent = "Ulanmoqda…";
      try { await connect(info, c.user); }
      catch (e) {
        console.error(e);
        leave(true);
        b.disabled = false; b.innerHTML = `${ico(I.mic, 20)} Qayta urinish`;
        A.toast("Ulanib bo‘lmadi. Internetni tekshiring");
      }
    });
  }

  async function connect(info, user) {
    const L = await lib();
    const lk = new L.Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    cur = { L, lk, info, me: user, speakers: new Set(), mods: info.mods || [], admins: info.admins || [], msgs: [], seen: new Set(), tab: "people", unread: 0, screen: null };
    for (const m of info.history || []) { cur.msgs.push(m); cur.seen.add(m.id); }
    const live = () => cur && cur.lk === lk;
    lk.on(L.RoomEvent.TrackSubscribed, (track, pub, p) => {
      if (track.kind === "audio") { const el = track.attach(); el.classList.add("rm-audio"); el.hidden = true; document.body.appendChild(el); }
      if (track.kind === "video" && pub.source === L.Track.Source.ScreenShare && live()) { cur.screen = { track, who: p.identity }; renderStage(); }
    });
    lk.on(L.RoomEvent.TrackUnsubscribed, (track, pub) => {
      track.detach().forEach((e) => { if (e.classList.contains("rm-audio")) e.remove(); });
      if (live() && cur.screen && cur.screen.track === track) { cur.screen = null; renderStage(); }
    });
    lk.on(L.RoomEvent.LocalTrackPublished, (pub) => {
      if (live() && pub.source === L.Track.Source.ScreenShare && pub.track) { cur.screen = { track: pub.track, who: lk.localParticipant.identity, local: true }; renderStage(); }
      if (live()) renderBar();
    });
    lk.on(L.RoomEvent.LocalTrackUnpublished, (pub) => {
      if (live() && pub.source === L.Track.Source.ScreenShare && cur.screen?.local) { cur.screen = null; renderStage(); }
      if (live()) renderBar();
    });
    lk.on(L.RoomEvent.ActiveSpeakersChanged, (sp) => { if (!live()) return; cur.speakers = new Set(sp.map((p) => p.identity)); paintSpeaking(); });
    [L.RoomEvent.ParticipantConnected, L.RoomEvent.ParticipantDisconnected, L.RoomEvent.TrackMuted, L.RoomEvent.TrackUnmuted,
      L.RoomEvent.TrackPublished, L.RoomEvent.TrackUnpublished, L.RoomEvent.ParticipantAttributesChanged]
      .forEach((ev) => lk.on(ev, () => { if (live()) { renderPeople(); renderBar(); } }));
    lk.on(L.RoomEvent.ParticipantPermissionsChanged, (prev, p) => {
      if (!live()) return;
      if (p && p.isLocal) {
        const can = !!p.permissions?.canPublish;
        if (can && !info.me.speaker) A.toast("Sizga gapirishga ruxsat berildi");
        if (!can && info.me.speaker && !staff(p.identity)) A.toast("Gapirish ruxsati olindi");
        info.me.speaker = can;
      }
      renderPeople(); renderBar();
    });
    lk.on(L.RoomEvent.DataReceived, (payload, participant) => {
      if (participant || !live()) return;           // faqat server xabarlari
      let d; try { d = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (d.t === "chat" && !cur.seen.has(d.id)) {
        cur.seen.add(d.id); cur.msgs.push(d); if (cur.msgs.length > 300) cur.msgs.shift();
        if (cur.tab !== "chat" && !wide()) cur.unread++;
        renderChat(true); renderTabs();
      }
      if (d.t === "mods") {
        const was = cur.mods.includes(lk.localParticipant.identity);
        cur.mods = d.mods || [];
        const now = cur.mods.includes(lk.localParticipant.identity);
        if (now && !was) A.toast("Siz bu xonada moderator etib tayinlandingiz");
        if (!now && was) A.toast("Moderatorlik olindi");
        renderPeople(); renderBar();
      }
    });
    lk.on(L.RoomEvent.AudioPlaybackStatusChanged, () => { if (live()) renderBar(); });
    lk.on(L.RoomEvent.Disconnected, (reason) => {
      const R = L.DisconnectReason || {};
      const msg = reason === R.PARTICIPANT_REMOVED ? "Siz xonadan chiqarildingiz" : reason === R.ROOM_DELETED ? "Xona yopildi" : reason === R.CLIENT_INITIATED ? "" : "Aloqa uzildi";
      if (live()) {
        cur = null; cleanup();
        if (msg) A.toast(msg);
        if (location.hash.startsWith(BASE + "/")) location.hash = BASE;
      }
    });
    await lk.connect(info.url, info.token);
    try { await lk.startAudio(); } catch { /* */ }
    buildRoom();
  }

  const wide = () => matchMedia("(min-width: 900px)").matches;
  const staff = (id) => !!cur && (id === cur.info.room.owner || cur.mods.includes(id) || cur.admins.includes(id));
  const iAmOwner = () => cur.info.me.owner || cur.info.me.admin;
  const iAmStaff = () => staff(cur.lk.localParticipant.identity);
  const micOn = (p) => { const pub = p.getTrackPublication?.("microphone"); return !!(pub && pub.track && !pub.isMuted); };
  const sharing = (p) => { const pub = p.getTrackPublication?.("screen_share"); return !!(pub && !pub.isMuted && (pub.track || pub.isSubscribed !== false)); };
  const parts = () => [cur.lk.localParticipant, ...cur.lk.remoteParticipants.values()];
  const canTalk = (p) => cur.info.room.mode === "suhbat" || staff(p.identity) || !!p.permissions?.canPublish;

  function buildRoom() {
    if (!cur) return;
    const r = cur.info.room;
    A.setChrome(r.title, true, "rooms");
    A.view.innerHTML = `<div class="rm-head"><h2>${esc(r.title)}</h2><p class="small muted" id="rmSub"></p>
        ${r.topic ? `<p class="muted" style="margin:4px 0 0">${esc(r.topic)}</p>` : ""}</div>
      <div id="rmStage"></div>
      <div class="rm-tabs seg" role="tablist" id="rmTabs"></div>
      <div class="rm-body"><section id="rmPeople" class="rm-pane"></section><section id="rmChat" class="rm-pane rm-chatpane"></section></div>
      <div class="rm-bar" id="rmBar"></div>`;
    renderStage(); renderTabs(); renderPeople(); renderChat(false); renderBar();
  }

  function renderTabs() {
    const el = A.$("#rmTabs"); if (!el || !cur) return;
    el.innerHTML = `<button role="tab" data-tab="people" aria-selected="${cur.tab === "people"}">Ishtirokchilar · ${parts().length}</button>
      <button role="tab" data-tab="chat" aria-selected="${cur.tab === "chat"}">Yozishma${cur.unread ? ` <b class="rm-unread">${cur.unread}</b>` : ""}</button>`;
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      cur.tab = b.dataset.tab; if (cur.tab === "chat") cur.unread = 0;
      renderTabs();
      A.view.querySelector(".rm-body").dataset.tab = cur.tab;
      if (cur.tab === "chat") renderChat(true);
    }));
    A.view.querySelector(".rm-body").dataset.tab = cur.tab;
  }

  async function renderPeople() {
    const el = A.$("#rmPeople"); if (!el || !cur) return;
    const lk = cur.lk, info = cur.info;
    const list = parts();
    const pr = await profiles(list.map((p) => p.identity));
    if (!cur || cur.lk !== lk) return;
    const order = list.map((p, i) => ({ p, prof: pr[i], hand: p.attributes?.hand === "1" }))
      .sort((a, b) => ((b.p.identity === info.room.owner) - (a.p.identity === info.room.owner)) || (staff(b.p.identity) - staff(a.p.identity)) || (b.hand - a.hand) || (micOn(b.p) - micOn(a.p)));
    const speakers = order.filter((x) => canTalk(x.p));
    const listeners = order.filter((x) => !speakers.includes(x));
    const card = (x) => {
      const id = x.p.identity, nm = x.prof.name || x.p.name || "Foydalanuvchi";
      const sub = [roleText(x.prof), x.prof.faculty, x.prof.course].filter(Boolean).join(" · ");
      const badge = id === info.room.owner ? `<span class="rm-badge crown" title="Xona egasi">${ico(I.crown, 12)}</span>`
        : (cur.mods.includes(id) || cur.admins.includes(id)) ? `<span class="rm-badge shield" title="Moderator">${ico(I.shield, 12)}</span>` : "";
      return `<button class="rm-p${cur.speakers.has(id) ? " talk" : ""}" data-id="${esc(id)}" type="button">
        <span class="rm-pav">${avatar(x.prof, nm, 64)}${badge}${x.hand ? `<span class="rm-badge hand" title="Qo‘l ko‘tardi">✋</span>` : ""}${canTalk(x.p) && !micOn(x.p) ? `<span class="rm-badge mute">${ico(I.micOff, 12)}</span>` : ""}${sharing(x.p) ? `<span class="rm-badge scr" title="Ekran ulashmoqda">${ico(I.screen, 12)}</span>` : ""}</span>
        <span class="rm-pn">${esc(nm)}${x.p.isLocal ? " (siz)" : ""}</span>${sub ? `<span class="rm-ps">${esc(sub)}</span>` : ""}</button>`;
    };
    el.innerHTML = `${info.room.mode === "maruza" ? `<h3 class="group-label">So‘zlovchilar</h3>` : ""}<div class="rm-grid">${speakers.map(card).join("")}</div>
      ${info.room.mode === "maruza" && listeners.length ? `<h3 class="group-label">Tinglovchilar · ${listeners.length}</h3><div class="rm-grid small">${listeners.map(card).join("")}</div>` : ""}`;
    el.querySelectorAll(".rm-p").forEach((b) => b.addEventListener("click", () => personSheet(b.dataset.id)));
    const sub = A.$("#rmSub");
    if (sub) sub.innerHTML = `${info.room.mode === "maruza" ? "Maruza" : "Suhbat"} · ${list.length} kishi${info.room.code ? ` · kod: <b>${esc(info.room.code)}</b>` : ""}`;
    renderTabs();
  }

  async function renderChat(scroll) {
    const el = A.$("#rmChat"); if (!el || !cur) return;
    const lk = cur.lk, myId = lk.localParticipant.identity;
    await profiles(cur.msgs.map((m) => m.uid));
    if (!cur || cur.lk !== lk) return;
    let box = el.querySelector(".rm-msgs");
    if (!box) {
      el.innerHTML = `<div class="rm-msgs"></div>
        <form class="rm-send" id="rmSend"><input id="rmTxt" maxlength="500" placeholder="Xabar yozing…" autocomplete="off" enterkeyhint="send"><button class="btn primary" type="submit" aria-label="Yuborish">${ico(I.send, 18)}</button></form>`;
      box = el.querySelector(".rm-msgs");
      el.querySelector("#rmSend").addEventListener("submit", async (e) => {
        e.preventDefault();
        const inp = el.querySelector("#rmTxt"), text = inp.value.trim();
        if (!text || !cur) return;
        inp.disabled = true;
        try { await call({ action: "say", room_id: cur.info.room.id, text }); inp.value = ""; }
        catch (err) { A.toast(err.message); if (err.kicked) { leave(true); location.hash = BASE; } }
        inp.disabled = false; inp.focus();
      });
    }
    const t = (s) => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }); };
    box.innerHTML = cur.msgs.length ? cur.msgs.map((m) => {
      const p = profCache.get(m.uid) || {}, mine = m.uid === myId;
      const tag = m.uid === cur.info.room.owner ? " · egasi" : (cur.mods.includes(m.uid) || cur.admins.includes(m.uid)) ? " · moderator" : "";
      return `<div class="rm-msg${mine ? " me" : ""}">${mine ? "" : avatar(p, p.name, 28)}<div class="rm-bub"><small>${esc(mine ? "Siz" : p.name || "Foydalanuvchi")}${tag} · ${t(m.at)}</small><p>${esc(m.text)}</p></div></div>`;
    }).join("") : `<p class="small muted" style="text-align:center;margin:18px 0">Hali xabar yo‘q. Birinchi bo‘lib yozing.</p>`;
    if (scroll) box.scrollTop = box.scrollHeight;
    else requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function renderStage() {
    const el = A.$("#rmStage"); if (!el || !cur) return;
    const s = cur.screen;
    if (!s) { el.innerHTML = ""; return; }
    const prof = profCache.get(s.who) || {};
    el.innerHTML = `<div class="rm-stage"><div class="rm-stage-v"></div>
      <div class="rm-stage-bar"><span class="small">${ico(I.screen, 16)} ${esc(s.local ? "Siz ekran ulashyapsiz" : (prof.name || "Kimdir") + " ekranini ulashmoqda")}</span>
        <span class="rm-stage-acts">
          <button class="btn" id="sgFull" title="To‘liq ekran">${ico(I.full, 16)}</button>
          ${!s.local ? `<button class="btn" id="sgRep" title="Shikoyat (ekran surati bilan)">${ico(I.flag, 16)}</button>` : ""}
          ${!s.local && iAmStaff() && !staff(s.who) || (!s.local && iAmOwner()) ? `<button class="btn danger" id="sgStop">To‘xtatish</button>` : ""}
        </span></div></div>`;
    const v = s.track.attach(); v.muted = true; v.playsInline = true;
    el.querySelector(".rm-stage-v").appendChild(v);
    el.querySelector("#sgFull").addEventListener("click", () => { const box = el.querySelector(".rm-stage-v"); (box.requestFullscreen || box.webkitRequestFullscreen || (() => v.webkitEnterFullscreen?.())).call(box); });
    el.querySelector("#sgRep")?.addEventListener("click", () => reportSheet(s.who, prof.name || "Foydalanuvchi", v));
    el.querySelector("#sgStop")?.addEventListener("click", async () => {
      try { await call({ action: "mod", room_id: cur.info.room.id, op: "stopscreen", target: s.who }); A.toast("Ekran ulashish to‘xtatildi"); } catch (e) { A.toast(e.message); }
    });
  }

  function renderBar() {
    const el = A.$("#rmBar"); if (!el || !cur) return;
    const lk = cur.lk, info = cur.info, local = lk.localParticipant;
    const talk = !!local.permissions?.canPublish || info.me.speaker || iAmStaff();
    const handUp = local.attributes?.hand === "1";
    const shareOn = !!local.getTrackPublication?.("screen_share")?.track;
    el.innerHTML = `${lk.canPlaybackAudio === false ? `<button class="rm-btn on" id="rmAudio" type="button">${ico(I.wave, 24)}<span>Ovozni yoqish</span></button>` : ""}
      ${talk ? `<button class="rm-btn${micOn(local) ? " on" : ""}" id="rmMic" type="button">${ico(micOn(local) ? I.mic : I.micOff, 24)}<span>${micOn(local) ? "Mikrofon yoqiq" : "Mikrofon o‘chiq"}</span></button>`
        : `<button class="rm-btn${handUp ? " on" : ""}" id="rmHand" type="button">${ico(I.hand, 24)}<span>${handUp ? "Qo‘lni tushirish" : "Qo‘l ko‘tarish"}</span></button>`}
      ${iAmStaff() && canShare() ? `<button class="rm-btn${shareOn ? " on" : ""}" id="rmScr" type="button">${ico(I.screen, 24)}<span>${shareOn ? "Ulashishni to‘xtatish" : "Ekran ulashish"}</span></button>` : ""}
      ${info.room.code ? `<button class="rm-btn" id="rmShare" type="button">${ico(I.share, 24)}<span>Taklif</span></button>` : ""}
      ${iAmOwner() ? `<button class="rm-btn danger" id="rmEnd" type="button">${ico(I.ban, 24)}<span>Yopish</span></button>` : ""}
      <button class="rm-btn danger" id="rmLeave" type="button">${ico(I.leave, 24)}<span>Chiqish</span></button>`;
    const $ = (s) => el.querySelector(s);
    $("#rmAudio")?.addEventListener("click", async () => { try { await lk.startAudio(); } catch { /* */ } renderBar(); });
    $("#rmMic")?.addEventListener("click", async () => {
      try { await local.setMicrophoneEnabled(!micOn(local)); } catch { A.toast("Mikrofonga ruxsat bering (brauzer sozlamalari)"); }
      renderBar(); renderPeople();
    });
    $("#rmHand")?.addEventListener("click", async () => {
      try { await call({ action: "hand", room_id: info.room.id, up: !handUp }); if (!handUp) A.toast("Qo‘l ko‘tardingiz. So‘z berilishini kuting"); }
      catch (e) { A.toast(e.message); }
    });
    $("#rmScr")?.addEventListener("click", async () => {
      try { await local.setScreenShareEnabled(!shareOn, { audio: true }); }
      catch (e) { if (!/denied|NotAllowed|cancel/i.test(String(e?.name || e?.message))) A.toast("Ekranni ulashib bo‘lmadi"); }
      renderBar();
    });
    $("#rmShare")?.addEventListener("click", async () => {
      const txt = `ALVORA Med Konsilium: “${info.room.title}”. Kod: ${info.room.code}\n${location.origin}${location.pathname}${BASE}/${info.room.id}?code=${info.room.code}`;
      try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); A.toast("Taklif nusxalandi"); } } catch { /* */ }
    });
    $("#rmLeave").addEventListener("click", () => { leave(); location.hash = BASE; });
    $("#rmEnd")?.addEventListener("click", () => {
      const sh = A.sheet(`<h3>Xona yopilsinmi?</h3><p class="muted small" style="margin:0">Hamma xonadan chiqariladi va xona ro‘yxatdan o‘chadi.</p>
        <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn danger" id="eYes">Ha, yopish</button></div>`);
      sh.el.querySelector("#eYes").addEventListener("click", async () => {
        sh.close();
        try { await call({ action: "mod", room_id: info.room.id, op: "end" }); } catch (e) { A.toast(e.message); }
      });
    });
  }

  function paintSpeaking() {
    if (!cur) return;
    A.view.querySelectorAll(".rm-p").forEach((b) => b.classList.toggle("talk", cur.speakers.has(b.dataset.id)));
  }

  function personSheet(id) {
    if (!cur) return;
    const { lk, info } = cur;
    const p = id === lk.localParticipant.identity ? lk.localParticipant : lk.remoteParticipants.get(id);
    if (!p) return;
    const prof = profCache.get(id) || {};
    const nm = prof.name || p.name || "Foydalanuvchi";
    const sub = [roleText(prof), prof.faculty, prof.course].filter(Boolean);
    const isOwnerT = id === info.room.owner, isAdminT = cur.admins.includes(id), isModT = cur.mods.includes(id);
    const owner = iAmOwner();
    // moderator oddiy ishtirokchiga, egasi/ma'mur hammaga (ma'murdan tashqari) qo'llay oladi
    const can = !p.isLocal && !isAdminT && (owner ? (!isOwnerT || info.me.admin) : (iAmStaff() && !isOwnerT && !isModT));
    const lecture = info.room.mode === "maruza";
    const speaking = !!p.permissions?.canPublish;
    const sh = A.sheet(`<div class="rm-person">${avatar(prof, nm, 84)}<h3>${esc(nm)}</h3>${sub.length ? `<p class="small muted">${esc(sub.join(" · "))}</p>` : ""}
        <p class="small">${isOwnerT ? "Xona egasi" : isAdminT ? "Ilova ma’muri" : isModT ? "Moderator" : ""}</p></div>
      <div class="more-list">
        ${can && micOn(p) ? `<button class="rm-act" data-op="mute">${ico(I.micOff)} Ovozini o‘chirish</button>` : ""}
        ${can && sharing(p) ? `<button class="rm-act" data-op="stopscreen">${ico(I.screen)} Ekran ulashishni to‘xtatish</button>` : ""}
        ${can && lecture && !isModT && !isOwnerT ? (speaking ? `<button class="rm-act" data-op="deny">${ico(I.micOff)} So‘z berishni to‘xtatish</button>` : `<button class="rm-act" data-op="allow">${ico(I.mic)} So‘z berish${p.attributes?.hand === "1" ? " (qo‘l ko‘tardi)" : ""}</button>`) : ""}
        ${owner && can && !isOwnerT ? (isModT ? `<button class="rm-act" data-op="unmod">${ico(I.shield)} Moderatorlikdan olish</button>` : `<button class="rm-act" data-op="makemod">${ico(I.shield)} Shu xonaga moderator qilish</button>`) : ""}
        ${can ? `<button class="rm-act danger" data-op="kick">${ico(I.leave)} Xonadan chiqarish</button>` : ""}
        ${!p.isLocal ? `<button class="rm-act" data-op="report">${ico(I.flag)} Shikoyat qilish</button>` : ""}
      </div><div class="acts"><button class="btn" data-x="close">Yopish</button></div>`);
    sh.el.querySelectorAll("[data-op]").forEach((b) => b.addEventListener("click", async () => {
      const op = b.dataset.op;
      if (op === "report") { sh.close(); return reportSheet(id, nm); }
      if (op === "kick" && !confirm(`${nm} xonadan chiqarilsinmi? U bu xonaga qayta kira olmaydi.`)) return;
      b.disabled = true;
      try {
        const j = await call({ action: "mod", room_id: info.room.id, op, target: id });
        if (j.mods && cur) { cur.mods = j.mods; renderPeople(); }
        sh.close();
        A.toast({ mute: "Ovozi o‘chirildi", stopscreen: "Ekran ulashish to‘xtatildi", allow: "So‘z berildi", deny: "So‘z olindi", kick: "Xonadan chiqarildi", makemod: "Moderator tayinlandi", unmod: "Moderatorlik olindi" }[op]);
      } catch (e) { b.disabled = false; A.toast(e.message); }
    }));
  }

  function grab(video) {
    try {
      const w = video.videoWidth, h = video.videoHeight; if (!w || !h) return null;
      const k = Math.min(1, 1280 / w), c = document.createElement("canvas");
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.7);
    } catch { return null; }
  }

  function reportSheet(target, nm, video) {
    const shot = video ? grab(video) : null;
    const sh = A.sheet(`<h3>Shikoyat: ${esc(nm)}</h3>
      ${shot ? `<img class="rm-shot" src="${shot}" alt="Ekran surati">` : ""}
      <label class="field">Nima bo‘ldi?<textarea id="rpTxt" rows="3" maxlength="400" placeholder="Qisqacha yozing: haqorat, reklama, nomaqbul ekran…" style="font:inherit;padding:10px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink)"></textarea></label>
      ${shot ? `<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rpShot" checked style="width:auto"> Ekran suratini ham yuborish</label>` : ""}
      <p class="small muted" style="margin:0">Shikoyatni faqat ilova ma’muriyati ko‘radi va u darhol xabardor qilinadi.</p>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="rpOk">Yuborish</button></div>`);
    sh.el.querySelector("#rpOk").addEventListener("click", async (e) => {
      const reason = sh.el.querySelector("#rpTxt").value.trim();
      if (reason.length < 2) { A.toast("Sababini yozing"); return; }
      e.target.disabled = true;
      try {
        await call({ action: "report", room_id: cur?.info.room.id || null, target, reason, shot: shot && sh.el.querySelector("#rpShot")?.checked ? shot : undefined });
        sh.close(); A.toast("Shikoyat yuborildi. Rahmat");
      } catch (err) { e.target.disabled = false; A.toast(err.message); }
    });
  }

  async function page(api, p, query) {
    A = api;
    try {
      if (p[1]) return await pageRoom(p[1], query);
      return await pageList();
    } catch (e) {
      console.error(e);
      failBox("Xato: " + (e?.message || e), () => page(api, p, query));
    }
  }
  window.ROOMS = { page, active: () => !!cur };
})();
