// ALVORA Med — Telegram orqali kirish (Supabase Edge Function "telegram-auth").
// Telegram Login Widget ma'lumoti bot tokeni bilan tekshiriladi, so'ng hisobga kirish uchun magic-link tokeni qaytariladi.
// Kalit: TELEGRAM_BOT_TOKEN (Supabase secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function validTelegram(data: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...rest } = data;
  if (!hash) return false;
  const check = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("\n");
  const secret = await crypto.subtle.digest("SHA-256", enc.encode(botToken));
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = hex(await crypto.subtle.sign("HMAC", key, enc.encode(check)));
  return sig === hash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return json({ error: "Telegram bot sozlanmagan" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) if (v !== undefined && v !== null) data[k] = String(v);

  if (!(await validTelegram(data, botToken))) return json({ error: "Telegram imzosi noto'g'ri" }, 401);
  const age = Date.now() / 1000 - Number(data.auth_date || 0);
  if (!(age >= -60 && age < 86400)) return json({ error: "Telegram so'rovi eskirgan, qayta urinib ko'ring" }, 401);
  if (!/^\d{1,20}$/.test(data.id || "")) return json({ error: "id" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `tg${data.id}@telegram.alvoramed.app`;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "Telegram foydalanuvchi";

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name, avatar_url: data.photo_url || null, telegram_id: data.id, telegram_username: data.username || null },
    app_metadata: { provider: "telegram", providers: ["telegram"], tg: data.id },
  });
  if (created.error) {
    if (!/already|registered|exists/i.test(created.error.message)) return json({ error: "Hisob yaratilmadi" }, 500);
    // Hisob bor: u haqiqatan shu funksiya orqali, shu Telegram ID bilan ochilganini tekshiramiz.
    // (Aks holda kimdir email+parol bilan "tg<ID>@telegram.alvoramed.app" hisobini oldindan ochib,
    // keyin shu Telegram egasining hisobiga kirib olishi mumkin edi.) app_metadata'ni mijoz o'zgartira olmaydi.
    const { data: acc, error: ae } = await admin.rpc("tg_account", { p_email: email });
    if (ae || !acc || acc.tg !== data.id) {
      return json({ error: "Bu Telegram hisobi uchun xavfsizlik tekshiruvi o‘tmadi. Administratorga murojaat qiling" }, 403);
    }
  } else if (created.data?.user?.id) {
    // ba'zi versiyalarda app_metadata yaratishda yozilmaydi — kafolat uchun yana bir bor yoziladi
    await admin.auth.admin.updateUserById(created.data.user.id, { app_metadata: { tg: data.id } });
  }
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token_hash = link.data?.properties?.hashed_token;
  if (link.error || !token_hash) return json({ error: "Kirish tokeni yaratilmadi" }, 500);
  return json({ token_hash, email });
});
