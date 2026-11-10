// ALVORA Med — Konsilium (ovoz, ekran ulashish, yozishma) uchun server funksiya.
// Supabase Edge Function "livekit". Kalitlar Supabase secrets'da:
// LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, TELEGRAM_BOT_TOKEN.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const LK_URL = (Deno.env.get("LIVEKIT_URL") || "").trim();
const LK_KEY = (Deno.env.get("LIVEKIT_API_KEY") || "").trim();
const LK_SECRET = (Deno.env.get("LIVEKIT_API_SECRET") || "").trim();
const TG = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
const LK_HTTP = LK_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
const MAXP: Record<string, number> = { suhbat: 20, maruza: 100 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APP = "https://alvoramed.netlify.app";

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => { let s = ""; for (const x of bytes) s += String.fromCharCode(x); return btoa(s); };
const b64u = (b: Uint8Array | string) => b64(typeof b === "string" ? enc.encode(b) : b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function jwt(claims: Record<string, unknown>, ttl = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: LK_KEY, nbf: now - 10, exp: now + ttl, ...claims };
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const pay = b64u(JSON.stringify(body));
  const key = await crypto.subtle.importKey("raw", enc.encode(LK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(head + "." + pay)));
  return head + "." + pay + "." + b64u(sig);
}
async function lk(method: string, body: Record<string, unknown>, video: Record<string, unknown>) {
  const t = await jwt({ sub: "alvora-server", video }, 120);
  const r = await fetch(`${LK_HTTP}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`lk ${method} ${r.status} ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : {};
}
const roomG = (room: string) => ({ roomAdmin: true, room });
async function broadcast(room: string, obj: unknown, topic: string) {
  await lk("SendData", { room, data: b64(enc.encode(JSON.stringify(obj))), kind: "RELIABLE", topic }, roomG(room));
}
function perms(mode: string, speaker: boolean, screen: boolean) {
  const src = ["MICROPHONE"]; if (screen) src.push("SCREEN_SHARE", "SCREEN_SHARE_AUDIO");
  return { can_subscribe: true, can_publish: speaker || screen, can_publish_data: false, can_update_metadata: false, can_publish_sources: src };
}

/* ---------- Taqiqlangan so'zlar ---------- */
function norm(s: string) {
  return s.toLowerCase()
    .replace(/[‘’`ʻʼ']/g, "'")
    .replace(/[@]/g, "a").replace(/[0]/g, "o").replace(/[$]/g, "s")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ");
}
function luhn(d: string) {
  let s = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
  return s % 10 === 0;
}
function violation(text: string, terms: string[]): string | null {
  const n = norm(text);
  const words = n.split(/\s+/).filter(Boolean);
  const squashed = n.replace(/[\s']/g, "");
  for (const t of terms) {
    const tt = norm(t).trim(); if (!tt) continue;
    if (words.some((w) => w.startsWith(tt))) return "taqiqlangan so'z: " + t;
    if (tt.length >= 4 && squashed.includes(tt.replace(/[\s']/g, ""))) return "taqiqlangan so'z: " + t;
  }
  const digits = text.replace(/[\s-]/g, "");
  for (const m of digits.match(/\d{16,19}/g) || []) if (luhn(m)) return "bank karta raqami";
  return null;
}

async function telegram(chatIds: number[], text: string, photo?: string) {
  if (!TG) return;
  for (const id of chatIds) {
    try {
      if (photo && /^data:image\/(jpeg|png);base64,/.test(photo)) {
        const raw = Uint8Array.from(atob(photo.split(",")[1]), (c) => c.charCodeAt(0));
        const fd = new FormData();
        fd.append("chat_id", String(id));
        fd.append("caption", text.slice(0, 1000));
        fd.append("photo", new Blob([raw], { type: "image/jpeg" }), "ekran.jpg");
        await fetch(`https://api.telegram.org/bot${TG}/sendPhoto`, { method: "POST", body: fd });
      } else {
        await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: id, text: text.slice(0, 3900), disable_web_page_preview: true }),
        });
      }
    } catch (e) { console.error("tg", String(e)); }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!LK_URL || !LK_KEY || !LK_SECRET) return json({ error: "Ovoz xizmati sozlanmagan" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = String(body.action || "");

  if (action === "health") {
    try { await lk("ListRooms", { names: ["health-check"] }, { roomList: true }); return json({ ok: true }); }
    catch (e) { console.error(String(e)); return json({ ok: false }); }
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const jwtUser = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwtUser) return json({ error: "Avval hisobga kiring" }, 401);
  const { data: ud, error: ue } = await admin.auth.getUser(jwtUser);
  if (ue || !ud?.user) return json({ error: "Avval hisobga kiring" }, 401);
  const me = ud.user;

  const { data: admins } = await admin.from("app_admins").select("user_id,telegram_chat_id");
  const adminIds = new Set((admins || []).map((a) => a.user_id));
  const adminChats = (admins || []).map((a) => Number(a.telegram_chat_id)).filter(Boolean);
  const isAdmin = adminIds.has(me.id);

  async function getRoom(id: unknown) {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    const { data } = await admin.from("rooms").select("*").eq("id", id).maybeSingle();
    return data;
  }
  async function modsOf(roomId: string) {
    const { data } = await admin.from("room_mods").select("user_id").eq("room_id", roomId);
    return (data || []).map((x) => x.user_id as string);
  }
  async function nameOf(uid: string) {
    const { data } = await admin.from("profiles").select("name").eq("id", uid).maybeSingle();
    return String(data?.name || "Foydalanuvchi");
  }
  async function inRoom(roomId: string, uid: string) {
    try { await lk("GetParticipant", { room: roomId, identity: uid }, roomG(roomId)); return true; } catch { return false; }
  }
  async function punish(room: { id: string; title: string }, uid: string, why: string, sample: string) {
    await admin.from("room_bans").upsert({ room_id: room.id, user_id: uid });
    await admin.from("moderation_events").insert({ room_id: room.id, user_id: uid, kind: "auto", detail: (why + " | " + sample).slice(0, 600) });
    try { await lk("RemoveParticipant", { room: room.id, identity: uid }, roomG(room.id)); } catch { /* */ }
    const nm = await nameOf(uid);
    await telegram(adminChats, `🚫 Konsilium: avtomatik chiqarildi\nKim: ${nm}\nXona: ${room.title}\nSabab: ${why}\nMatn: «${sample.slice(0, 300)}»\n${APP}/#/konsilium`);
  }

  try {
    if (action === "list") {
      const { data: rows } = await admin.from("rooms").select("id,owner,title,topic,kind,mode,code,created_at")
        .is("ended_at", null).order("created_at", { ascending: false }).limit(100);
      const visible = (rows || []).filter((r) => r.kind === "open" || r.owner === me.id || isAdmin);
      const live: Record<string, number> = {};
      if (visible.length) {
        const lr = await lk("ListRooms", { names: visible.map((r) => r.id) }, { roomList: true });
        for (const x of lr.rooms || []) live[x.name] = Number(x.num_participants ?? x.numParticipants ?? 0);
      }
      const stale = visible.filter((r) => !live[r.id] && Date.now() - new Date(r.created_at).getTime() > 30 * 60 * 1000);
      if (stale.length) await admin.from("rooms").update({ ended_at: new Date().toISOString() }).in("id", stale.map((r) => r.id));
      const keep = visible.filter((r) => !stale.includes(r));
      const owners = [...new Set(keep.map((r) => r.owner))];
      const { data: profs } = owners.length ? await admin.from("profiles").select("id,name").in("id", owners) : { data: [] };
      const pn: Record<string, string> = {}; for (const p of profs || []) pn[p.id] = p.name || "";
      return json({
        admin: isAdmin,
        rooms: keep.map((r) => ({
          id: r.id, title: r.title, topic: r.topic, kind: r.kind, mode: r.mode, owner: r.owner,
          owner_name: pn[r.owner] || "", count: live[r.id] || 0, mine: r.owner === me.id,
          code: r.owner === me.id || isAdmin ? r.code : null, max: MAXP[r.mode],
        })),
      });
    }

    if (action === "find") {
      const code = String(body.code || "").trim().toUpperCase();
      if (!/^[0-9A-F]{6}$/.test(code)) return json({ error: "Kod 6 ta belgidan iborat" }, 400);
      const { data: r } = await admin.from("rooms").select("id,title,topic,kind,mode").eq("code", code).is("ended_at", null).maybeSingle();
      if (!r) return json({ error: "Bunday faol xona topilmadi" }, 404);
      return json({ room: r });
    }

    if (action === "token") {
      const room = await getRoom(body.room_id);
      if (!room || room.ended_at) return json({ error: "Xona topilmadi yoki yopilgan" }, 404);
      const isOwner = room.owner === me.id;
      if (room.kind === "closed" && !isOwner && !isAdmin) {
        if (String(body.code || "").trim().toUpperCase() !== room.code) return json({ error: "Xona kodi noto'g'ri" }, 403);
      }
      const { data: ban } = await admin.from("room_bans").select("user_id").eq("room_id", room.id).eq("user_id", me.id).maybeSingle();
      if (ban && !isAdmin) return json({ error: "Siz bu xonadan chiqarilgansiz" }, 403);
      const max = MAXP[room.mode] || 20;
      const cr = await lk("CreateRoom", { name: room.id, empty_timeout: 600, departure_timeout: 30, max_participants: max + 2 }, { roomCreate: true });
      const cnt = Number(cr.num_participants ?? cr.numParticipants ?? 0);
      if (cnt >= max && !isOwner && !isAdmin) return json({ error: "Xona to'lgan" }, 409);
      const mods = await modsOf(room.id);
      const isMod = mods.includes(me.id);
      const name = (await nameOf(me.id)).slice(0, 60);
      const staff = isOwner || isAdmin || isMod;
      const speaker = room.mode === "suhbat" || staff;
      const src = ["microphone"]; if (staff) src.push("screen_share", "screen_share_audio");
      const token = await jwt({
        sub: me.id, name,
        video: { room: room.id, roomJoin: true, canSubscribe: true, canPublish: speaker, canPublishSources: src, canPublishData: false, canUpdateOwnMetadata: false },
      }, 6 * 3600);
      const { data: hist } = await admin.from("room_messages").select("id,user_id,body,created_at").eq("room_id", room.id).order("id", { ascending: false }).limit(60);
      return json({
        token, url: LK_URL,
        room: { id: room.id, title: room.title, topic: room.topic, kind: room.kind, mode: room.mode, owner: room.owner, code: isOwner || isAdmin ? room.code : null },
        me: { owner: isOwner, admin: isAdmin, mod: isMod, speaker },
        mods, admins: [...adminIds],
        history: (hist || []).reverse().map((m) => ({ id: m.id, uid: m.user_id, text: m.body, at: m.created_at })),
      });
    }

    if (action === "say") {
      const room = await getRoom(body.room_id);
      if (!room || room.ended_at) return json({ error: "Xona yopilgan" }, 404);
      const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (!text) return json({ error: "Bo'sh xabar" }, 400);
      if (!(await inRoom(room.id, me.id))) return json({ error: "Avval xonaga kiring" }, 403);
      const since = new Date(Date.now() - 10000).toISOString();
      const { count } = await admin.from("room_messages").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("user_id", me.id).gte("created_at", since);
      if ((count || 0) >= 5) return json({ error: "Juda tez yozyapsiz. Biroz kuting" }, 429);
      const { data: terms } = await admin.from("banned_terms").select("term");
      const why = isAdmin ? null : violation(text, (terms || []).map((t) => t.term));
      if (why) { await punish(room, me.id, why, text); return json({ error: "Qoidani buzganingiz uchun xonadan chiqarildingiz", kicked: true }, 403); }
      const { data: row, error } = await admin.from("room_messages").insert({ room_id: room.id, user_id: me.id, body: text }).select("id,created_at").single();
      if (error) throw error;
      await broadcast(room.id, { t: "chat", id: row.id, uid: me.id, text, at: row.created_at }, "chat");
      return json({ ok: true, id: row.id });
    }

    if (action === "hand") {
      const room = await getRoom(body.room_id);
      if (!room) return json({ error: "Xona topilmadi" }, 404);
      await lk("UpdateParticipant", { room: room.id, identity: me.id, attributes: { hand: body.up ? "1" : "" } }, roomG(room.id));
      return json({ ok: true });
    }

    if (action === "report") {
      const room = await getRoom(body.room_id);
      const target = String(body.target || "");
      const reason = String(body.reason || "").trim().slice(0, 400);
      if (reason.length < 2) return json({ error: "Sababini yozing" }, 400);
      const shot = typeof body.shot === "string" && body.shot.length < 600000 ? body.shot : undefined;
      await admin.from("reports").insert({ room_id: room?.id || null, reporter: me.id, target: UUID.test(target) ? target : null, reason: reason + (shot ? " [ekran surati Telegramga yuborildi]" : "") });
      const who = await nameOf(me.id), tn = UUID.test(target) ? await nameOf(target) : "—";
      await telegram(adminChats, `⚠️ Konsilium: shikoyat\nKimdan: ${who}\nKimga: ${tn}\nXona: ${room?.title || "—"}\nSabab: ${reason}\n${APP}/#/konsilium`, shot);
      return json({ ok: true });
    }

    if (action === "mod") {
      const room = await getRoom(body.room_id);
      if (!room) return json({ error: "Xona topilmadi" }, 404);
      const isOwner = room.owner === me.id;
      const mods = await modsOf(room.id);
      const isMod = mods.includes(me.id);
      if (!isOwner && !isAdmin && !isMod) return json({ error: "Ruxsat yo'q" }, 403);
      const op = String(body.op || "");
      if (op === "end") {
        if (!isOwner && !isAdmin) return json({ error: "Faqat xona egasi yopa oladi" }, 403);
        await admin.from("rooms").update({ ended_at: new Date().toISOString() }).eq("id", room.id);
        try { await lk("DeleteRoom", { room: room.id }, { roomCreate: true }); } catch { /* */ }
        return json({ ok: true });
      }
      const target = String(body.target || "");
      if (!UUID.test(target)) return json({ error: "target" }, 400);
      if (target === me.id) return json({ error: "O'zingizga qo'llab bo'lmaydi" }, 400);
      const tOwner = target === room.owner, tAdmin = adminIds.has(target), tMod = mods.includes(target);
      if (tAdmin) return json({ error: "Bu foydalanuvchiga qo'llab bo'lmaydi" }, 403);
      if (tOwner && !isAdmin) return json({ error: "Xona egasiga qo'llab bo'lmaydi" }, 403);
      if (tMod && !isOwner && !isAdmin) return json({ error: "Moderatorga faqat xona egasi qo'llay oladi" }, 403);
      const g = roomG(room.id);

      if (op === "makemod" || op === "unmod") {
        if (!isOwner && !isAdmin) return json({ error: "Moderatorni faqat xona egasi tayinlaydi" }, 403);
        if (op === "makemod") {
          if (mods.length >= 5 && !tMod) return json({ error: "Bitta xonada 5 tagacha moderator bo'ladi" }, 400);
          await admin.from("room_mods").upsert({ room_id: room.id, user_id: target });
        } else await admin.from("room_mods").delete().eq("room_id", room.id).eq("user_id", target);
        const nowMods = await modsOf(room.id);
        try { await lk("UpdateParticipant", { room: room.id, identity: target, permission: perms(room.mode, room.mode === "suhbat" || op === "makemod", op === "makemod") }, g); } catch { /* xonada yo'q */ }
        await broadcast(room.id, { t: "mods", mods: nowMods }, "sys");
        return json({ ok: true, mods: nowMods });
      }
      if (op === "kick") {
        await admin.from("room_bans").upsert({ room_id: room.id, user_id: target });
        await admin.from("room_mods").delete().eq("room_id", room.id).eq("user_id", target);
        try { await lk("RemoveParticipant", { room: room.id, identity: target }, g); } catch { /* */ }
        return json({ ok: true });
      }
      if (op === "mute" || op === "stopscreen") {
        const p = await lk("GetParticipant", { room: room.id, identity: target }, g);
        for (const t of p.tracks || []) {
          const s = String(t.source);
          const hit = op === "mute" ? (s === "MICROPHONE" || t.source === 2) : (s === "SCREEN_SHARE" || s === "SCREEN_SHARE_AUDIO" || t.source === 3 || t.source === 4);
          if (hit) await lk("MutePublishedTrack", { room: room.id, identity: target, track_sid: t.sid, muted: true }, g);
        }
        return json({ ok: true });
      }
      if (op === "allow" || op === "deny") {
        const allow = op === "allow";
        await lk("UpdateParticipant", { room: room.id, identity: target, permission: perms(room.mode, allow, tMod), attributes: { hand: "" } }, g);
        return json({ ok: true });
      }
      return json({ error: "op" }, 400);
    }

    return json({ error: "action" }, 400);
  } catch (e) {
    console.error(String(e));
    return json({ error: "Xizmatda xato. Birozdan keyin urinib ko'ring" }, 502);
  }
});
