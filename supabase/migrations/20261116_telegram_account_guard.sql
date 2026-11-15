-- 2026-11-16 da qo'llangan.
-- Telegram hisoblarini oldindan egallab olishdan himoya (telegram-auth bilan birga qo'llanadi).
-- 1) Mavjud Telegram hisoblariga server belgisi (app_metadata.tg). Email+parol bilan kirish 13-noyabrda qo'shilgan,
--    shuning uchun undan oldin ochilgan "tg..@telegram.alvoramed.app" hisoblari faqat telegram-auth orqali ochilgan.
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tg', raw_user_meta_data->>'telegram_id')
 where email like '%@telegram.alvoramed.app'
   and raw_user_meta_data ? 'telegram_id'
   and email = 'tg' || (raw_user_meta_data->>'telegram_id') || '@telegram.alvoramed.app'
   and created_at < '2026-11-13'
   and not (coalesce(raw_app_meta_data, '{}'::jsonb) ? 'tg');

-- 2) telegram-auth uchun: hisob qaysi Telegram ID bilan ochilganini qaytaradi (faqat server kaliti bilan)
create or replace function public.tg_account(p_email text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'tg', raw_app_meta_data->>'tg') from auth.users where email = lower(p_email) limit 1;
$$;
revoke all on function public.tg_account(text) from public, anon, authenticated;
grant execute on function public.tg_account(text) to service_role;
