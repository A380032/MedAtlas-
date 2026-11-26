-- ALVORA Med v1.2.4: onlayn foydalanuvchilar (presence) va bo'limlarda sarflangan vaqt.
-- Ilova ochiq turganda har ~30 soniyada app_ping() chaqiradi. Jadvallarga to'g'ridan-to'g'ri kirish yo'q (RLS yoqilgan, siyosat yo'q):
-- yozish faqat app_ping(), o'qish faqat admin_usage_stats() (adminlikni serverning o'zida tekshiradi).

create table if not exists public.user_presence (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  last_ping   timestamptz not null default now(),
  section     text,
  app_version text,
  device_id   uuid
);
alter table public.user_presence enable row level security;

create table if not exists public.usage_time (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  section text not null,
  seconds int  not null default 0,
  primary key (user_id, day, section)
);
alter table public.usage_time enable row level security;
create index if not exists usage_time_day_idx on public.usage_time (day);
create index if not exists user_presence_ping_idx on public.user_presence (last_ping);

create or replace function public.app_ping(p_section text, p_usage jsonb default '{}'::jsonb, p_device uuid default null, p_version text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  d date := (now() at time zone 'Asia/Tashkent')::date;
  k text; v int; total int := 0; n int := 0;
begin
  if auth.uid() is null then return; end if;

  insert into public.user_presence (user_id, last_ping, section, app_version, device_id)
  values (auth.uid(), now(), left(coalesce(p_section, ''), 24), left(p_version, 20), p_device)
  on conflict (user_id) do update
    set last_ping = now(), section = excluded.section, app_version = coalesce(excluded.app_version, public.user_presence.app_version), device_id = coalesce(excluded.device_id, public.user_presence.device_id);

  if p_usage is not null and jsonb_typeof(p_usage) = 'object' then
    for k, v in
      select key, least(greatest(case when value ~ '^[0-9]+(\.[0-9]+)?$' then floor(value::numeric)::int else 0 end, 0), 300)
      from jsonb_each_text(p_usage)
    loop
      n := n + 1;
      exit when n > 25 or total >= 900;
      continue when k !~ '^[a-z_]{1,24}$' or v <= 0;
      v := least(v, 900 - total);
      total := total + v;
      insert into public.usage_time (user_id, day, section, seconds) values (auth.uid(), d, k, v)
      on conflict (user_id, day, section) do update set seconds = public.usage_time.seconds + excluded.seconds;
    end loop;
  end if;

  if p_device is not null then
    update public.devices
       set last_seen = now(), app_version = coalesce(left(p_version, 20), app_version)
     where id = p_device and user_id = auth.uid();
  end if;
  insert into public.user_days (user_id) values (auth.uid()) on conflict do nothing;
end $function$;

revoke all on function public.app_ping(text, jsonb, uuid, text) from public, anon;
grant execute on function public.app_ping(text, jsonb, uuid, text) to authenticated;

create or replace function public.admin_usage_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare r jsonb; d date := (now() at time zone 'Asia/Tashkent')::date;
begin
  if not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  select jsonb_build_object(
    'online',        (select count(*) from public.user_presence where last_ping > now() - interval '90 seconds'),
    'online_hour',   (select count(*) from public.user_presence where last_ping > now() - interval '1 hour'),
    'online_sections', (select coalesce(jsonb_object_agg(s, n), '{}') from (
        select coalesce(nullif(section, ''), 'boshqa') s, count(*) n from public.user_presence
        where last_ping > now() - interval '90 seconds' group by 1) x),
    'tracked7',      (select count(distinct user_id) from public.usage_time where day > d - 7),
    'tracked30',     (select count(distinct user_id) from public.usage_time where day > d - 30),
    'avg_day_secs7', (select coalesce(round(sum(seconds)::numeric / nullif(count(distinct (user_id, day)), 0)), 0) from public.usage_time where day > d - 7),
    'usage', (select coalesce(jsonb_agg(jsonb_build_object(
          'section', section,
          'secs7',  secs7,  'users7',  users7,
          'secs30', secs30, 'users30', users30) order by secs30 desc), '[]') from (
        select section,
          coalesce(sum(seconds) filter (where day > d - 7), 0)  secs7,
          count(distinct user_id) filter (where day > d - 7)    users7,
          coalesce(sum(seconds), 0)                             secs30,
          count(distinct user_id)                               users30
        from public.usage_time where day > d - 30 group by section) x),
    'version7', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select coalesce(nullif(app_version, ''), '?') k, count(*) n from public.devices
        where last_seen > now() - interval '7 days' group by 1) x),
    'version1', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select coalesce(nullif(app_version, ''), '?') k, count(*) n from public.devices
        where last_seen > now() - interval '1 day' group by 1) x)
  ) into r;
  return r;
end $function$;

revoke all on function public.admin_usage_stats() from public, anon;
grant execute on function public.admin_usage_stats() to authenticated;
