-- ALVORA Med — Test battle (3/3): holat, reyting jadvallari, onlayn ro'yxat, raqib qidirish, administrator funksiyalari, huquqlar.

/* ---------- Fan va mavzular katalogi (javoblarsiz, faqat savollar soni) ---------- */
create or replace function public.bt_catalog(p_lang text) returns jsonb language sql stable security definer set search_path = public as $$
  with t as (
    select course, subject, max(subject_name) sname, topic, max(topic_name) tname, min(topic_ord) tord, count(*) n
    from public.bt_questions where active and lang = p_lang group by course, subject, topic),
  s as (
    select course, subject, max(sname) sname, sum(n)::int n,
      jsonb_agg(jsonb_build_object('id', topic, 'name', tname, 'n', n) order by tord, tname) topics
    from t group by course, subject)
  select coalesce(jsonb_agg(jsonb_build_object('course', course, 'id', subject, 'name', sname, 'n', n, 'topics', topics) order by course, sname), '[]'::jsonb)
  from s $$;

/* ---------- O'yin holati (lobbi, jonli jadval, natija) ---------- */
create or replace function public.bt_state(p_id uuid, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches; inm boolean; hide boolean; pl jsonb; me jsonb;
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
  select coalesce(jsonb_agg(public.bt_pj(pa.user_id, p_lang) || jsonb_build_object(
      'cur', pa.cur, 'score', case when hide then null else pa.score end, 'okn', case when hide then null else pa.okn end,
      'ms', pa.ms, 'done', pa.done_at is not null, 'left', pa.left_at is not null, 'place', pa.place,
      'delta', pa.delta, 'r_after', pa.r_after, 'owner', pa.user_id = mm.owner, 'me', pa.user_id = u)
    order by case when mm.status = 'done' then pa.place end nulls last, pa.score desc, pa.ms, pa.joined_at), '[]'::jsonb)
  into pl from public.bt_parts pa where pa.match_id = p_id and not pa.kicked and (mm.status <> 'lobby' or pa.left_at is null);
  return jsonb_build_object('id', mm.id, 'kind', mm.kind, 'vis', mm.vis, 'code', case when inm or mm.vis = 'open' or mm.invitee = u then mm.code end,
    'title', mm.title, 'lang', mm.lang, 'course', mm.course, 'subject', mm.subject, 'sname', mm.subject_name, 'topic', mm.topic, 'tname', mm.topic_name,
    'n_q', mm.n_q, 'reveal', mm.reveal, 'diff', mm.diff_mode, 'cap', mm.cap, 'status', mm.status, 'reason', mm.end_reason,
    'ranked', mm.ranked, 'rated', mm.rated, 'owner', mm.owner, 'invitee', case when mm.invitee is not null then public.bt_pj(mm.invitee, p_lang) end,
    'is_owner', mm.owner = u, 'in', inm, 'created_at', mm.created_at, 'started_at', mm.started_at, 'deadline', mm.deadline,
    'finished_at', mm.finished_at, 'now', now(), 'parts', pl);
end $$;

/* ---------- O'yindan keyin: xatolarni ko'rish (o'yin to'liq tugagandan keyingina) ---------- */
create or replace function public.bt_review(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches;
begin
  select * into mm from public.bt_matches where id = p_id;
  if not found then raise exception 'notfound'; end if;
  if mm.status <> 'done' then raise exception 'not_done'; end if;
  if not exists (select 1 from public.bt_parts where match_id = p_id and user_id = u) then raise exception 'notin'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('pos', a.pos, 'q', q.q, 'opts', q.opts, 'ans', to_jsonb(q.ans), 'picked', to_jsonb(a.picked),
      'score', a.score, 'ok', a.ok, 'ms', a.ms, 'expl', q.expl, 'sub', q.subject_name, 'topic', q.topic_name) order by a.pos), '[]'::jsonb)
    from public.bt_answers a join public.bt_questions q on q.id = a.qid where a.match_id = p_id and a.user_id = u);
end $$;

/* ---------- Yurak urishi: onlayn holat, kelgan takliflar, davom etayotgan o'yin ---------- */
create or replace function public.bt_ping(p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mid uuid; inv jsonb; s public.bt_players;
begin
  perform public.bt_player(u);
  update public.bt_players set last_seen = now() where user_id = u returning * into s;
  for mid in select m.id from public.bt_parts pa join public.bt_matches m on m.id = pa.match_id
             where pa.user_id = u and m.status = 'live' and m.deadline < now() loop
    perform public.bt_finish(mid);
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', public.bt_pj(m.owner, p_lang), 'course', m.course, 'sname', m.subject_name,
      'tname', m.topic_name, 'n_q', m.n_q, 'left_s', greatest(0, 90 - extract(epoch from now() - m.created_at)::int)) order by m.created_at desc), '[]'::jsonb)
  into inv from public.bt_matches m
  where m.invitee = u and m.status = 'lobby' and m.kind = 'duel' and m.created_at > now() - interval '90 seconds'
    and not exists (select 1 from public.bt_parts pa where pa.match_id = m.id and pa.user_id = u);
  return jsonb_build_object('invites', inv, 'active', public.bt_active(u), 'invisible', s.invisible, 'no_invites', s.no_invites);
end $$;

create or replace function public.bt_settings(p_invisible boolean, p_no_invites boolean) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid();
begin
  perform public.bt_player(u);
  update public.bt_players set invisible = coalesce(p_invisible, invisible), no_invites = coalesce(p_no_invites, no_invites), updated_at = now() where user_id = u;
end $$;

create or replace function public.bt_block(p_user uuid, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid();
begin
  if p_user = u then raise exception 'bad'; end if;
  if p_on then insert into public.bt_blocks (user_id, blocked) values (u, p_user) on conflict do nothing;
  else delete from public.bt_blocks where user_id = u and blocked = p_user; end if;
end $$;

/* ---------- Onlayn o'yinchilar va ism bo'yicha qidiruv (taklif uchun) ---------- */
create or replace function public.bt_online(p_q text, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); qq text := nullif(trim(coalesce(p_q, '')), ''); res jsonb; cnt int;
begin
  select count(*) into cnt from public.bt_players where last_seen > now() - interval '150 seconds' and not invisible;
  if qq is null or length(qq) < 2 then
    select coalesce(jsonb_agg(x.j order by x.ls desc), '[]'::jsonb) into res from (
      select public.bt_pj(py.user_id, p_lang) || jsonb_build_object('online', true, 'busy', public.bt_active(py.user_id) is not null,
        'no_inv', py.no_invites) j, py.last_seen ls
      from public.bt_players py
      where py.last_seen > now() - interval '150 seconds' and not py.invisible and py.user_id <> u and not public.bt_blocked(u, py.user_id)
      order by py.last_seen desc limit 60) x;
  else
    select coalesce(jsonb_agg(x.j order by x.onl desc, x.nm), '[]'::jsonb) into res from (
      select public.bt_pj(pr.id, p_lang) || jsonb_build_object('online', coalesce(py.last_seen > now() - interval '150 seconds' and not py.invisible, false),
        'busy', public.bt_active(pr.id) is not null, 'no_inv', coalesce(py.no_invites, false)) j,
        coalesce(py.last_seen > now() - interval '150 seconds' and not py.invisible, false) onl, pr.name nm
      from public.profiles pr left join public.bt_players py on py.user_id = pr.id
      where pr.id <> u and pr.name ilike '%' || replace(replace(qq, '%', ''), '_', '') || '%' and not public.bt_blocked(u, pr.id)
      limit 30) x;
  end if;
  return jsonb_build_object('count', cnt, 'rows', res);
end $$;

/* ---------- O'yinchi kartochkasi ---------- */
create or replace function public.bt_profile(p_user uuid, p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); t uuid := coalesce(p_user, u); py public.bt_players; ra int; ru int; un text;
begin
  perform public.bt_player(t);
  select * into py from public.bt_players where user_id = t;
  select university into un from public.profiles where id = t;
  select count(*) + 1 into ra from public.bt_players where rated_games > 0 and rating > py.rating;
  select count(*) + 1 into ru from public.bt_players x join public.profiles p on p.id = x.user_id
    where un is not null and p.university = un and x.rated_games > 0 and x.rating > py.rating;
  return public.bt_pj(t, p_lang) || jsonb_build_object('peak', py.peak, 'wins', py.wins, 'losses', py.losses, 'draws', py.draws,
    'room_games', py.room_games, 'room_wins', py.room_wins, 'room_podiums', py.room_podiums, 'games', py.games,
    'rank', case when py.rated_games > 0 then ra end, 'rank_uni', case when py.rated_games > 0 and un is not null then ru end,
    'online', t = u or (py.last_seen > now() - interval '150 seconds' and not py.invisible), 'me', t = u,
    'blocked', exists (select 1 from public.bt_blocks where user_id = u and blocked = t), 'no_inv', py.no_invites,
    'shield', case when t = u then py.shield end);
end $$;

/* ---------- Battle bosh sahifasi ---------- */
create or replace function public.bt_home(p_lang text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); rooms jsonb; onl int; srch int;
begin
  perform public.bt_player(u);
  update public.bt_players set last_seen = now() where user_id = u;
  update public.bt_matches set status = 'cancelled', end_reason = 'expired'
  where status = 'lobby' and created_at < now() - interval '30 minutes';
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'course', m.course, 'sname', m.subject_name, 'tname', m.topic_name,
      'n_q', m.n_q, 'cap', m.cap, 'reveal', m.reveal, 'n', (select count(*) from public.bt_parts pa where pa.match_id = m.id and not pa.kicked and pa.left_at is null),
      'owner', public.bt_pj(m.owner, p_lang)) order by m.created_at desc), '[]'::jsonb)
  into rooms from public.bt_matches m
  where m.status = 'lobby' and m.vis = 'open' and m.kind = 'room' and m.lang = p_lang and not public.bt_blocked(u, m.owner);
  select count(*) into onl from public.bt_players where last_seen > now() - interval '150 seconds' and not invisible;
  select count(*) into srch from public.bt_queue where match_id is null and seen_at > now() - interval '10 seconds';
  return jsonb_build_object('me', public.bt_profile(u, p_lang), 'rooms', rooms, 'online', onl, 'searching', srch,
    'active', public.bt_active(u), 'admin', public.is_admin(),
    'set', (select jsonb_build_object('invisible', invisible, 'no_invites', no_invites) from public.bt_players where user_id = u));
end $$;

/* ---------- Reyting jadvallari: umumiy, universitetim, universitetlar (hafta / oy / barcha vaqt) ---------- */
create or replace function public.bt_top(p_tab text, p_period text, p_uni text, p_q text, p_off int, p_lim int, p_lang text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); since timestamptz; myuni text; rows jsonb; mine jsonb; tot int; lim int := least(greatest(coalesce(p_lim, 50), 1), 100);
  off int := greatest(coalesce(p_off, 0), 0); qq text := nullif(trim(coalesce(p_q, '')), '');
begin
  since := case p_period when 'week' then now() - interval '7 days' when 'month' then now() - interval '30 days' else null end;
  select university into myuni from public.profiles where id = u;
  if p_tab = 'unis' then
    with v as (
      select pr.university uni, case when since is null then py.rating else coalesce((select sum(l.delta) from public.bt_rlog l where l.user_id = py.user_id and l.at >= since), 0) end val
      from public.bt_players py join public.profiles pr on pr.id = py.user_id
      where pr.university is not null and pr.university <> 'boshqa' and py.rated_games > 0
        and (since is null or exists (select 1 from public.bt_rlog l where l.user_id = py.user_id and l.at >= since))),
    r as (select uni, val, row_number() over (partition by uni order by val desc) rn, count(*) over (partition by uni) cnt from v),
    a as (select uni, round(avg(val))::int score, max(cnt)::int players from r where rn <= 10 group by uni having max(cnt) >= 5),
    k as (select a.*, rank() over (order by score desc) pos from a)
    select coalesce(jsonb_agg(jsonb_build_object('pos', k.pos, 'uni', k.uni, 'name', case when p_lang = 'en' then un.name_en else un.name_uz end,
        'region', case when p_lang = 'en' then un.region_en else un.region_uz end, 'score', k.score, 'players', k.players, 'mine', k.uni = myuni) order by k.pos), '[]'::jsonb),
      (select jsonb_build_object('pos', k2.pos, 'score', k2.score, 'players', k2.players) from k k2 where k2.uni = myuni),
      count(*)
    into rows, mine, tot from k join public.universities un on un.id = k.uni;
    return jsonb_build_object('tab', 'unis', 'rows', rows, 'me', mine, 'total', tot, 'my_uni', myuni);
  end if;

  if p_tab = 'uni' then myuni := coalesce(nullif(p_uni, ''), myuni);
    if myuni is null then return jsonb_build_object('tab', 'uni', 'rows', '[]'::jsonb, 'me', null, 'total', 0, 'no_uni', true); end if;
  end if;
  with v as (
    select py.user_id, py.wins, py.losses, py.draws, py.rated_games,
      case when since is null then py.rating else coalesce((select sum(l.delta) from public.bt_rlog l where l.user_id = py.user_id and l.at >= since), 0) end val,
      case when since is null then py.rated_games else (select count(*) from public.bt_rlog l where l.user_id = py.user_id and l.at >= since) end g
    from public.bt_players py join public.profiles pr on pr.id = py.user_id
    where py.rated_games > 0 and (p_tab <> 'uni' or pr.university = myuni)
      and (since is null or exists (select 1 from public.bt_rlog l where l.user_id = py.user_id and l.at >= since))),
  k as (select v.*, rank() over (order by val desc) pos from v),
  f as (select k.* from k join public.profiles pr on pr.id = k.user_id
        where qq is null or pr.name ilike '%' || replace(replace(qq, '%', ''), '_', '') || '%')
  select (select coalesce(jsonb_agg(public.bt_pj(x.user_id, p_lang) || jsonb_build_object('pos', x.pos, 'val', x.val, 'g', x.g, 'wins', x.wins,
            'losses', x.losses, 'draws', x.draws, 'me', x.user_id = u) order by x.pos, x.user_id), '[]'::jsonb)
          from (select * from f order by pos, user_id offset off limit lim) x),
         (select jsonb_build_object('pos', k2.pos, 'val', k2.val, 'g', k2.g) from k k2 where k2.user_id = u),
         (select count(*) from f)
  into rows, mine, tot;
  return jsonb_build_object('tab', coalesce(p_tab, 'all'), 'rows', rows, 'me', mine, 'total', tot, 'uni', myuni,
    'uname', (select case when p_lang = 'en' then name_en else name_uz end from public.universities where id = myuni));
end $$;

/* ---------- Tasodifiy raqib qidirish (ruh raqibsiz: faqat haqiqiy onlayn o'yinchilar) ---------- */
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
  insert into public.bt_matches (kind, vis, code, owner, lang, course, subject, subject_name, topic, topic_name, n_q, cap, ranked)
  values ('duel', 'closed', public.bt_code(), op.user_id, me.lang, me.course, me.subject, sn, me.topic, tn, me.n_q, 2, true) returning id into mid;
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
  select rating into rt from public.bt_players where user_id = u;
  delete from public.bt_queue where at < now() - interval '10 minutes' or (match_id is null and seen_at < now() - interval '30 seconds');
  insert into public.bt_queue (user_id, lang, course, subject, topic, n_q, rating) values (u, v_lang, v_course, v_sub, v_top, v_n, rt)
  on conflict (user_id) do update set lang = excluded.lang, course = excluded.course, subject = excluded.subject, topic = excluded.topic,
    n_q = excluded.n_q, rating = excluded.rating, at = now(), seen_at = now(), match_id = null;
  mid := public.bt_qmatch(u);
  if mid is not null then delete from public.bt_queue where user_id = u; end if;
  return jsonb_build_object('match', mid, 'waiting', mid is null);
end $$;

create or replace function public.bt_queue_poll() returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); me public.bt_queue; mid uuid; same int;
begin
  update public.bt_queue set seen_at = now() where user_id = u returning * into me;
  if not found then return jsonb_build_object('gone', true, 'active', public.bt_active(u)); end if;
  update public.bt_players set last_seen = now() where user_id = u;
  mid := coalesce(me.match_id, public.bt_qmatch(u));
  if mid is not null then delete from public.bt_queue where user_id = u; return jsonb_build_object('match', mid); end if;
  select count(*) into same from public.bt_queue q where q.user_id <> u and q.match_id is null and q.seen_at > now() - interval '10 seconds' and q.lang = me.lang;
  return jsonb_build_object('waiting', true, 'secs', extract(epoch from now() - me.at)::int, 'others', same);
end $$;

create or replace function public.bt_queue_leave() returns void language plpgsql security definer set search_path = public as $$
begin delete from public.bt_queue where user_id = public.bt_uid() and match_id is null; end $$;

/* ---------- Administrator: savollar banki (faqat ilova egasi) ---------- */
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
    'players', (select count(*) from public.bt_players where games > 0));
end $$;

create or replace function public.bt_admin_list(p_lang text, p_subject text, p_q text, p_off int, p_lim int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.course, x.subject, x.topic_ord, x.id), '[]'::jsonb) from (
    select id, lang, course, subject, subject_name, topic, topic_name, topic_ord, q, opts, ans, expl, diff, demo, active, seen, round(okc, 1) okc, pair_key
    from public.bt_questions
    where (p_lang is null or lang = p_lang) and (p_subject is null or subject = p_subject)
      and (p_q is null or q ilike '%' || p_q || '%')
    order by course, subject, topic_ord, id offset greatest(coalesce(p_off, 0), 0) limit least(coalesce(p_lim, 50), 5000)) x);
end $$;

create or replace function public.bt_admin_set(p_id bigint, p_active boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.bt_questions set active = p_active where id = p_id;
end $$;

/* ---------- Huquqlar: ichki funksiyalar faqat server ichida, ochiqlari faqat hisobga kirganlarga ---------- */
do $$
declare f record;
begin
  for f in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'bt\_%' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('bt_create', 'bt_join', 'bt_leave', 'bt_decline', 'bt_kick', 'bt_start', 'bt_q', 'bt_answer', 'bt_state', 'bt_review',
                     'bt_ping', 'bt_settings', 'bt_block', 'bt_online', 'bt_profile', 'bt_home', 'bt_top', 'bt_catalog',
                     'bt_queue_join', 'bt_queue_poll', 'bt_queue_leave', 'bt_admin_overview', 'bt_admin_list', 'bt_admin_set',
                     'bt_lim', 'bt_league', 'bt_floor', 'bt_effdiff') then
      execute format('grant execute on function %s to authenticated', f.sig);
    else
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
  end loop;
end $$;
revoke all on function public.profiles_univ_guard() from public, anon, authenticated;
alter function public.bt_lim(int) set search_path = public;
alter function public.bt_league(int) set search_path = public;
alter function public.bt_floor(int) set search_path = public;
alter function public.bt_effdiff(int, numeric, smallint) set search_path = public;
