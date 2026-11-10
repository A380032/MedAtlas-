// ALVORA Med — ovozli xonalar uchun server funksiya (Supabase Edge Function "livekit").
// Kalitlar Supabase secrets'da: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
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
const LK_HTTP = LK_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
const MAXP: Record<string, number> = { suhbat: 20, maruza: 100 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const enc = new TextEncoder();
const b64u = (b: Uint8Array | string) => {
  const bytes = typeof b === "string" ? enc.encode(b) : b;
  let s = ""; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!LK_URL || !LK_KEY || !LK_SECRET) return json({ error: "Ovoz xizmati sozlanmagan" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = String(body.action || "");

  // Sozlama to'g'riligini tekshirish (maxfiy ma'lumot qaytarmaydi)
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

  const { data: adm } = await admin.from("app_admins").select("user_id").eq("user_id", me.id).maybeSingle();
  const isAdmin = !!adm;

  async function getRoom(id: unknown) {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    const { data } = await admin.from("rooms").select("*").eq("id", id).maybeSingle();
    return data;
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
      // 30 daqiqadan beri bo'sh turgan xonalarni yopish
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
      const { data: prof } = await admin.from("profiles").select("name").eq("id", me.id).maybeSingle();
      const name = String(prof?.name || me.user_metadata?.full_name || me.user_metadata?.name || "Foydalanuvchi").slice(0, 60);
      const speaker = room.mode === "suhbat" || isOwner || isAdmin;
      const token = await jwt({
        sub: me.id,
        name,
        metadata: JSON.stringify({ owner: isOwner, admin: isAdmin }),
        video: {
          room: room.id, roomJoin: true, canSubscribe: true, canPublish: speaker,
          canPublishSources: ["microphone"], canPublishData: true, canUpdateOwnMetadata: true,
        },
      }, 6 * 3600);
      return json({
        token, url: LK_URL,
        room: { id: room.id, title: room.title, topic: room.topic, kind: room.kind, mode: room.mode, owner: room.owner, code: isOwner || isAdmin ? room.code : null },
        me: { owner: isOwner, admin: isAdmin, speaker },
      });
    }

    if (action === "mod") {
      const room = await getRoom(body.room_id);
      if (!room) return json({ error: "Xona topilmadi" }, 404);
      const isOwner = room.owner === me.id;
      if (!isOwner && !isAdmin) return json({ error: "Ruxsat yo'q" }, 403);
      const op = String(body.op || "");
      if (op === "end") {
        await admin.from("rooms").update({ ended_at: new Date().toISOString() }).eq("id", room.id);
        try { await lk("DeleteRoom", { room: room.id }, { roomCreate: true }); } catch { /* xona allaqachon yo'q */ }
        return json({ ok: true });
      }
      const target = String(body.target || "");
      if (!UUID.test(target)) return json({ error: "target" }, 400);
      if (target === me.id) return json({ error: "O'zingizga qo'llab bo'lmaydi" }, 400);
      const { data: tAdm } = await admin.from("app_admins").select("user_id").eq("user_id", target).maybeSingle();
      if (tAdm || (target === room.owner && !isAdmin)) return json({ error: "Bu foydalanuvchiga qo'llab bo'lmaydi" }, 403);
      const g = { roomAdmin: true, room: room.id };
      if (op === "kick") {
        await admin.from("room_bans").upsert({ room_id: room.id, user_id: target });
        try { await lk("RemoveParticipant", { room: room.id, identity: target }, g); } catch { /* allaqachon chiqqan */ }
        return json({ ok: true });
      }
      if (op === "mute") {
        const p = await lk("GetParticipant", { room: room.id, identity: target }, g);
        for (const t of p.tracks || []) {
          if (t.type === "AUDIO" || t.type === 0 || t.source === "MICROPHONE" || t.source === 2) {
            await lk("MutePublishedTrack", { room: room.id, identity: target, track_sid: t.sid, muted: true }, g);
          }
        }
        return json({ ok: true });
      }
      if (op === "allow" || op === "deny") {
        const allow = op === "allow";
        await lk("UpdateParticipant", {
          room: room.id, identity: target,
          permission: { can_subscribe: true, can_publish: allow, can_publish_data: true, can_update_metadata: true, can_publish_sources: ["MICROPHONE"] },
          attributes: { hand: "" },
        }, g);
        return json({ ok: true });
      }
      return json({ error: "op" }, 400);
    }

    return json({ error: "action" }, 400);
  } catch (e) {
    console.error(String(e));
    return json({ error: "Ovoz xizmatida xato. Birozdan keyin urinib ko'ring" }, 502);
  }
});
