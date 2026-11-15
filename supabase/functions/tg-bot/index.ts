// ALVORA Med — @alvoramed_bot: telefon raqamni Telegram orqali tasdiqlash (Supabase Edge Function "tg-bot").
// Ilova:   {action:"start"}            -> bir martalik kod (t.me/alvoramed_bot?start=<kod>)
//          {action:"status", code}     -> kod holati (new / started / done / failed)
//          {action:"mine"}             -> ulangan raqam (yashirilgan ko'rinishda) va tasdiqlanganmi
//          {action:"setup"}            -> botga webhook o'rnatadi (o'zining manziliga, o'zgarmas maxfiy kalit bilan)
// Telegram: webhook (X-Telegram-Bot-Api-Secret-Token sarlavhasi bilan) — /start <kod> va "Raqamni ulashish" kontakti.
// Kalit: TELEGRAM_BOT_TOKEN (Supabase secrets). Jadvallar: phone_verify, login_phones.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TG = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SELF = SB_URL + "/functions/v1/tg-bot";
const APP = "https://alvoramed.com";
const CODE_TTL = 10 * 60 * 1000;      // kod 10 daqiqa amal qiladi
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const secret = async () => hex(await crypto.subtle.digest("SHA-256", enc.encode("alvoramed-webhook:" + TG))).slice(0, 48);
const newCode = () => { const b = new Uint8Array(12); crypto.getRandomValues(b); return [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20); };
const normPhone = (s: unknown): string | null => {
  let d = String(s ?? "").replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;
  return /^[0-9]{9,15}$/.test(d) ? d : null;
};
// +998 90 *** 45 67 (o'zbek raqamlari), boshqalar: +<boshi> *** 45 67
const mask = (p: string) => (/^998\d{9}$/.test(p) ? `+998 ${p.slice(3, 5)} *** ${p.slice(-4, -2)} ${p.slice(-2)}` : "+" + p.slice(0, Math.max(0, p.length - 7)) + " *** " + p.slice(-4, -2) + " " + p.slice(-2));

const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

/* ---------- Bot matnlari (uz / en) ---------- */
const T = {
  uz: {
    share: "📱 Raqamni ulashish",
    ask: "Assalomu alaykum! ALVORA Med hisobingizga telefon raqamingizni ulash uchun pastdagi “📱 Raqamni ulashish” tugmasini bosing.\n\nRaqamni Telegram o‘zi yuboradi — qo‘lda yozish shart emas.",
    done: (p: string) => `✅ Raqam ulandi: ${p}\n\nEndi ilovaga qayting va parol o‘rnating. Keyin shu raqam va parol bilan Telegramsiz ham kira olasiz.`,
    notOwn: "Faqat o‘zingizning raqamingizni ulash mumkin. Pastdagi “📱 Raqamni ulashish” tugmasini bosing.",
    expired: "Bu havola eskirgan yoki ishlatilgan. Ilovada “Telegram orqali tasdiqlash” tugmasini qayta bosing.",
    wrongTg: "Bu havola boshqa Telegram hisobi uchun yaratilgan. Ilovaga qaysi Telegram orqali kirgan bo‘lsangiz, o‘sha hisobdan oching.",
    hello: `Assalomu alaykum! Bu ALVORA Med ilovasining boti.\n\nTelefon raqamni ulash uchun ilovada: Sozlamalar → Hisob sozlamalari → “Telefon raqam va parol” → “Telegram orqali tasdiqlash”.\n\nIlova: ${APP}`,
    noPending: "Avval ilovada “Telegram orqali tasdiqlash” tugmasini bosing, so‘ng shu yerga qayting.",
    fail: "Raqamni saqlab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.",
  },
  en: {
    share: "📱 Share my number",
    ask: "Hello! To link your phone number to your ALVORA Med account, tap the “📱 Share my number” button below.\n\nTelegram sends the number itself — you don't need to type it.",
    done: (p: string) => `✅ Number linked: ${p}\n\nNow go back to the app and set a password. You will then be able to sign in with this number and password without Telegram.`,
    notOwn: "You can only link your own number. Tap the “📱 Share my number” button below.",
    expired: "This link has expired or has already been used. Tap “Verify via Telegram” in the app again.",
    wrongTg: "This link was created for a different Telegram account. Open it from the Telegram account you use to sign in to the app.",
    hello: `Hello! This is the ALVORA Med app bot.\n\nTo link your phone number, in the app go to: Settings → Account settings → “Phone number and password” → “Verify via Telegram”.\n\nApp: ${APP}`,
    noPending: "First tap “Verify via Telegram” in the app, then come back here.",
    fail: "Could not save the number. Please try again shortly.",
  },
};
const L = (l?: string | null) => (l === "en" ? T.en : T.uz);

/* ---------- Telegram webhook ---------- */
async function onUpdate(u: any) {
  const m = u?.message;
  if (!m || !m.from || m.chat?.type !== "private") return;
  const from = String(m.from.id), chat = m.chat.id;
  const guess = String(m.from.language_code || "").startsWith("uz") || String(m.from.language_code || "").startsWith("ru") ? "uz" : "en";
  const send = (text: string, extra: Record<string, unknown> = {}) => tg("sendMessage", { chat_id: chat, text, ...extra });

  // 1) /start <kod>
  const st = typeof m.text === "string" ? m.text.match(/^\/start(?:\s+([a-z0-9]{16,40}))?\s*$/) : null;
  if (st) {
    if (!st[1]) { await send(L(guess).hello); return; }
    const { data: rec } = await admin.from("phone_verify").select("*").eq("code", st[1]).maybeSingle();
    if (!rec || rec.status === "done" || Date.now() - new Date(rec.created_at).getTime() > CODE_TTL) { await send(L(rec?.lang || guess).expired, { reply_markup: { remove_keyboard: true } }); return; }
    const t = L(rec.lang);
    if (rec.tg_id !== from) {
      await admin.from("phone_verify").update({ status: "failed", note: "wrong telegram", updated_at: new Date().toISOString() }).eq("code", rec.code);
      await send(t.wrongTg, { reply_markup: { remove_keyboard: true } }); return;
    }
    await admin.from("phone_verify").update({ status: "started", updated_at: new Date().toISOString() }).eq("code", rec.code);
    await send(t.ask, { reply_markup: { keyboard: [[{ text: t.share, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
    return;
  }

  // 2) Kontakt (raqam)
  if (m.contact) {
    const { data: rec } = await admin.from("phone_verify").select("*").eq("tg_id", from).eq("status", "started")
      .gte("created_at", new Date(Date.now() - CODE_TTL).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rec) { await send(L(guess).noPending, { reply_markup: { remove_keyboard: true } }); return; }
    const t = L(rec.lang);
    // faqat o'z raqami: kontakt egasi yuborgan odamning o'zi bo'lishi shart (boshqaning kontakti yoki qo'lda yozilgani emas)
    if (!m.contact.user_id || String(m.contact.user_id) !== from) { await send(t.notOwn); return; }
    const phone = normPhone(m.contact.phone_number);
    if (!phone) { await send(t.fail); return; }
    // tasdiqlangan egasi ustun: bu raqam boshqa hisobga (tasdiqlanmagan holda) ulangan bo'lsa, undan olinadi
    await admin.from("login_phones").delete().eq("phone", phone);
    await admin.from("login_phones").delete().eq("user_id", rec.user_id);
    const { error } = await admin.from("login_phones").insert({ phone, user_id: rec.user_id, verified: true });
    if (error) { console.error("save", error.message); await send(t.fail); return; }
    await admin.from("phone_verify").update({ status: "done", phone, updated_at: new Date().toISOString() }).eq("code", rec.code);
    await send(t.done(mask(phone)), { reply_markup: { remove_keyboard: true } });
    return;
  }

  // 3) Boshqa xabarlar
  await send(L(guess).hello);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!TG) return json({ error: "Telegram bot sozlanmagan" }, 500);

  // Telegram'dan kelgan so'rov
  const hdr = req.headers.get("x-telegram-bot-api-secret-token");
  if (hdr !== null) {
    if (hdr !== (await secret())) return new Response("forbidden", { status: 403 });
    try { await onUpdate(await req.json()); } catch (e) { console.error("update", String(e)); }
    return new Response("ok");   // Telegram qayta yubormasligi uchun doim 200
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = String(body.action || "");

  if (action === "setup") {
    // xavfsiz: manzil va kalit o'zgarmas, shuning uchun takror chaqirilsa ham zarari yo'q
    const r = await tg("setWebhook", { url: SELF, secret_token: await secret(), allowed_updates: ["message"], drop_pending_updates: true });
    const info = await tg("getWebhookInfo", {});
    return json({ ok: !!r.ok, url: info?.result?.url === SELF, pending: info?.result?.pending_update_count ?? null, last_error: info?.result?.last_error_message || null });
  }

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: ud, error: ue } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: true };
  if (ue || !ud?.user) return json({ error: "Avval hisobga kiring" }, 401);
  const user = ud.user;
  const tgId = user.app_metadata?.tg ? String(user.app_metadata.tg) : "";

  if (action === "mine") {
    const { data } = await admin.from("login_phones").select("phone,verified").eq("user_id", user.id).maybeSingle();
    return json({ telegram: !!tgId, phone: data ? mask(data.phone) : null, verified: !!data?.verified });
  }
  if (action === "start") {
    if (!tgId) return json({ error: "Bu imkoniyat faqat Telegram orqali ochilgan hisoblar uchun" }, 403);
    await admin.from("phone_verify").delete().lt("created_at", new Date(Date.now() - 86400e3).toISOString());   // eski kodlar
    const since = new Date(Date.now() - CODE_TTL).toISOString();
    const { count } = await admin.from("phone_verify").select("code", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count || 0) >= 5) return json({ error: "Juda ko‘p urinish. 10 daqiqadan keyin qayta urinib ko‘ring" }, 429);
    const code = newCode();
    const { error } = await admin.from("phone_verify").insert({ code, user_id: user.id, tg_id: tgId, lang: body.lang === "en" ? "en" : "uz" });
    if (error) return json({ error: "Xizmatda xato. Birozdan keyin urinib ko'ring" }, 500);
    return json({ code, bot: "alvoramed_bot", url: `https://t.me/alvoramed_bot?start=${code}` });
  }
  if (action === "status") {
    const code = String(body.code || "");
    const { data } = await admin.from("phone_verify").select("status,phone,note,created_at").eq("code", code).eq("user_id", user.id).maybeSingle();
    if (!data) return json({ status: "missing" });
    const expired = data.status !== "done" && Date.now() - new Date(data.created_at).getTime() > CODE_TTL;
    return json({ status: expired ? "expired" : data.status, phone: data.phone ? mask(data.phone) : null, note: data.note || null });
  }
  return json({ error: "action" }, 400);
});
