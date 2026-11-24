
/* Test battle 6: rasmli savollar (qo'llanmadagi makro/mikropreparat rasmlari) */
alter table public.bt_questions add column if not exists img text;
alter table public.bt_questions drop constraint if exists bt_questions_img_check;
alter table public.bt_questions add constraint bt_questions_img_check
  check (img is null or img ~ '^data/img/[a-z0-9]+/[A-Za-z0-9_.-]+\.(webp|png|jpe?g)$');

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
    'score', case when mm.reveal = 'instant' then me.score end, 'okn', case when mm.reveal = 'instant' then me.okn end, 'demo', qq.demo, 'img', qq.img);
end $$;

create or replace function public.bt_review(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public.bt_uid(); mm public.bt_matches;
begin
  select * into mm from public.bt_matches where id = p_id;
  if not found then raise exception 'notfound'; end if;
  if mm.status <> 'done' then raise exception 'not_done'; end if;
  if not exists (select 1 from public.bt_parts where match_id = p_id and user_id = u) then raise exception 'notin'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('pos', a.pos, 'q', q.q, 'opts', q.opts, 'ans', to_jsonb(q.ans), 'picked', to_jsonb(a.picked),
      'score', a.score, 'ok', a.ok, 'ms', a.ms, 'expl', q.expl, 'sub', q.subject_name, 'topic', q.topic_name, 'img', q.img) order by a.pos), '[]'::jsonb)
    from public.bt_answers a join public.bt_questions q on q.id = a.qid where a.match_id = p_id and a.user_id = u);
end $$;

create or replace function public.bt_admin_list(p_lang text, p_subject text, p_q text, p_off int, p_lim int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.course, x.subject, x.topic_ord, x.id), '[]'::jsonb) from (
    select id, lang, course, subject, subject_name, topic, topic_name, topic_ord, q, opts, ans, expl, diff, demo, active, seen, round(okc, 1) okc, pair_key, img
    from public.bt_questions
    where (p_lang is null or lang = p_lang) and (p_subject is null or subject = p_subject)
      and (p_q is null or q ilike '%' || p_q || '%')
    order by course, subject, topic_ord, id offset greatest(coalesce(p_off, 0), 0) limit least(coalesce(p_lim, 50), 5000)) x);
end $$;
