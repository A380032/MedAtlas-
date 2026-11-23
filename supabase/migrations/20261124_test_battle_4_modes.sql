-- ALVORA Med — Test battle (4/4): uch tur — Bullet (10, 15 savol), Blitz (20, 25), Rapid (30).
-- Har turning o'z Elo reytingi, ligasi va statistikasi bor; ular bir-biriga qo'shilmaydi.
-- Yangi turga birinchi kirganda reyting eng yaqin o'ynalgan turdan olinadi (Rapid ← Blitz ← Bullet), keyin mustaqil yuradi.
-- Ligalar: Abituriyent <1200, Talaba 1200, Intern 1350, Ordinator 1500, Shifokor 1650, Professor 1800.

/* ---------- Tur va ligalar ---------- */
create or replace function public.bt_mode(n int) returns text language sql immutable set search_path = public as $$
  select case when n <= 15 then 'bullet' when n <= 25 then 'blitz' else 'rapid' end $$;

-- Savollar kam bo'lsa natija tasodifiyroq, shuning uchun reyting o'zgarishi biroz kichikroq
create or replace function public.bt_kmul(m text) returns numeric language sql immutable set search_path = public as $$
  select case m when 'bullet' then 0.8 when 'rapid' then 1.1 else 1.0 end $$;

create or replace function public.bt_league(r int) returns smallint language sql immutable set search_path = public as $$
  select (case when r >= 1800 then 5 when r >= 1650 then 4 when r >= 1500 then 3 when r >= 1350 then 2 when r >= 1200 then 1 else 0 end)::smallint $$;
create or replace function public.bt_floor(l int) returns int language sql immutable set search_path = public as $$
  select (array[0, 1200, 1350, 1500, 1650, 1800])[l + 1] $$;

/* ---------- Tur bo'yicha reytinglar ---------- */
create table if not exists public.bt_ratings (
  user_id uuid not null references auth.users on delete cascade,
  mode text not null check (mode in ('bullet', 'blitz', 'rapid')),
  rating int not null default 1000,
  peak int not null default 1000,
  rated_games int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  room_games int not null default 0,
  room_wins int not null default 0,
  room_podiums int not null default 0,
  shield smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);
create index if not exists bt_ratings_top on public.bt_ratings (mode, rating desc) where rated_games > 0;
alter table public.bt_ratings enable row level security;
revoke all on public.bt_ratings from anon, authenticated;

-- Eski umumiy reyting ustunlari endi kerak emas (bt_players faqat sozlamalar, onlayn holat va umumiy o'yinlar sonini saqlaydi)
drop index if exists public.bt_players_rating;
alter table public.bt_players drop column if exists rating, drop column if exists peak, drop column if exists rated_games,
  drop column if exists wins, drop column if exists losses, drop column if exists draws, drop column if exists room_games,
  drop column if exists room_wins, drop column if exists room_podiums, drop column if exists shield;

alter table public.bt_matches add column if not exists mode text;
update public.bt_matches set mode = public.bt_mode(n_q) where mode is null;
alter table public.bt_matches alter column mode set not null;
alter table public.bt_matches drop constraint if exists bt_matches_mode_check;
alter table public.bt_matches add constraint bt_matches_mode_check check (mode in ('bullet', 'blitz', 'rapid'));

alter table public.bt_rlog add column if not exists mode text;
update public.bt_rlog l set mode = coalesce((select m.mode from public.bt_matches m where m.id = l.match_id), 'blitz') where l.mode is null;
alter table public.bt_rlog alter column mode set not null;
create index if not exists bt_rlog_mode on public.bt_rlog (mode, at desc, user_id);

/* Joriy reyting (o'sha turda hali o'ynamagan bo'lsa — eng yaqin turdan, hech qayerda o'ynamagan bo'lsa — 1000) */
create or replace function public.bt_rseed(p_u uuid, p_mode text) returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rating from public.bt_ratings where user_id = p_u and mode = p_mode),
    case p_mode
      when 'rapid' then coalesce((select rating from public.bt_ratings where user_id = p_u and mode = 'blitz' and rated_games > 0),
                                 (select rating from public.bt_ratings where user_id = p_u and mode = 'bullet' and rated_games > 0))
      when 'bullet' then coalesce((select rating from public.bt_ratings where user_id = p_u and mode = 'blitz' and rated_games > 0),
                                  (select rating from public.bt_ratings where user_id = p_u and mode = 'rapid' and rated_games > 0))
      else (select round(avg(rating))::int from public.bt_ratings where user_id = p_u and mode in ('bullet', 'rapid') and rated_games > 0)
    end,
    1000) $$;

/* O'yinchi haqida qisqa ma'lumot. Tur berilsa — o'sha turdagi reyting, berilmasa — uchala turdagi eng yuqori reyting */
drop function if exists public.bt_pj(uuid, text);
create or replace function public.bt_pj(p_u uuid, p_lang text, p_mode text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (
    select case when p_mode is not null then public.bt_rseed(p_u, p_mode)
                else coalesce((select max(x.rating) from public.bt_ratings x where x.user_id = p_u and x.rated_games > 0), 1000) end rt,
      coalesce((select sum(x.rated_games) from public.bt_ratings x where x.user_id = p_u and (p_mode is null or x.mode = p_mode)), 0)::int rg)
  select jsonb_build_object(
    'id', p_u,
    'name', coalesce(nullif(trim(pr.name), ''), 'Foydalanuvchi'),
    'av', pr.avatar_url,
    'ph', pr.photo is not null,
    'uni', pr.university,
    'uname', case when p_lang = 'en' then un.name_en else un.name_uz end,
    'rating', r.rt,
    'lg', public.bt_league(r.rt),
    'rg', r.rg)
  from r
  left join public.profiles pr on pr.id = p_u
  left join public.universities un on un.id = pr.university $$;

/* ---------- O'yinni yakunlash va reyting (Elo, o'yin turi bo'yicha) ---------- */
create or replace function public.bt_finish(p_m uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches; r record; k numeric; nr int; lo int; sh int; n int; tie boolean;
begin
  select * into mm from public.bt_matches where id = p_m for update;
  if not found or mm.status <> 'live' then return; end if;
  update public.bt_parts set done_at = coalesce(done_at, now()) where match_id = p_m and not kicked;

  -- O'rinlar: avval to'plangan ball, tenglikda umumiy vaqt. O'yindan chiqib ketganlar oxirida.
  with o as (
    select user_id, rank() over (order by (left_at is not null and cur < mm.n_q), score desc, ms asc) pl
    from public.bt_parts where match_id = p_m and not kicked)
  update public.bt_parts pa set place = o.pl from o where pa.match_id = p_m and pa.user_id = o.user_id;

  select count(*), count(*) filter (where place = 1) > 1 into n, tie from public.bt_parts where match_id = p_m and not kicked;

  if mm.rated and n >= 2 then
    for r in
    with p as (
      select pa.user_id u, pa.place pl, public.bt_rseed(pa.user_id, mm.mode) r, coalesce(rt.rated_games, 0) g, coalesce(rt.shield, 0) sh
      from public.bt_parts pa left join public.bt_ratings rt on rt.user_id = pa.user_id and rt.mode = mm.mode
      where pa.match_id = p_m and not pa.kicked),
    pr as (
      select a.u ua, a.r ra, a.g ga, a.sh sha, a.pl pla, b.u ub, b.r rb, b.pl plb
      from p a join p b on a.u <> b.u
      where mm.kind = 'duel' or (select count(*) from public.bt_pairs x
             where x.a = least(a.u, b.u) and x.b = greatest(a.u, b.u) and x.at > now() - interval '7 days') < 2)
    select ua u, max(ra) r, max(ga) g, max(sha) sh, count(*) m,
      sum((case when pla < plb then 1.0 when pla = plb then 0.5 else 0.0 end) - 1.0 / (1.0 + power(10.0, (rb - ra) / 400.0))) s,
      max(pla) pl
    from pr group by ua

    loop
      -- K: o'sha turdagi birinchi 20 o'yinda 40 (reyting tez joyiga tushadi), keyin 24; tur koeffitsienti bilan
      k := (case when r.g < 20 then 40 else 24 end) * public.bt_kmul(mm.mode);
      nr := r.r + round(k * r.s / greatest(r.m, 1))::int;
      if r.pl = 1 and not tie and nr <= r.r then nr := r.r + 1; end if;                               -- g'alabada kamida +1
      lo := public.bt_league(r.r);
      sh := r.sh;
      if nr < public.bt_floor(lo) and sh > 0 then nr := public.bt_floor(lo); sh := sh - 1; end if;   -- ligadan darrov tushib ketmaslik
      if public.bt_league(nr) > lo then sh := 3; end if;                                           -- yangi ligaga chiqqanda 3 o'yin himoya
      nr := greatest(nr, 100);
      insert into public.bt_ratings (user_id, mode, rating, peak) values (r.u, mm.mode, r.r, r.r) on conflict do nothing;
      update public.bt_ratings set rating = nr, peak = greatest(peak, nr), rated_games = rated_games + 1, shield = sh,
        wins = wins + (case when mm.kind = 'duel' and r.pl = 1 and not tie then 1 else 0 end),
        losses = losses + (case when mm.kind = 'duel' and r.pl > 1 then 1 else 0 end),
        draws = draws + (case when mm.kind = 'duel' and tie then 1 else 0 end),
        room_games = room_games + (case when mm.kind = 'room' then 1 else 0 end),
        room_wins = room_wins + (case when mm.kind = 'room' and r.pl = 1 then 1 else 0 end),
        room_podiums = room_podiums + (case when mm.kind = 'room' and r.pl <= 3 then 1 else 0 end),
        updated_at = now()
      where user_id = r.u and mode = mm.mode;
      update public.bt_parts set r_before = r.r, r_after = nr, delta = nr - r.r where match_id = p_m and user_id = r.u;
      insert into public.bt_rlog (user_id, match_id, delta, rating, mode) values (r.u, p_m, nr - r.r, nr, mm.mode);
    end loop;

    -- Reytingga qo'shilgan juftliklar (limit barcha turlar uchun umumiy)
    insert into public.bt_pairs (a, b, match_id)
    select least(a.user_id, b.user_id), greatest(a.user_id, b.user_id), p_m
    from public.bt_parts a join public.bt_parts b on a.match_id = b.match_id and a.user_id < b.user_id
    where a.match_id = p_m and not a.kicked and not b.kicked
      and (mm.kind = 'duel' or (select count(*) from public.bt_pairs x
             where x.a = a.user_id and x.b = b.user_id and x.at > now() - interval '7 days') < 2);
  end if;

  update public.bt_players py set games = games + 1, updated_at = now()
  from public.bt_parts pa where pa.match_id = p_m and not pa.kicked and py.user_id = pa.user_id;
  update public.bt_matches set status = 'done', finished_at = now() where id = p_m;
end $$;

/* ---------- O'yinni boshlash: qiyinlik o'sha turdagi ligaga qarab ---------- */
create or replace function public.bt_start_inner(p_m uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches; us uuid[]; lg int; e int; md int; n1 int; n2 int; n3 int; w numeric; got int; tl int; r record; np int;
begin
  select * into mm from public.bt_matches where id = p_m for update;
  if not found or mm.status <> 'lobby' then return; end if;
  select array_agg(user_id) into us from public.bt_parts where match_id = p_m and not kicked;
  np := coalesce(cardinality(us), 0);
  if np < 2 then raise exception 'few_players'; end if;

  -- Qiyinlik aralashmasi (oson/o'rta foizi; qolgani qiyin): liga oshgani sari qiyin savollar ko'payadi
  select public.bt_league(round(avg(public.bt_rseed(x.u, mm.mode)))::int) into lg from unnest(us) x(u);
  e := (array[70, 55, 40, 30, 15, 5])[lg + 1];
  md := (array[25, 35, 45, 50, 45, 35])[lg + 1];
  if mm.diff_mode = '1' then e := 100; md := 0;
  elsif mm.diff_mode = '2' then e := 0; md := 100;
  elsif mm.diff_mode = '3' then e := 0; md := 0;
  elsif mm.diff_mode = 'mix' then e := 34; md := 33; end if;
  n1 := round(mm.n_q * e / 100.0); n2 := round(mm.n_q * md / 100.0); n3 := greatest(0, mm.n_q - n1 - n2);
  w := case when lg >= 2 then 0.15 * lg else 0 end;   -- yuqori ligada ko'p javobli savollar ko'proq tushadi

  delete from public.bt_match_q where match_id = p_m;
  insert into public.bt_match_q (match_id, ord, qid, lim)
  with pool as (
    select q.id, public.bt_effdiff(q.seen, q.okc, q.diff) d, cardinality(q.ans) na,
      exists (select 1 from public.bt_answers a where a.qid = q.id and a.user_id = any (us) and a.at > now() - interval '7 days') s7
    from public.bt_questions q
    where q.active and q.lang = mm.lang and q.course = mm.course
      and (mm.subject is null or q.subject = mm.subject) and (mm.topic is null or q.topic = mm.topic)),
  rk as (select id, d, na, s7, row_number() over (partition by d order by s7, random() * (1 + w * (na - 1)) desc) rn from pool),
  f as (select id from rk where (d = 1 and rn <= n1) or (d = 2 and rn <= n2) or (d = 3 and rn <= n3)),
  rest as (select id from rk where id not in (select id from f) order by s7, random() limit greatest(0, mm.n_q - (select count(*) from f))),
  ch as (select id from f union all select id from rest)
  select p_m, (row_number() over (order by random()) - 1)::smallint, ch.id, public.bt_lim(cardinality(q.ans))
  from ch join public.bt_questions q on q.id = ch.id;

  select count(*), coalesce(sum(lim), 0) into got, tl from public.bt_match_q where match_id = p_m;
  if got < 1 then raise exception 'no_questions'; end if;

  -- Har bir qatnashchida savollar va variantlar tartibi har xil
  for r in select user_id from public.bt_parts where match_id = p_m and not kicked loop
    update public.bt_parts pa set
      seq = (select array_agg(o::smallint order by random()) from generate_series(0, got - 1) o),
      perms = (select jsonb_agg((select to_jsonb(array_agg(i order by random())) from generate_series(0, jsonb_array_length(q.opts) - 1) i) order by mq.ord)
               from public.bt_match_q mq join public.bt_questions q on q.id = mq.qid where mq.match_id = p_m),
      cur = 0, shown_at = null, score = 0, okn = 0, ms = 0, done_at = null, place = null
    where pa.match_id = p_m and pa.user_id = r.user_id;
  end loop;

  update public.bt_matches set status = 'live', n_q = got,
    rated = case when kind = 'duel' then
      (select count(*) from public.bt_pairs x where x.a = least(us[1], us[2]) and x.b = greatest(us[1], us[2]) and x.at > now() - interval '7 days') < 2
      else true end,
    started_at = now() + interval '4 seconds',
    deadline = now() + interval '4 seconds' + make_interval(secs => tl + got * 15 + 30)
  where id = p_m;
  delete from public.bt_queue where user_id = any (us) and match_id is null;
end $$;

/* ---------- Xona / duel yaratish (tur savollar sonidan aniqlanadi) ---------- */
create or replace function public.bt_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); v_kind text := coalesce(p->>'kind', 'room'); v_vis text := coalesce(p->>'vis', 'closed');
  v_lang text := coalesce(p->>'lang', 'uz'); v_course int := (p->>'course')::int; v_sub text := nullif(p->>'subject', '');
  v_top text := nullif(p->>'topic', ''); v_n int := coalesce((p->>'n_q')::int, 10); v_rev text := coalesce(p->>'reveal', 'instant');
  v_diff text := coalesce(p->>'diff', 'auto'); v_cap int := coalesce((p->>'cap')::int, 2); v_inv uuid := nullif(p->>'invitee', '')::uuid;
  v_title text := nullif(trim(coalesce(p->>'title', '')), ''); have int; sn text; tn text; mid uuid; cd text;
begin
  perform public.bt_player(u);
  perform public.bt_busy(u);
  if v_kind not in ('duel', 'room') or v_vis not in ('open', 'closed') or v_lang not in ('uz', 'en')
     or v_n not in (10, 15, 20, 25, 30) or v_rev not in ('instant', 'end') or v_diff not in ('auto', '1', '2', '3', 'mix')
     or v_course is null or v_course not between 1 and 6 then raise exception 'bad'; end if;
  if v_top is not null and v_sub is null then raise exception 'bad'; end if;
  if v_kind = 'duel' then v_cap := 2; v_vis := 'closed'; v_diff := 'auto'; v_rev := 'instant';
  elsif v_cap not between 2 and 50 then raise exception 'bad'; end if;
  if v_title is not null then v_title := left(v_title, 60); end if;
  if (select count(*) from public.bt_matches where owner = u and created_at > now() - interval '1 hour') >= 30 then raise exception 'rate'; end if;

  have := public.bt_pool(v_lang, v_course, v_sub, v_top);
  if have < v_n then raise exception 'few:%', have; end if;
  select max(subject_name), max(topic_name) filter (where topic = v_top) into sn, tn
  from public.bt_questions where active and lang = v_lang and course = v_course and subject = v_sub;

  if v_inv is not null then
    if v_inv = u or not exists (select 1 from public.profiles where id = v_inv) then raise exception 'bad'; end if;
    if public.bt_blocked(u, v_inv) then raise exception 'blocked'; end if;
    if exists (select 1 from public.bt_players where user_id = v_inv and no_invites) then raise exception 'no_invites'; end if;
    if (select count(*) from public.bt_matches where owner = u and invitee = v_inv and created_at > now() - interval '1 hour') >= 5 then raise exception 'rate'; end if;
  end if;

  perform public.bt_leave_lobbies(u, null);
  delete from public.bt_queue where user_id = u;
  cd := public.bt_code();
  insert into public.bt_matches (kind, vis, code, owner, invitee, title, lang, course, subject, subject_name, topic, topic_name, n_q, mode, reveal, diff_mode, cap)
  values (v_kind, v_vis, cd, u, v_inv, v_title, v_lang, v_course, v_sub, sn, v_top, tn, v_n, public.bt_mode(v_n), v_rev, v_diff, v_cap)
  returning id into mid;
  insert into public.bt_parts (match_id, user_id) values (mid, u);
  return jsonb_build_object('id', mid, 'code', cd);
end $$;

/* ---------- O'yin holati: reytinglar o'yin turida ko'rsatiladi ---------- */
create or replace function public.bt_state(p_id uuid, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches; inm boolean; hide boolean; pl jsonb;
begin
  select * into mm from public.bt_matches where id = p_id;
  if not found then raise exception 'notfound'; end if;
  if mm.status = 'live' and (now() > mm.deadline or not exists (select 1 from public.bt_parts where match_id = p_id and not kicked and done_at is null)) then
    perform public.bt_finish(p_id); select * into mm from public.bt_matches where id = p_id;
  elsif mm.status = 'lobby' and mm.kind = 'duel' and mm.invitee is not null and mm.created_at < now() - interval '90 seconds' then
    update public.bt_matches set status = 'cancelled', end_reason = 'expired' where id = p_id returning * into mm;
  elsif mm.status = 'lobby' and mm.created_at < now() - interval '30 minutes' then
    update public.bt_matches set status = 'cancelled', end_reason = 'expired' where id = p_id returning * into mm;
  end if;
  inm := exists (select 1 from public.bt_parts where match_id = p_id and user_id = u and not kicked);
  if not inm and not (mm.vis = 'open' or mm.invitee = u or public.is_admin()) then raise exception 'closed'; end if;
  hide := mm.status = 'live' and mm.reveal = 'end';
  select coalesce(jsonb_agg(public.bt_pj(pa.user_id, p_lang, mm.mode) || jsonb_build_object(
      'cur', pa.cur, 'score', case when hide then null else pa.score end, 'okn', case when hide then null else pa.okn end,
      'ms', pa.ms, 'done', pa.done_at is not null, 'left', pa.left_at is not null, 'place', pa.place,
      'delta', pa.delta, 'r_after', pa.r_after, 'r_before', pa.r_before, 'owner', pa.user_id = mm.owner, 'me', pa.user_id = u)
    order by case when mm.status = 'done' then pa.place end nulls last, pa.score desc, pa.ms, pa.joined_at), '[]'::jsonb)
  into pl from public.bt_parts pa where pa.match_id = p_id and not pa.kicked and (mm.status <> 'lobby' or pa.left_at is null);
  return jsonb_build_object('id', mm.id, 'kind', mm.kind, 'mode', mm.mode, 'vis', mm.vis, 'code', case when inm or mm.vis = 'open' or mm.invitee = u then mm.code end,
    'title', mm.title, 'lang', mm.lang, 'course', mm.course, 'subject', mm.subject, 'sname', mm.subject_name, 'topic', mm.topic, 'tname', mm.topic_name,
    'n_q', mm.n_q, 'reveal', mm.reveal, 'diff', mm.diff_mode, 'cap', mm.cap, 'status', mm.status, 'reason', mm.end_reason,
    'ranked', mm.ranked, 'rated', mm.rated, 'owner', mm.owner, 'invitee', case when mm.invitee is not null then public.bt_pj(mm.invitee, p_lang, mm.mode) end,
    'is_owner', mm.owner = u, 'in', inm, 'created_at', mm.created_at, 'started_at', mm.started_at, 'deadline', mm.deadline,
    'finished_at', mm.finished_at, 'now', now(), 'parts', pl);
end $$;

/* ---------- Yurak urishi: kelgan takliflarda o'yin turi ---------- */
create or replace function public.bt_ping(p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mid uuid; inv jsonb; s public.bt_players;
begin
  perform public.bt_player(u);
  update public.bt_players set last_seen = now() where user_id = u returning * into s;
  for mid in select m.id from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
             where pa.user_id = u and m.status = 'live' and m.deadline < now() loop
    perform public.bt_finish(mid);
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', public.bt_pj(m.owner, p_lang, m.mode), 'mode', m.mode, 'course', m.course, 'sname', m.subject_name,
      'tname', m.topic_name, 'n_q', m.n_q, 'left_s', greatest(0, 90 - extract(epoch from now() - m.created_at)::int)) order by m.created_at desc), '[]'::jsonb)
  into inv from public.bt_matches m
  where m.invitee = u and m.status = 'lobby' and m.kind = 'duel' and m.created_at > now() - interval '90 seconds'
    and not exists (select 1 from public.bt_parts pa where pa.match_id = m.id and pa.user_id = u);
  return jsonb_build_object('invites', inv, 'active', public.bt_active(u), 'invisible', s.invisible, 'no_invites', s.no_invites);
end $$;

/* ---------- O'yinchi kartochkasi: har tur bo'yicha alohida ---------- */
create or replace function public.bt_profile(p_user uuid, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); t uuid := coalesce(p_user, u); py public.bt_players; un text; modes jsonb;
begin
  perform public.bt_player(t);
  select * into py from public.bt_players where user_id = t;
  select university into un from public.profiles where id = t;
  select jsonb_object_agg(m.mode, jsonb_build_object(
      'rating', public.bt_rseed(t, m.mode), 'lg', public.bt_league(public.bt_rseed(t, m.mode)),
      'rg', coalesce(x.rated_games, 0), 'peak', coalesce(x.peak, public.bt_rseed(t, m.mode)),
      'wins', coalesce(x.wins, 0), 'losses', coalesce(x.losses, 0), 'draws', coalesce(x.draws, 0),
      'room_games', coalesce(x.room_games, 0), 'room_wins', coalesce(x.room_wins, 0), 'room_podiums', coalesce(x.room_podiums, 0),
      'rank', case when x.rated_games > 0 then (select count(*) + 1 from public.bt_ratings y where y.mode = m.mode and y.rated_games > 0 and y.rating > x.rating) end,
      'rank_uni', case when x.rated_games > 0 and un is not null then (select count(*) + 1 from public.bt_ratings y join public.profiles p on p.id = y.user_id
                      where y.mode = m.mode and y.rated_games > 0 and p.university = un and y.rating > x.rating) end,
      'shield', case when t = u then coalesce(x.shield, 0) end))
  into modes
  from (values ('bullet'), ('blitz'), ('rapid')) m(mode) left join public.bt_ratings x on x.user_id = t and x.mode = m.mode;
  return public.bt_pj(t, p_lang) || jsonb_build_object('modes', modes, 'games', py.games,
    'online', t = u or (py.last_seen > now() - interval '150 seconds' and not py.invisible), 'me', t = u,
    'blocked', exists (select 1 from public.bt_blocks where user_id = u and blocked = t), 'no_inv', py.no_invites);
end $$;

/* ---------- Battle bosh sahifasi ---------- */
create or replace function public.bt_home(p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); rooms jsonb; onl int; srch int;
begin
  perform public.bt_player(u);
  update public.bt_players set last_seen = now() where user_id = u;
  update public.bt_matches set status = 'cancelled', end_reason = 'expired'
  where status = 'lobby' and created_at < now() - interval '30 minutes';
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'mode', m.mode, 'course', m.course, 'sname', m.subject_name, 'tname', m.topic_name,
      'n_q', m.n_q, 'cap', m.cap, 'reveal', m.reveal, 'n', (select count(*) from public.bt_parts pa where pa.match_id = m.id and not pa.kicked and pa.left_at is null),
      'owner', public.bt_pj(m.owner, p_lang, m.mode)) order by m.created_at desc), '[]'::jsonb)
  into rooms from public.bt_matches m
  where m.status = 'lobby' and m.vis = 'open' and m.kind = 'room' and m.lang = p_lang and not public.bt_blocked(u, m.owner);
  select count(*) into onl from public.bt_players where last_seen > now() - interval '150 seconds' and not invisible;
  select count(*) into srch from public.bt_queue where match_id is null and seen_at > now() - interval '10 seconds';
  return jsonb_build_object('me', public.bt_profile(u, p_lang), 'rooms', rooms, 'online', onl, 'searching', srch,
    'active', public.bt_active(u), 'admin', public.is_admin(),
    'set', (select jsonb_build_object('invisible', invisible, 'no_invites', no_invites) from public.bt_players where user_id = u));
end $$;

/* ---------- Reyting jadvallari: tur × (umumiy, universitetim, universitetlar) × (hafta / oy / barcha vaqt) ---------- */
drop function if exists public.bt_top(text, text, text, text, int, int, text);
create or replace function public.bt_top(p_mode text, p_tab text, p_period text, p_uni text, p_q text, p_off int, p_lim int, p_lang text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); md text := case when p_mode in ('bullet', 'blitz', 'rapid') then p_mode else 'blitz' end;
  since timestamptz; myuni text; rows jsonb; mine jsonb; tot int; lim int := least(greatest(coalesce(p_lim, 50), 1), 100);
  off int := greatest(coalesce(p_off, 0), 0); qq text := nullif(trim(coalesce(p_q, '')), '');
begin
  since := case p_period when 'week' then now() - interval '7 days' when 'month' then now() - interval '30 days' else null end;
  select university into myuni from public.profiles where id = u;
  if p_tab = 'unis' then
    with v as (
      select pr.university uni, case when since is null then x.rating
        else coalesce((select sum(l.delta) from public.bt_rlog l where l.user_id = x.user_id and l.mode = md and l.at >= since), 0) end val
      from public.bt_ratings x join public.profiles pr on pr.id = x.user_id
      where x.mode = md and x.rated_games > 0 and pr.university is not null and pr.university <> 'boshqa'
        and (since is null or exists (select 1 from public.bt_rlog l where l.user_id = x.user_id and l.mode = md and l.at >= since))),
    r as (select uni, val, row_number() over (partition by uni order by val desc) rn, count(*) over (partition by uni) cnt from v),
    a as (select uni, round(avg(val))::int score, max(cnt)::int players from r where rn <= 10 group by uni having max(cnt) >= 5),
    k as (select a.*, rank() over (order by score desc) pos from a)
    select (select coalesce(jsonb_agg(jsonb_build_object('pos', y.pos, 'uni', y.uni, 'name', case when p_lang = 'en' then un.name_en else un.name_uz end,
              'region', case when p_lang = 'en' then un.region_en else un.region_uz end, 'score', y.score, 'players', y.players, 'mine', y.uni = myuni) order by y.pos, y.uni), '[]'::jsonb)
            from (select * from k order by pos, uni offset off limit lim) y join public.universities un on un.id = y.uni),
      (select jsonb_build_object('pos', k2.pos, 'score', k2.score, 'players', k2.players) from k k2 where k2.uni = myuni),
      (select count(*) from k)
    into rows, mine, tot;
    return jsonb_build_object('mode', md, 'tab', 'unis', 'rows', rows, 'me', mine, 'total', tot, 'my_uni', myuni,
      'uname', (select case when p_lang = 'en' then name_en else name_uz end from public.universities where id = myuni));
  end if;

  if p_tab = 'uni' then myuni := coalesce(nullif(p_uni, ''), myuni);
    if myuni is null then return jsonb_build_object('mode', md, 'tab', 'uni', 'rows', '[]'::jsonb, 'me', null, 'total', 0, 'no_uni', true); end if;
  end if;
  with v as (
    select x.user_id, x.wins, x.losses, x.draws, x.rated_games, x.rating,
      case when since is null then x.rating
        else coalesce((select sum(l.delta) from public.bt_rlog l where l.user_id = x.user_id and l.mode = md and l.at >= since), 0) end val,
      case when since is null then x.rated_games
        else (select count(*) from public.bt_rlog l where l.user_id = x.user_id and l.mode = md and l.at >= since) end g
    from public.bt_ratings x join public.profiles pr on pr.id = x.user_id
    where x.mode = md and x.rated_games > 0 and (p_tab <> 'uni' or pr.university = myuni)
      and (since is null or exists (select 1 from public.bt_rlog l where l.user_id = x.user_id and l.mode = md and l.at >= since))),
  k as (select v.*, rank() over (order by val desc) pos from v),
  f as (select k.* from k join public.profiles pr on pr.id = k.user_id
        where qq is null or pr.name ilike '%' || replace(replace(qq, '%', ''), '_', '') || '%')
  select (select coalesce(jsonb_agg(public.bt_pj(y.user_id, p_lang, md) || jsonb_build_object('pos', y.pos, 'val', y.val, 'g', y.g, 'wins', y.wins,
            'losses', y.losses, 'draws', y.draws, 'me', y.user_id = u) order by y.pos, y.user_id), '[]'::jsonb)
          from (select * from f order by pos, user_id offset off limit lim) y),
         (select jsonb_build_object('pos', k2.pos, 'val', k2.val, 'g', k2.g) from k k2 where k2.user_id = u),
         (select count(*) from f)
  into rows, mine, tot;
  return jsonb_build_object('mode', md, 'tab', coalesce(p_tab, 'all'), 'rows', rows, 'me', mine, 'total', tot, 'uni', myuni,
    'uname', (select case when p_lang = 'en' then name_en else name_uz end from public.universities where id = myuni));
end $$;

/* Bosh sahifa uchun: tanlangan turda umumiy va universitetlar top-10 hamda o'z o'rningiz */
create or replace function public.bt_top10(p_mode text, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'all', public.bt_top(p_mode, 'all', 'all', null, null, 0, 10, p_lang),
    'unis', public.bt_top(p_mode, 'unis', 'all', null, null, 0, 10, p_lang));
end $$;

/* ---------- Tasodifiy raqib: navbat savollar soni bo'yicha (demak tur ham bir xil), reyting o'sha turda ---------- */
create or replace function public.bt_qmatch(p_u uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare me public.bt_queue; op public.bt_queue; wt numeric; mid uuid; sn text; tn text;
begin
  perform pg_advisory_xact_lock(771245);
  select * into me from public.bt_queue where user_id = p_u;
  if not found then return null; end if;
  if me.match_id is not null then return me.match_id; end if;
  wt := extract(epoch from now() - me.at);
  select q.* into op from public.bt_queue q
  where q.user_id <> p_u and q.match_id is null and q.seen_at > now() - interval '8 seconds'
    and q.lang = me.lang and q.course = me.course and q.subject is not distinct from me.subject and q.topic is not distinct from me.topic and q.n_q = me.n_q
    and abs(q.rating - me.rating) <= least(3000, 150 + 8 * greatest(wt, extract(epoch from now() - q.at)))
    and not public.bt_blocked(p_u, q.user_id)
  order by abs(q.rating - me.rating), q.at limit 1;
  if not found then return null; end if;
  select max(subject_name), max(topic_name) filter (where topic = me.topic) into sn, tn
  from public.bt_questions where active and lang = me.lang and course = me.course and subject = me.subject;
  insert into public.bt_matches (kind, vis, code, owner, lang, course, subject, subject_name, topic, topic_name, n_q, mode, cap, ranked)
  values ('duel', 'closed', public.bt_code(), op.user_id, me.lang, me.course, me.subject, sn, me.topic, tn, me.n_q, public.bt_mode(me.n_q), 2, true) returning id into mid;
  insert into public.bt_parts (match_id, user_id, joined_at) values (mid, op.user_id, op.at), (mid, p_u, me.at);
  update public.bt_queue set match_id = mid where user_id in (p_u, op.user_id);
  perform public.bt_start_inner(mid);
  return mid;
end $$;

create or replace function public.bt_queue_join(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); v_lang text := coalesce(p->>'lang', 'uz'); v_course int := (p->>'course')::int; v_sub text := nullif(p->>'subject', '');
  v_top text := nullif(p->>'topic', ''); v_n int := coalesce((p->>'n_q')::int, 10); have int; rt int; mid uuid;
begin
  perform public.bt_player(u);
  perform public.bt_busy(u);
  if v_lang not in ('uz', 'en') or v_n not in (10, 15, 20, 25, 30) or v_course is null or (v_top is not null and v_sub is null) then raise exception 'bad'; end if;
  have := public.bt_pool(v_lang, v_course, v_sub, v_top);
  if have < v_n then raise exception 'few:%', have; end if;
  perform public.bt_leave_lobbies(u, null);
  rt := public.bt_rseed(u, public.bt_mode(v_n));
  delete from public.bt_queue where at < now() - interval '10 minutes' or (match_id is null and seen_at < now() - interval '30 seconds');
  insert into public.bt_queue (user_id, lang, course, subject, topic, n_q, rating) values (u, v_lang, v_course, v_sub, v_top, v_n, rt)
  on conflict (user_id) do update set lang = excluded.lang, course = excluded.course, subject = excluded.subject, topic = excluded.topic,
    n_q = excluded.n_q, rating = excluded.rating, at = now(), seen_at = now(), match_id = null;
  mid := public.bt_qmatch(u);
  if mid is not null then delete from public.bt_queue where user_id = u; end if;
  return jsonb_build_object('match', mid, 'waiting', mid is null);
end $$;

/* ---------- Administrator: o'yinchilar soni ---------- */
create or replace function public.bt_admin_overview() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.bt_questions),
    'active', (select count(*) from public.bt_questions where active),
    'demo', (select count(*) from public.bt_questions where demo),
    'by', (select coalesce(jsonb_agg(x order by x->>'lang', (x->>'course')::int, x->>'subject'), '[]'::jsonb) from (
      select jsonb_build_object('lang', lang, 'course', course, 'subject', subject, 'name', max(subject_name), 'n', count(*),
        'd1', count(*) filter (where diff = 1), 'd2', count(*) filter (where diff = 2), 'd3', count(*) filter (where diff = 3),
        'multi', count(*) filter (where cardinality(ans) > 1), 'topics', count(distinct topic)) x
      from public.bt_questions group by lang, course, subject) s),
    'matches', (select count(*) from public.bt_matches where status = 'done'),
    'live', (select count(*) from public.bt_matches where status = 'live'),
    'today', (select count(*) from public.bt_matches where status = 'done' and finished_at > date_trunc('day', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent'),
    'players', (select count(*) from public.bt_players where games > 0),
    'modes', (select coalesce(jsonb_object_agg(mode, n), '{}'::jsonb) from (select mode, count(*) n from public.bt_matches where status = 'done' group by mode) z));
end $$;

/* ---------- Huquqlar ---------- */
do $$
declare f record;
begin
  for f in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'bt\_%' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('bt_create', 'bt_join', 'bt_leave', 'bt_decline', 'bt_kick', 'bt_start', 'bt_q', 'bt_answer', 'bt_state', 'bt_review',
                     'bt_ping', 'bt_settings', 'bt_block', 'bt_online', 'bt_profile', 'bt_home', 'bt_top', 'bt_top10', 'bt_catalog',
                     'bt_queue_join', 'bt_queue_poll', 'bt_queue_leave', 'bt_admin_overview', 'bt_admin_list', 'bt_admin_set',
                     'bt_lim', 'bt_league', 'bt_floor', 'bt_effdiff', 'bt_mode') then
      execute format('grant execute on function %s to authenticated', f.sig);
    else
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
  end loop;
end $$;
