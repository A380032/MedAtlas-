import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Telefon raqam + parol bilan kirish (Telegram orqali ochilgan hisoblar uchun).
// "set"  — kirgan foydalanuvchi o'z hisobiga telefon raqamni login sifatida bog'laydi (parol mijozda o'rnatiladi).
// "login" — telefon + parol tekshiriladi va sessiya qaytariladi.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const norm = (s: unknown): string | null => {
  let d = String(s ?? "").replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;
  return /^[0-9]{9,15}$/.test(d) ? d : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  const phone = norm(body.phone);
  if (!phone) return json({ error: "phone" }, 400);

  if (body.action === "set") {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "auth" }, 401);
    const { data: taken } = await admin.from("login_phones").select("user_id").eq("phone", phone).maybeSingle();
    if (taken && taken.user_id !== u.user.id) return json({ error: "taken" }, 409);
    await admin.from("login_phones").delete().eq("user_id", u.user.id);
    const { error } = await admin.from("login_phones").insert({ phone, user_id: u.user.id });
    if (error) return json({ error: "save" }, 500);
    return json({ ok: true });
  }

  if (body.action === "login") {
    const password = String(body.password ?? "");
    if (password.length < 6) return json({ error: "invalid" }, 401);
    const { data: row } = await admin.from("login_phones").select("user_id").eq("phone", phone).maybeSingle();
    if (!row) return json({ error: "invalid" }, 401);
    const { data: u } = await admin.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) return json({ error: "invalid" }, 401);
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: "invalid" }, 401);
    return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  }
  return json({ error: "action" }, 400);
});
