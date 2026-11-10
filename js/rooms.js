/* ALVORA Med — Ovozli xonalar (LiveKit). Faqat internet bilan ishlaydi.
   Sahifalar: #/xonalar (ro'yxat), #/xona/<id>?code=XXXXXX (xona). */
(() => {
  "use strict";
  let A = null;
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
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>'
  };
  const ROLE = { talaba: "Talaba", oqituvchi: "O‘qituvchi" };

  /* ---------- Yordamchilar ---------- */
  async function ctx() { return window.ACC?.ctx ? window.ACC.ctx() : {}; }
  async function call(body) {
    const c = await ctx();
    if (!c.sb || !c.user) throw new Error("Avval hisobga kiring");
    const { data: s } = await c.sb.auth.getSession();
    const r = await fetch(c.url + "/functions/v1/livekit", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.key, Authorization: "Bearer " + (s.session?.access_token || "") },
      body: JSON.stringify(body)
    });
    let j = {}; try { j = await r.json(); } catch { /* */ }
    if (!r.ok || j.error) throw new Error(j.error || "Xatolik");
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
    const need = ids.filter((id) => !profCache.has(id));
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
  const needLogin = () => {
    A.view.innerHTML = `<div class="hello"><h2>Ovozli xonalar</h2><p class="muted">Talabalar bilan mavzu bo‘yicha gaplashing yoki maruza tinglang.</p></div>
      ${A.emptyState(A.ICX.warn, "Avval hisobga kiring", "Xonalarga faqat hisobga kirgan foydalanuvchilar qo‘shila oladi. Bu xavfsizlik uchun kerak.", `<a class="btn primary" href="#/profil">Kirish</a>`)}`;
  };
  const needNet = () => {
    A.view.innerHTML = `<div class="hello"><h2>Ovozli xonalar</h2></div>${A.emptyState(A.ICX.warn, "Internet kerak", "Ovozli xonalar faqat internet bilan ishlaydi. Kitoblar, testlar va simulyatorlar internetsiz ham ochiladi.")}`;
  };

  /* ---------- Ro'yxat ---------- */
  let listTimer = null;
  async function pageList() {
    A.setChrome("Ovozli xonalar", false, "rooms");
    if (!navigator.onLine) return needNet();
    const c = await ctx();
    if (!c.user) return needLogin();
    A.view.innerHTML = `<div class="hello"><h2>Ovozli xonalar</h2><p class="muted">Suhbat xonasida hamma gapiradi. Maruzada esa tinglovchilar qo‘l ko‘tarib so‘z oladi.</p></div>
      <div class="tm-acts rm-top"><button class="btn primary" id="rmNew">${ico(I.plus, 18)} Xona ochish</button><button class="btn" id="rmCode">${ico(I.key, 18)} Kod bilan kirish</button><span id="rmAdm"></span></div>
      <div id="rmList" class="rm-list"><p class="small muted">Yuklanmoqda…</p></div>`;
    A.$("#rmNew").addEventListener("click", createSheet);
    A.$("#rmCode").addEventListener("click", codeSheet);
    const draw = async () => {
      if (!location.hash.startsWith("#/xonalar")) { clearInterval(listTimer); return; }
      let j;
      try { j = await call({ action: "list" }); } catch (e) { A.$("#rmList").innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
      if (j.admin && !A.$("#rmAdm").innerHTML) {
        A.$("#rmAdm").innerHTML = `<button class="btn" id="rmRep">${ico(I.flag, 18)} Shikoyatlar</button>`;
        A.$("#rmRep").addEventListener("click", reportsSheet);
      }
      const rooms = j.rooms || [];
      A.$("#rmList").innerHTML = rooms.length ? rooms.map((r) => `<a class="rm-card" href="#/xona/${esc(r.id)}">
          <span class="rm-ico ${r.mode}">${ico(r.mode === "maruza" ? I.wave : I.users, 22)}</span>
          <span class="rm-txt"><b>${esc(r.title)}${r.kind === "closed" ? ` <span class="rm-lock" title="Yopiq xona">${ico(I.lock, 14)}</span>` : ""}</b>
            ${r.topic ? `<small>${esc(r.topic)}</small>` : ""}
            <small class="muted">${r.mode === "maruza" ? "Maruza" : "Suhbat"} · ${esc(r.owner_name || "—")}${r.mine && r.code ? ` · kod: <b>${esc(r.code)}</b>` : ""}</small></span>
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
      <p class="small muted" style="margin:0">Xona egasi sifatida siz ovozni o‘chira olasiz va qoidani buzganni chiqarasiz. Bo‘sh qolgan xona 30 daqiqadan keyin yopiladi.</p>
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
        const { data, error } = await c.sb.from("rooms").insert({ title, topic: q("#nTopic").value.trim() || null, mode: val("#nMode"), kind: val("#nKind") }).select("id,code,kind").single();
        if (error) throw error;
        sh.close();
        location.hash = "#/xona/" + data.id;
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
      try { const j = await call({ action: "find", code }); sh.close(); location.hash = `#/xona/${j.room.id}?code=${code}`; }
      catch (e) { A.toast(e.message); }
    };
    sh.el.querySelector("#cOk").addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  async function reportsSheet() {
    const c = await ctx();
    const { data } = await c.sb.from("reports").select("id,room_id,reporter,target,reason,created_at").order("created_at", { ascending: false }).limit(50);
    const ids = [...new Set((data || []).flatMap((r) => [r.reporter, r.target]).filter(Boolean))];
    await profiles(ids);
    const nm = (id) => esc(profCache.get(id)?.name || "Noma’lum");
    A.sheet(`<h3>Shikoyatlar</h3><div class="rm-reps">${(data || []).length ? data.map((r) => `<div class="rm-rep"><small class="muted">${new Date(r.created_at).toLocaleString("uz")}</small><br><b>${nm(r.reporter)}</b> → <b>${nm(r.target)}</b><p>${esc(r.reason)}</p></div>`).join("") : `<p class="small muted">Hozircha shikoyat yo‘q.</p>`}</div>
      <div class="acts"><button class="btn" data-x="close">Yopish</button></div>`);
  }

  /* ---------- Xona ---------- */
  let cur = null;   // { room, lk, info, me, timer }
  function leave(silent) {
    if (!cur) return;
    try { cur.lk.disconnect(); } catch { /* */ }
    document.querySelectorAll("audio.rm-audio").forEach((a) => a.remove());
    cur = null;
    if (!silent) A.toast("Xonadan chiqdingiz");
  }
  window.addEventListener("hashchange", () => { if (cur && !location.hash.startsWith("#/xona/" + cur.info.room.id)) leave(true); });
  window.addEventListener("pagehide", () => leave(true));

  async function pageRoom(id, query) {
    A.setChrome("Xona", true, "rooms");
    if (!navigator.onLine) return needNet();
    const c = await ctx();
    if (!c.user) return needLogin();
    if (cur && cur.info.room.id === id) return drawRoom();
    const code = new URLSearchParams(query || "").get("code") || "";
    let info;
    try { info = await call({ action: "token", room_id: id, code }); }
    catch (e) {
      A.view.innerHTML = A.emptyState(A.ICX.warn, "Xonaga kirib bo‘lmadi", esc(e.message), `<a class="btn" href="#/xonalar">Xonalar ro‘yxati</a>`);
      return;
    }
    A.setChrome(info.room.title, true, "rooms");
    const r = info.room;
    A.view.innerHTML = `<div class="rm-pre">
        <span class="rm-ico big ${r.mode}">${ico(r.mode === "maruza" ? I.wave : I.users, 34)}</span>
        <h2>${esc(r.title)}</h2>${r.topic ? `<p class="muted">${esc(r.topic)}</p>` : ""}
        <p class="small muted">${r.mode === "maruza" ? "Maruza: so‘zlovchi gapiradi, tinglovchilar qo‘l ko‘tarib so‘z so‘raydi." : "Suhbat: hamma gapira oladi. Kirgach mikrofoningiz o‘chiq bo‘ladi."}</p>
        <ul class="rm-rules small"><li>Bir-biringizni hurmat qiling, haqorat va reklama mumkin emas.</li><li>Ism, rasm, fakultet va kursingiz xonadagilarga ko‘rinadi.</li><li>Qoidani buzganlar haqida “Shikoyat” tugmasi orqali xabar bering.</li></ul>
        <button class="btn primary rm-join" id="rmJoin">${ico(I.mic, 20)} Xonaga kirish</button>
      </div>`;
    A.$("#rmJoin").addEventListener("click", async () => {
      A.$("#rmJoin").disabled = true; A.$("#rmJoin").textContent = "Ulanmoqda…";
      try { await connect(info, c.user); }
      catch (e) {
        console.error(e);
        leave(true);
        A.$("#rmJoin").disabled = false; A.$("#rmJoin").innerHTML = `${ico(I.mic, 20)} Qayta urinish`;
        A.toast("Ulanib bo‘lmadi. Internetni tekshiring");
      }
    });
  }

  async function connect(info, user) {
    const L = await lib();
    const lk = new L.Room({ adaptiveStream: false, dynacast: false, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    cur = { lk, info, me: user, speakers: new Set() };
    const redraw = () => { if (cur && cur.lk === lk) drawRoom(); };
    lk.on(L.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== "audio") return;
      const el = track.attach(); el.classList.add("rm-audio"); el.hidden = true; document.body.appendChild(el);
    });
    lk.on(L.RoomEvent.TrackUnsubscribed, (track) => { track.detach().forEach((e) => e.remove()); });
    lk.on(L.RoomEvent.ActiveSpeakersChanged, (sp) => { if (!cur) return; cur.speakers = new Set(sp.map((p) => p.identity)); paintSpeaking(); });
    [L.RoomEvent.ParticipantConnected, L.RoomEvent.ParticipantDisconnected, L.RoomEvent.TrackMuted, L.RoomEvent.TrackUnmuted,
      L.RoomEvent.TrackPublished, L.RoomEvent.TrackUnpublished, L.RoomEvent.LocalTrackPublished, L.RoomEvent.LocalTrackUnpublished,
      L.RoomEvent.ParticipantAttributesChanged].forEach((ev) => lk.on(ev, redraw));
    lk.on(L.RoomEvent.ParticipantPermissionsChanged, (prev, p) => {
      if (p && p.isLocal) {
        const can = !!p.permissions?.canPublish;
        if (can && !info.me.speaker) A.toast("Sizga gapirishga ruxsat berildi");
        if (!can && info.me.speaker && !info.me.owner && !info.me.admin) A.toast("Gapirish ruxsati olindi");
        info.me.speaker = can;
      }
      redraw();
    });
    lk.on(L.RoomEvent.AudioPlaybackStatusChanged, redraw);
    lk.on(L.RoomEvent.Disconnected, (reason) => {
      const R = L.DisconnectReason || {};
      const msg = reason === R.PARTICIPANT_REMOVED ? "Siz xonadan chiqarildingiz" : reason === R.ROOM_DELETED ? "Xona yopildi" : reason === R.CLIENT_INITIATED ? "" : "Aloqa uzildi";
      if (cur && cur.lk === lk) {
        cur = null;
        document.querySelectorAll("audio.rm-audio").forEach((a) => a.remove());
        if (msg) A.toast(msg);
        if (location.hash.startsWith("#/xona/")) location.hash = "#/xonalar";
      }
    });
    await lk.connect(info.url, info.token);
    try { await lk.startAudio(); } catch { /* */ }
    drawRoom();
  }

  function parts() {
    const lk = cur.lk;
    return [lk.localParticipant, ...lk.remoteParticipants.values()];
  }
  const micOn = (p) => { const pub = p.getTrackPublication?.("microphone"); return !!(pub && pub.track && !pub.isMuted); };
  const metaOf = (p) => { try { return JSON.parse(p.metadata || "{}"); } catch { return {}; } };

  async function drawRoom() {
    if (!cur) return;
    const { lk, info } = cur;
    const list = parts();
    const pr = await profiles(list.map((p) => p.identity));
    if (!cur || cur.lk !== lk) return;
    const local = lk.localParticipant;
    const canSpeak = !!local.permissions?.canPublish || info.me.speaker;
    const mod = info.me.owner || info.me.admin;
    const order = list.map((p, i) => ({ p, prof: pr[i], m: metaOf(p), hand: p.attributes?.hand === "1" }))
      .sort((a, b) => (b.m.owner - a.m.owner) || (b.hand - a.hand) || (micOn(b.p) - micOn(a.p)));
    const speakers = order.filter((x) => info.room.mode === "suhbat" || x.m.owner || x.m.admin || x.p.permissions?.canPublish);
    const listeners = order.filter((x) => !speakers.includes(x));
    const card = (x) => {
      const nm = x.prof.name || x.p.name || "Foydalanuvchi";
      const sub = [roleText(x.prof), x.prof.faculty, x.prof.course].filter(Boolean).join(" · ");
      return `<button class="rm-p${cur.speakers.has(x.p.identity) ? " talk" : ""}" data-id="${esc(x.p.identity)}" type="button">
        <span class="rm-pav">${avatar(x.prof, nm, 64)}${x.m.owner ? `<span class="rm-badge crown" title="Xona egasi">${ico(I.crown, 12)}</span>` : ""}${x.hand ? `<span class="rm-badge hand" title="Qo‘l ko‘tardi">✋</span>` : ""}${!micOn(x.p) && (info.room.mode === "suhbat" || x.p.permissions?.canPublish || x.m.owner) ? `<span class="rm-badge mute">${ico(I.micOff, 12)}</span>` : ""}</span>
        <span class="rm-pn">${esc(nm)}${x.p.isLocal ? " (siz)" : ""}</span>${sub ? `<span class="rm-ps">${esc(sub)}</span>` : ""}</button>`;
    };
    const handUp = local.attributes?.hand === "1";
    A.view.innerHTML = `<div class="rm-head"><h2>${esc(info.room.title)}</h2>
        <p class="small muted">${info.room.mode === "maruza" ? "Maruza" : "Suhbat"} · ${list.length} kishi${info.room.code ? ` · kod: <b>${esc(info.room.code)}</b>` : ""}</p>
        ${info.room.topic ? `<p class="muted" style="margin:4px 0 0">${esc(info.room.topic)}</p>` : ""}</div>
      ${lk.canPlaybackAudio === false ? `<button class="btn primary" id="rmAudio" style="width:100%;margin-bottom:12px">Ovozni yoqish uchun bosing</button>` : ""}
      ${info.room.mode === "maruza" ? `<h3 class="group-label">So‘zlovchilar</h3>` : ""}
      <div class="rm-grid">${speakers.map(card).join("")}</div>
      ${info.room.mode === "maruza" && listeners.length ? `<h3 class="group-label">Tinglovchilar · ${listeners.length}</h3><div class="rm-grid small">${listeners.map(card).join("")}</div>` : ""}
      <div class="rm-bar">
        ${canSpeak ? `<button class="rm-btn${micOn(local) ? " on" : ""}" id="rmMic" type="button">${ico(micOn(local) ? I.mic : I.micOff, 24)}<span>${micOn(local) ? "Mikrofon yoqiq" : "Mikrofon o‘chiq"}</span></button>`
          : `<button class="rm-btn${handUp ? " on" : ""}" id="rmHand" type="button">${ico(I.hand, 24)}<span>${handUp ? "Qo‘lni tushirish" : "Qo‘l ko‘tarish"}</span></button>`}
        ${info.room.code ? `<button class="rm-btn" id="rmShare" type="button">${ico(I.share, 24)}<span>Taklif</span></button>` : ""}
        ${mod ? `<button class="rm-btn danger" id="rmEnd" type="button">${ico(I.leave, 24)}<span>Yopish</span></button>` : ""}
        <button class="rm-btn danger" id="rmLeave" type="button">${ico(I.leave, 24)}<span>Chiqish</span></button>
      </div>`;
    A.$("#rmAudio")?.addEventListener("click", async () => { try { await lk.startAudio(); } catch { /* */ } drawRoom(); });
    A.$("#rmMic")?.addEventListener("click", async () => {
      try { await lk.localParticipant.setMicrophoneEnabled(!micOn(lk.localParticipant)); }
      catch { A.toast("Mikrofonga ruxsat bering (brauzer sozlamalari)"); }
      drawRoom();
    });
    A.$("#rmHand")?.addEventListener("click", async () => {
      try { await lk.localParticipant.setAttributes({ hand: handUp ? "" : "1" }); if (!handUp) A.toast("Qo‘l ko‘tardingiz. Xona egasi ruxsat berishini kuting"); }
      catch { A.toast("Bo‘lmadi, qayta urinib ko‘ring"); }
      drawRoom();
    });
    A.$("#rmShare")?.addEventListener("click", async () => {
      const txt = `ALVORA Med ovozli xonasi: “${info.room.title}”. Kod: ${info.room.code}\n${location.origin}${location.pathname}#/xona/${info.room.id}?code=${info.room.code}`;
      try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); A.toast("Taklif nusxalandi"); } } catch { /* */ }
    });
    A.$("#rmLeave").addEventListener("click", () => { leave(); location.hash = "#/xonalar"; });
    A.$("#rmEnd")?.addEventListener("click", () => {
      const sh = A.sheet(`<h3>Xona yopilsinmi?</h3><p class="muted small" style="margin:0">Hamma xonadan chiqariladi va xona ro‘yxatdan o‘chadi.</p>
        <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn danger" id="eYes">Ha, yopish</button></div>`);
      sh.el.querySelector("#eYes").addEventListener("click", async () => {
        sh.close();
        try { await call({ action: "mod", room_id: info.room.id, op: "end" }); } catch (e) { A.toast(e.message); }
      });
    });
    A.view.querySelectorAll(".rm-p").forEach((b) => b.addEventListener("click", () => personSheet(b.dataset.id)));
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
    const prof = profCache.get(id) || {}, m = metaOf(p);
    const nm = prof.name || p.name || "Foydalanuvchi";
    const sub = [roleText(prof), prof.faculty, prof.course].filter(Boolean);
    const mod = (info.me.owner || info.me.admin) && !p.isLocal && !m.admin && (!m.owner || info.me.admin);
    const lecture = info.room.mode === "maruza";
    const speaking = !!p.permissions?.canPublish;
    const sh = A.sheet(`<div class="rm-person">${avatar(prof, nm, 84)}<h3>${esc(nm)}</h3>${sub.length ? `<p class="small muted">${esc(sub.join(" · "))}</p>` : ""}${m.owner ? `<p class="small">Xona egasi</p>` : ""}</div>
      <div class="more-list">
        ${mod && micOn(p) ? `<button class="rm-act" data-op="mute">${ico(I.micOff)} Ovozini o‘chirish</button>` : ""}
        ${mod && lecture && !m.owner ? (speaking ? `<button class="rm-act" data-op="deny">${ico(I.micOff)} So‘z berishni to‘xtatish</button>` : `<button class="rm-act" data-op="allow">${ico(I.mic)} So‘z berish${p.attributes?.hand === "1" ? " (qo‘l ko‘tardi)" : ""}</button>`) : ""}
        ${mod ? `<button class="rm-act danger" data-op="kick">${ico(I.leave)} Xonadan chiqarish</button>` : ""}
        ${!p.isLocal ? `<button class="rm-act" data-op="report">${ico(I.flag)} Shikoyat qilish</button>` : ""}
      </div><div class="acts"><button class="btn" data-x="close">Yopish</button></div>`);
    sh.el.querySelectorAll("[data-op]").forEach((b) => b.addEventListener("click", async () => {
      const op = b.dataset.op;
      if (op === "report") { sh.close(); return reportSheet(id, nm); }
      if (op === "kick" && !confirm(`${nm} xonadan chiqarilsinmi? U bu xonaga qayta kira olmaydi.`)) return;
      b.disabled = true;
      try { await call({ action: "mod", room_id: info.room.id, op, target: id }); sh.close(); A.toast({ mute: "Ovozi o‘chirildi", allow: "So‘z berildi", deny: "So‘z olindi", kick: "Xonadan chiqarildi" }[op]); }
      catch (e) { b.disabled = false; A.toast(e.message); }
    }));
  }

  function reportSheet(target, nm) {
    const sh = A.sheet(`<h3>Shikoyat: ${esc(nm)}</h3>
      <label class="field">Nima bo‘ldi?<textarea id="rpTxt" rows="4" maxlength="400" placeholder="Qisqacha yozing: haqorat, reklama, xalaqit berish…" style="font:inherit;padding:10px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink)"></textarea></label>
      <p class="small muted" style="margin:0">Shikoyatni faqat ilova ma’muriyati ko‘radi.</p>
      <div class="acts"><button class="btn" data-x="close">Bekor qilish</button><button class="btn primary" id="rpOk">Yuborish</button></div>`);
    sh.el.querySelector("#rpOk").addEventListener("click", async () => {
      const reason = sh.el.querySelector("#rpTxt").value.trim();
      if (reason.length < 2) { A.toast("Sababini yozing"); return; }
      try {
        const c = await ctx();
        const { error } = await c.sb.from("reports").insert({ room_id: cur?.info.room.id || null, target, reason });
        if (error) throw error;
        sh.close(); A.toast("Shikoyat yuborildi. Rahmat");
      } catch { A.toast("Yuborib bo‘lmadi"); }
    });
  }

  async function page(api, p, query) {
    A = api;
    if (p[0] === "xona" && p[1]) return pageRoom(p[1], query);
    return pageList();
  }
  window.ROOMS = { page, active: () => !!cur };
})();
