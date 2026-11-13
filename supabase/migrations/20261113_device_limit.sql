-- Bitta hisobga 3 tagacha qurilma (30 kundan beri ko'rinmaganlari hisobga olinmaydi; adminlar cheklanmaydi)
create or replace function public.my_devices() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'platform', platform, 'browser', browser, 'standalone', standalone, 'last_seen', last_seen) order by last_seen desc), '[]'::jsonb)
  from public.devices where user_id = auth.uid() and last_seen > now() - interval '30 days';
$$;

create or replace function public.register_device(p_id uuid, p_platform text, p_browser text, p_standalone boolean, p_version text, p_lang text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.devices where id = p_id and user_id = auth.uid())
     and not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    select count(*) into n from public.devices where user_id = auth.uid() and last_seen > now() - interval '30 days';
    if n >= 3 then return jsonb_build_object('ok', false, 'devices', public.my_devices()); end if;
  end if;
  perform public.touch_device(p_id, p_platform, p_browser, p_standalone, p_version, p_lang);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.remove_device(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.devices where id = p_id and user_id = auth.uid();
$$;

revoke all on function public.my_devices(), public.register_device(uuid, text, text, boolean, text, text), public.remove_device(uuid) from public, anon;
grant execute on function public.my_devices(), public.register_device(uuid, text, text, boolean, text, text), public.remove_device(uuid) to authenticated;
revoke execute on function public.touch_device(uuid, text, text, boolean, text, text) from public, anon, authenticated;
