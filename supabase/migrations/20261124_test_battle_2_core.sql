-- ALVORA Med — Test battle (2/3): o'yin mantig'i (server tomonda).
-- To'g'ri javoblar telefonga hech qachon oldindan yuborilmaydi: tekshirish, vaqt va ball faqat shu yerda hisoblanadi.

/* ---------- Yordamchilar ---------- */
create or replace function public.bt_uid() returns uuid language plpgsql stable set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'auth'; end if;
  return u;
end $$;

-- Savol vaqti: to'g'ri javoblar soniga qarab (1 → 20 s, 2 → 25, 3 → 35, 4 → 45, 5 → 55)
create or replace function public.bt_lim(n int) returns smallint language sql immutable as $$
  select (case when n <= 1 then 20 when n = 2 then 25 when n = 3 then 35 when n = 4 then 45 else 55 end)::smallint $$;

-- Ligalar: 0 Abituriyent, 1 Talaba, 2 Intern, 3 Ordinator, 4 Shifokor, 5 Professor
create or replace function public.bt_league(r int) returns smallint language sql immutable as $$
  select (case when r >= 1700 then 5 when r >= 1550 then 4 when r >= 1400 then 3 when r >= 1250 then 2 when r >= 1100 then 1 else 0 end)::smallint $$;
create or replace function public.bt_floor(l int) returns int language sql immutable as $$
  select (array[0, 1100, 1250, 1400, 1550, 1700])[l + 1] $$;

-- Haqiqiy qiyinlik: 50+ marta javob berilgach, to'g'ri javob foiziga qarab avtomatik tuzatiladi
create or replace function public.bt_effdiff(p_seen int, p_okc numeric, p_diff smallint) returns smallint language sql immutable as $$
  select (case when p_seen >= 50 then (case when p_okc / p_seen >= 0.75 then 1 when p_okc / p_seen >= 0.45 then 2 else 3 end) else p_diff end)::smallint $$;

create or replace function public.bt_player(p_u uuid) returns void language sql security definer set search_path = public as $$
  insert into public.bt_players (user_id) values (p_u) on conflict (user_id) do nothing $$;

create or replace function public.bt_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bt_blocks where (user_id = a and blocked = b) or (user_id = b and blocked = a)) $$;

create or replace function public.bt_pool(p_lang text, p_course int, p_subject text, p_topic text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.bt_questions q
  where q.active and q.lang = p_lang and q.course = p_course
    and (p_subject is null or q.subject = p_subject) and (p_topic is null or q.topic = p_topic) $$;

create or replace function public.bt_code() returns text language plpgsql set search_path = public as $$
declare abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.bt_matches where code = c);
  end loop;
  return c;
end $$;

-- O'yinchi haqida qisqa ma'lumot (ism, rasm havolasi, universitet, reyting)
create or replace function public.bt_pj(p_u uuid, p_lang text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_u,
    'name', coalesce(nullif(trim(pr.name), ''), 'Foydalanuvchi'),
    'av', pr.avatar_url,
    'ph', pr.photo is not null,
    'uni', pr.university,
    'uname', case when p_lang = 'en' then un.name_en else un.name_uz end,
    'rating', coalesce(py.rating, 1000),
    'lg', public.bt_league(coalesce(py.rating, 1000)),
    'rg', coalesce(py.rated_games, 0))
  from (select 1) x
  left join public.profiles pr on pr.id = p_u
  left join public.universities un on un.id = pr.university
  left join public.bt_players py on py.user_id = p_u $$;

-- Hozir davom etayotgan (tugallanmagan) o'yinim
create or replace function public.bt_active(p_u uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'status', m.status, 'kind', m.kind)
  from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
  where pa.user_id = p_u and not pa.kicked and pa.left_at is null
    and (m.status = 'lobby' or (m.status = 'live' and pa.done_at is null))
  order by pa.joined_at desc limit 1 $$;

/* ---------- O'yinni yakunlash va reyting (Elo) ---------- */
create or replace function public.bt_finish(p_m uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches; r record; k int; nr int; lo int; sh int; n int; tie boolean;
begin
  select * into mm from public.bt_matches where id = p_m for update;
  if not found or mm.status <> 'live' then return; end if;
  update public.bt_parts set done_at = coalesce(done_at, now()) where match_id = p_m and not kicked;

  -- O'rinlar: avval to'g'ri javoblar (ball), tenglikda umumiy vaqt. O'yindan chiqib ketganlar oxirida.
  with o as (
    select user_id, rank() over (order by (left_at is not null and cur < mm.n_q), score desc, ms asc) pl
    from public.bt_parts where match_id = p_m and not kicked)
  update public.bt_parts pa set place = o.pl from o where pa.match_id = p_m and pa.user_id = o.user_id;

  select count(*), count(*) filter (where place = 1) > 1 into n, tie from public.bt_parts where match_id = p_m and not kicked;

  if mm.rated and n >= 2 then
    for r in
    with p as (
      select pa.user_id u, pa.place pl, py.rating r, py.rated_games g, py.shield sh
      from public.bt_parts pa join public.bt_players py on py.user_id = pa.user_id
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
      k := case when r.g < 20 then 40 else 24 end;
      nr := r.r + round(k * r.s / greatest(r.m, 1))::int;
      lo := public.bt_league(r.r);
      sh := r.sh;
      if nr < public.bt_floor(lo) and sh > 0 then nr := public.bt_floor(lo); sh := sh - 1; end if;   -- ligadan darrov tushib ketmaslik
      if public.bt_league(nr) > lo then sh := 3; end if;                                           -- yangi ligaga chiqqanda 3 o'yin himoya
      nr := greatest(nr, 100);
      update public.bt_players set rating = nr, peak = greatest(peak, nr), rated_games = rated_games + 1, shield = sh,
        wins = wins + (case when mm.kind = 'duel' and r.pl = 1 and not tie then 1 else 0 end),
        losses = losses + (case when mm.kind = 'duel' and r.pl > 1 then 1 else 0 end),
        draws = draws + (case when mm.kind = 'duel' and tie then 1 else 0 end),
        room_games = room_games + (case when mm.kind = 'room' then 1 else 0 end),
        room_wins = room_wins + (case when mm.kind = 'room' and r.pl = 1 then 1 else 0 end),
        room_podiums = room_podiums + (case when mm.kind = 'room' and r.pl <= 3 then 1 else 0 end),
        updated_at = now()
      where user_id = r.u;
      update public.bt_parts set r_before = r.r, r_after = nr, delta = nr - r.r where match_id = p_m and user_id = r.u;
      insert into public.bt_rlog (user_id, match_id, delta, rating) values (r.u, p_m, nr - r.r, nr);
    end loop;

    -- Reytingga qo'shilgan juftliklar yoziladi
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

create or replace function public.bt_try_finish(p_m uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches;
begin
  select * into mm from public.bt_matches where id = p_m;
  if not found or mm.status <> 'live' then return; end if;
  if now() > mm.deadline or not exists (select 1 from public.bt_parts where match_id = p_m and not kicked and done_at is null) then
    perform public.bt_finish(p_m);
  end if;
end $$;

/* ---------- O'yinni boshlash: savollarni tanlash ---------- */
create or replace function public.bt_start_inner(p_m uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches; us uuid[]; lg int; e int; md int; n1 int; n2 int; n3 int; w numeric; got int; tl int; r record; np int;
begin
  select * into mm from public.bt_matches where id = p_m for update;
  if not found or mm.status <> 'lobby' then return; end if;
  select array_agg(user_id) into us from public.bt_parts where match_id = p_m and not kicked;
  np := coalesce(cardinality(us), 0);
  if np < 2 then raise exception 'few_players'; end if;

  -- Qiyinlik aralashmasi (oson/o'rta foizi; qolgani qiyin): liga oshgani sari qiyin savollar ko'payadi
  select public.bt_league(round(avg(coalesce(py.rating, 1000)))::int) into lg
  from unnest(us) x(u) left join public.bt_players py on py.user_id = x.u;
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

/* ---------- Xonadan chiqish ---------- */
create or replace function public.bt_leave_inner(p_m uuid, p_u uuid) returns void language plpgsql security definer set search_path = public as $$
declare mm public.bt_matches; nu uuid;
begin
  select * into mm from public.bt_matches where id = p_m for update;
  if not found then return; end if;
  if mm.status = 'lobby' then
    delete from public.bt_parts where match_id = p_m and user_id = p_u and not kicked;
    if mm.owner = p_u then
      if mm.kind = 'duel' then
        update public.bt_matches set status = 'cancelled', end_reason = 'left' where id = p_m;
      else
        select user_id into nu from public.bt_parts where match_id = p_m and not kicked order by joined_at limit 1;
        if nu is null then update public.bt_matches set status = 'cancelled', end_reason = 'left' where id = p_m;
        else update public.bt_matches set owner = nu where id = p_m; end if;
      end if;
    end if;
  elsif mm.status = 'live' then
    update public.bt_parts set left_at = now(), done_at = coalesce(done_at, now()), shown_at = null
    where match_id = p_m and user_id = p_u and not kicked;
    perform public.bt_try_finish(p_m);
  end if;
end $$;

create or replace function public.bt_leave_lobbies(p_u uuid, p_except uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select m.id from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
           where pa.user_id = p_u and not pa.kicked and m.status = 'lobby' and m.id is distinct from p_except loop
    perform public.bt_leave_inner(r.id, p_u);
  end loop;
end $$;

-- Tugallanmagan jonli o'yin bo'lsa, yangisini boshlab bo'lmaydi
create or replace function public.bt_busy(p_u uuid) returns void language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  for mid in select m.id from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
             where pa.user_id = p_u and m.status = 'live' and pa.done_at is null and not pa.kicked loop
    perform public.bt_try_finish(mid);
  end loop;
  select m.id into mid from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
  where pa.user_id = p_u and m.status = 'live' and pa.done_at is null and not pa.kicked limit 1;
  if mid is not null then raise exception 'busy:%', mid; end if;
end $$;

/* ---------- Ochiq RPC: xona / duel yaratish ---------- */
create or replace function public.bt_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); v_kind text := coalesce(p->>'kind', 'room'); v_vis text := coalesce(p->>'vis', 'closed');
  v_lang text := coalesce(p->>'lang', 'uz'); v_course int := (p->>'course')::int; v_sub text := nullif(p->>'subject', '');
  v_top text := nullif(p->>'topic', ''); v_n int := coalesce((p->>'n_q')::int, 10); v_rev text := coalesce(p->>'reveal', 'instant');
  v_diff text := coalesce(p->>'diff', 'auto'); v_cap int := coalesce((p->>'cap')::int, 2); v_inv uuid := nullif(p->>'invitee', '')::uuid;
  v_title text := nullif(trim(coalesce(p->>'title', '')), ''); have int; sn text; tn text; mid uuid; cd text; np record;
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
  insert into public.bt_matches (kind, vis, code, owner, invitee, title, lang, course, subject, subject_name, topic, topic_name, n_q, reveal, diff_mode, cap)
  values (v_kind, v_vis, cd, u, v_inv, v_title, v_lang, v_course, v_sub, sn, v_top, tn, v_n, v_rev, v_diff, v_cap)
  returning id into mid;
  insert into public.bt_parts (match_id, user_id) values (mid, u);
  return jsonb_build_object('id', mid, 'code', cd);
end $$;

/* ---------- Qo'shilish (havola, kod, ochiq xona yoki taklif orqali) ---------- */
create or replace function public.bt_join(p_id uuid, p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches; c text := upper(nullif(trim(coalesce(p_code, '')), '')); n int; pa public.bt_parts;
begin
  perform public.bt_player(u);
  if p_id is not null then select * into mm from public.bt_matches where id = p_id for update;
  elsif c is not null then select * into mm from public.bt_matches where code = c for update;
  else raise exception 'bad'; end if;
  if not found then raise exception 'notfound'; end if;
  select * into pa from public.bt_parts where match_id = mm.id and user_id = u;
  if found and not pa.kicked and pa.left_at is null then return jsonb_build_object('id', mm.id); end if;
  if found and pa.kicked then raise exception 'kicked'; end if;
  if mm.status <> 'lobby' then raise exception 'started'; end if;
  if mm.kind = 'duel' and mm.invitee is not null and mm.created_at < now() - interval '90 seconds' then
    update public.bt_matches set status = 'cancelled', end_reason = 'expired' where id = mm.id;
    raise exception 'expired';
  end if;
  if not (mm.vis = 'open' or c = mm.code or mm.invitee = u) then raise exception 'closed'; end if;
  if mm.kind = 'duel' and mm.invitee is not null and mm.invitee <> u and c is distinct from mm.code then raise exception 'closed'; end if;
  if public.bt_blocked(u, mm.owner) then raise exception 'blocked'; end if;
  perform public.bt_busy(u);
  select count(*) into n from public.bt_parts where match_id = mm.id and not kicked;
  if n >= mm.cap then raise exception 'full'; end if;
  perform public.bt_leave_lobbies(u, mm.id);
  delete from public.bt_queue where user_id = u;
  insert into public.bt_parts (match_id, user_id) values (mm.id, u)
  on conflict (match_id, user_id) do update set left_at = null, joined_at = now();
  if mm.kind = 'duel' and n + 1 >= 2 then perform public.bt_start_inner(mm.id); end if;   -- duel ikkinchi o'yinchi kirishi bilan boshlanadi
  return jsonb_build_object('id', mm.id);
end $$;

create or replace function public.bt_leave(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin perform public.bt_leave_inner(p_id, public.bt_uid()); end $$;

create or replace function public.bt_decline(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid();
begin
  update public.bt_matches set status = 'cancelled', end_reason = 'declined'
  where id = p_id and invitee = u and status = 'lobby' and kind = 'duel';
end $$;

create or replace function public.bt_kick(p_id uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid();
begin
  if not exists (select 1 from public.bt_matches where id = p_id and owner = u and status = 'lobby') or p_user = u then raise exception 'forbidden'; end if;
  update public.bt_parts set kicked = true where match_id = p_id and user_id = p_user;
end $$;

create or replace function public.bt_start(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid();
begin
  if not exists (select 1 from public.bt_matches where id = p_id and owner = u and status = 'lobby') then raise exception 'forbidden'; end if;
  perform public.bt_start_inner(p_id);
end $$;

/* ---------- Joriy savol (har o'yinchiga o'z tartibida) ---------- */
create or replace function public.bt_q(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches; me public.bt_parts; v_ord int; qq public.bt_questions; v_lim int; pm jsonb; v_opts jsonb; el numeric;
begin
  select * into mm from public.bt_matches where id = p_id;
  if not found then raise exception 'notfound'; end if;
  if mm.status = 'lobby' then return jsonb_build_object('status', 'lobby'); end if;
  if mm.status <> 'live' then return jsonb_build_object('status', mm.status, 'done', true); end if;
  if now() > mm.deadline then perform public.bt_finish(p_id); return jsonb_build_object('status', 'done', 'done', true); end if;
  select * into me from public.bt_parts where match_id = p_id and user_id = u and not kicked for update;
  if not found then raise exception 'notin'; end if;
  if me.done_at is not null then return jsonb_build_object('status', 'live', 'done', true); end if;
  if now() < mm.started_at then
    return jsonb_build_object('status', 'live', 'wait_ms', round(extract(epoch from mm.started_at - now()) * 1000));
  end if;
  loop
    if me.cur >= mm.n_q then
      update public.bt_parts set done_at = now(), shown_at = null where match_id = p_id and user_id = u;
      perform public.bt_try_finish(p_id);
      return jsonb_build_object('status', 'live', 'done', true);
    end if;
    v_ord := me.seq[me.cur + 1];
    select mq.lim into v_lim from public.bt_match_q mq where mq.match_id = p_id and mq.ord = v_ord;
    select q.* into qq from public.bt_match_q mq join public.bt_questions q on q.id = mq.qid where mq.match_id = p_id and mq.ord = v_ord;
    if me.shown_at is null then
      me.shown_at := now();
      update public.bt_parts set shown_at = me.shown_at where match_id = p_id and user_id = u;
      exit;
    elsif now() > me.shown_at + make_interval(secs => v_lim + 3) then
      -- Vaqt tugagan: javobsiz (0 ball) yoziladi va keyingisiga o'tiladi
      insert into public.bt_answers (match_id, user_id, pos, ord, qid, picked, score, ok, ms)
      values (p_id, u, me.cur, v_ord, qq.id, '{}', 0, false, v_lim * 1000) on conflict do nothing;
      update public.bt_questions set seen = seen + 1 where id = qq.id;
      me.cur := me.cur + 1; me.shown_at := null; me.ms := me.ms + v_lim * 1000;
      update public.bt_parts set cur = me.cur, shown_at = null, ms = me.ms where match_id = p_id and user_id = u;
    else
      exit;
    end if;
  end loop;
  pm := me.perms -> v_ord;
  select jsonb_agg(qq.opts -> ((pm ->> i)::int) order by i) into v_opts from generate_series(0, jsonb_array_length(pm) - 1) i;
  el := extract(epoch from now() - me.shown_at) * 1000;
  return jsonb_build_object('status', 'live', 'pos', me.cur, 'n', mm.n_q, 'q', qq.q, 'opts', v_opts, 'na', cardinality(qq.ans),
    'lim', v_lim, 'left_ms', greatest(0, round(v_lim * 1000 - el)), 'sub', qq.subject_name, 'topic', qq.topic_name,
    'score', case when mm.reveal = 'instant' then me.score end, 'okn', case when mm.reveal = 'instant' then me.okn end, 'demo', qq.demo);
end $$;

/* ---------- Javob: qisman ball = (to'g'ri tanlangan − xato tanlangan) / to'g'ri javoblar soni ---------- */
create or replace function public.bt_answer(p_id uuid, p_pos int, p_pick int[]) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches; me public.bt_parts; v_ord int; qq public.bt_questions; v_lim int; pm jsonb;
  orig int[]; na int; c int; w int; sc numeric; el numeric; v_ms int; v_ok boolean; corr int[]; x int; nopt int;
begin
  select * into mm from public.bt_matches where id = p_id;
  if not found then raise exception 'notfound'; end if;
  if mm.status <> 'live' then return jsonb_build_object('done', true, 'status', mm.status); end if;
  select * into me from public.bt_parts where match_id = p_id and user_id = u and not kicked for update;
  if not found then raise exception 'notin'; end if;
  if me.done_at is not null or me.cur >= mm.n_q then return jsonb_build_object('done', true); end if;
  if p_pos <> me.cur or me.shown_at is null then raise exception 'stale'; end if;
  v_ord := me.seq[me.cur + 1];
  select mq.lim into v_lim from public.bt_match_q mq where mq.match_id = p_id and mq.ord = v_ord;
  select q.* into qq from public.bt_match_q mq join public.bt_questions q on q.id = mq.qid where mq.match_id = p_id and mq.ord = v_ord;
  pm := me.perms -> v_ord;
  nopt := jsonb_array_length(pm);
  na := cardinality(qq.ans);
  p_pick := coalesce(p_pick, '{}');
  if cardinality(p_pick) > na then raise exception 'bad'; end if;
  orig := '{}';
  foreach x in array p_pick loop
    if x < 0 or x >= nopt then raise exception 'bad'; end if;
    if not ((pm ->> x)::int = any (orig)) then orig := orig || (pm ->> x)::int; end if;
  end loop;
  el := extract(epoch from now() - me.shown_at) * 1000;
  if el > (v_lim + 3) * 1000 then
    sc := 0; orig := '{}';
  else
    select count(*) filter (where o = any (qq.ans)), count(*) filter (where not (o = any (qq.ans))) into c, w from unnest(orig) o;
    sc := round(greatest(0, (c - w)::numeric / na), 2);
  end if;
  v_ok := sc >= 1;
  v_ms := least(round(el)::int, v_lim * 1000);
  insert into public.bt_answers (match_id, user_id, pos, ord, qid, picked, score, ok, ms)
  values (p_id, u, me.cur, v_ord, qq.id, orig::smallint[], sc, v_ok, v_ms);
  update public.bt_questions set seen = seen + 1, okc = okc + sc where id = qq.id;
  update public.bt_parts set cur = cur + 1, shown_at = null, score = score + sc, okn = okn + (case when v_ok then 1 else 0 end), ms = ms + v_ms,
    done_at = case when cur + 1 >= mm.n_q then now() end
  where match_id = p_id and user_id = u;
  if me.cur + 1 >= mm.n_q then perform public.bt_try_finish(p_id); end if;
  if mm.reveal = 'instant' then
    select array_agg(i order by i) into corr from generate_series(0, nopt - 1) i where (pm ->> i)::int = any (qq.ans);
    return jsonb_build_object('score', sc, 'ok', v_ok, 'correct', to_jsonb(corr), 'expl', qq.expl, 'total', me.score + sc,
      'okn', me.okn + (case when v_ok then 1 else 0 end), 'done', me.cur + 1 >= mm.n_q, 'ms', v_ms);
  end if;
  return jsonb_build_object('saved', true, 'done', me.cur + 1 >= mm.n_q);
end $$;
