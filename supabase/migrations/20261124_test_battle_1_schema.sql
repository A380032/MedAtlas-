-- ALVORA Med — Test battle (1/3): universitetlar, savollar banki, o'yin jadvallari.
-- Barcha bt_* jadvallarda RLS yoqilgan va siyosat yo'q: ularga faqat server funksiyalari (SECURITY DEFINER) orqali kiriladi.

/* ---------- Universitetlar ---------- */
create table if not exists public.universities (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name_uz text not null,
  name_en text not null,
  region_uz text,
  region_en text,
  kind text not null check (kind in ('davlat', 'xususiy', 'xorijiy', 'boshqa')),
  sort int not null default 100,
  active boolean not null default true
);
alter table public.universities enable row level security;
drop policy if exists universities_read on public.universities;
create policy universities_read on public.universities for select to anon, authenticated using (active);

insert into public.universities (id, name_uz, name_en, region_uz, region_en, kind, sort) values
 ('tdtu', 'Toshkent davlat tibbiyot universiteti', 'Tashkent State Medical University', 'Toshkent shahri', 'Tashkent', 'davlat', 1),
 ('tdtu-termiz', 'Toshkent davlat tibbiyot universiteti Termiz filiali', 'Tashkent State Medical University, Termez branch', 'Surxondaryo viloyati', 'Surkhandarya region', 'davlat', 2),
 ('tdtu-chirchiq', 'Toshkent davlat tibbiyot universiteti Chirchiq filiali', 'Tashkent State Medical University, Chirchik branch', 'Toshkent viloyati', 'Tashkent region', 'davlat', 3),
 ('sdtu', 'Samarqand davlat tibbiyot universiteti', 'Samarkand State Medical University', 'Samarqand viloyati', 'Samarkand region', 'davlat', 4),
 ('adti', 'Andijon davlat tibbiyot instituti', 'Andijan State Medical Institute', 'Andijon viloyati', 'Andijan region', 'davlat', 5),
 ('bdti', 'Buxoro davlat tibbiyot instituti', 'Bukhara State Medical Institute', 'Buxoro viloyati', 'Bukhara region', 'davlat', 6),
 ('fjsti', 'Farg‘ona jamoat salomatligi tibbiyot instituti', 'Fergana Medical Institute of Public Health', 'Farg‘ona viloyati', 'Fergana region', 'davlat', 7),
 ('udti', 'Urganch davlat tibbiyot instituti', 'Urgench State Medical Institute', 'Xorazm viloyati', 'Khorezm region', 'davlat', 8),
 ('qqti', 'Qoraqalpog‘iston tibbiyot instituti', 'Karakalpakstan Medical Institute', 'Qoraqalpog‘iston Respublikasi', 'Republic of Karakalpakstan', 'davlat', 9),
 ('tfi', 'Toshkent farmatsevtika instituti', 'Tashkent Pharmaceutical Institute', 'Toshkent shahri', 'Tashkent', 'davlat', 10),
 ('namdu', 'Namangan davlat universiteti', 'Namangan State University', 'Namangan viloyati', 'Namangan region', 'davlat', 11),
 ('navdu', 'Navoiy davlat universiteti', 'Navoi State University', 'Navoiy viloyati', 'Navoi region', 'davlat', 12),
 ('qardu', 'Qarshi davlat universiteti', 'Karshi State University', 'Qashqadaryo viloyati', 'Kashkadarya region', 'davlat', 13),
 ('guldu', 'Guliston davlat universiteti', 'Gulistan State University', 'Sirdaryo viloyati', 'Syrdarya region', 'davlat', 14),
 ('jdpu', 'Jizzax davlat pedagogika universiteti', 'Jizzakh State Pedagogical University', 'Jizzax viloyati', 'Jizzakh region', 'davlat', 15),
 ('kiut', 'Toshkent Kimyo xalqaro universiteti', 'Kimyo International University in Tashkent', 'Toshkent shahri', 'Tashkent', 'xususiy', 30),
 ('cau', 'Central Asian University', 'Central Asian University', 'Toshkent shahri', 'Tashkent', 'xususiy', 31),
 ('camu', 'Central Asian Medical University', 'Central Asian Medical University', 'Farg‘ona viloyati', 'Fergana region', 'xususiy', 32),
 ('emu', 'EMU University (Yevropa tibbiyot universiteti)', 'EMU University (European Medical University)', 'Toshkent shahri', 'Tashkent', 'xususiy', 33),
 ('alfraganus', 'Alfraganus universiteti', 'Alfraganus University', 'Toshkent shahri', 'Tashkent', 'xususiy', 34),
 ('ftti', 'Farmatsevtika ta’lim va tadqiqot instituti', 'Institute of Pharmaceutical Education and Research', 'Toshkent shahri', 'Tashkent', 'xususiy', 35),
 ('impuls', 'Impuls tibbiyot instituti', 'Impuls Medical Institute', 'Toshkent viloyati', 'Tashkent region', 'xususiy', 36),
 ('zarmed', 'Zarmed universiteti', 'Zarmed University', 'Samarqand viloyati', 'Samarkand region', 'xususiy', 37),
 ('biti', 'Buxoro innovatsion ta’lim va tibbiyot universiteti', 'Bukhara Innovative Education and Medical University', 'Buxoro viloyati', 'Bukhara region', 'xususiy', 38),
 ('oxu', 'Osiyo xalqaro universiteti', 'Asia International University', 'Buxoro viloyati', 'Bukhara region', 'xususiy', 39),
 ('angren', 'Angren universiteti', 'Angren University', 'Toshkent viloyati', 'Tashkent region', 'xususiy', 40),
 ('turon', 'Turon universiteti', 'Turon University', 'Toshkent shahri', 'Tashkent', 'xususiy', 41),
 ('ubs', 'University of Business and Science', 'University of Business and Science', 'Namangan viloyati', 'Namangan region', 'xususiy', 42),
 ('tisu', 'Termiz iqtisodiyot va servis universiteti', 'Termez University of Economics and Service', 'Surxondaryo viloyati', 'Surkhandarya region', 'xususiy', 43),
 ('ranch', 'Urganch RANCH texnologiya universiteti', 'Urgench RANCH University of Technology', 'Xorazm viloyati', 'Khorezm region', 'xususiy', 44),
 ('kokand-andijon', 'Qo‘qon universiteti Andijon filiali', 'Kokand University, Andijan branch', 'Andijon viloyati', 'Andijan region', 'xususiy', 45),
 ('kfu-jizzax', 'Qozon (Volgabo‘yi) federal universiteti Jizzax filiali', 'Kazan (Volga Region) Federal University, Jizzakh branch', 'Jizzax viloyati', 'Jizzakh region', 'xorijiy', 60),
 ('pirogov', 'N.I. Pirogov nomidagi Rossiya milliy tadqiqot tibbiyot universiteti Toshkent filiali', 'Pirogov Russian National Research Medical University, Tashkent branch', 'Toshkent shahri', 'Tashkent', 'xorijiy', 61),
 ('boshqa', 'Boshqa oliygoh', 'Other institution', null, null, 'boshqa', 999)
on conflict (id) do update set name_uz = excluded.name_uz, name_en = excluded.name_en, region_uz = excluded.region_uz,
  region_en = excluded.region_en, kind = excluded.kind, sort = excluded.sort;

alter table public.profiles add column if not exists university text references public.universities(id) on update cascade on delete set null;
alter table public.profiles add column if not exists university_at timestamptz;

/* Universitetni oyiga bir martadan ko'p o'zgartirib bo'lmaydi (reytingni aldab o'tkazmaslik uchun). Birinchi tanlash erkin. */
create or replace function public.profiles_univ_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.university is distinct from old.university then
    if new.university is not null and old.university_at is not null
       and old.university_at > now() - interval '30 days' and not public.is_admin() then
      raise exception 'univ_locked:%', to_char((old.university_at + interval '30 days') at time zone 'Asia/Tashkent', 'YYYY-MM-DD');
    end if;
    new.university_at := case when new.university is null then old.university_at else now() end;
  else
    new.university_at := old.university_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_univ_guard on public.profiles;
create trigger profiles_univ_guard before update on public.profiles for each row execute function public.profiles_univ_guard();

/* ---------- Savollar banki (faqat administrator ko'radi) ---------- */
create table if not exists public.bt_questions (
  id bigint generated always as identity primary key,
  lang text not null check (lang in ('uz', 'en')),
  course smallint not null check (course between 1 and 6),
  subject text not null check (length(subject) between 1 and 40),
  subject_name text not null,
  topic text not null check (length(topic) between 1 and 60),
  topic_name text not null,
  topic_ord int not null default 0,
  q text not null check (length(q) between 3 and 2000),
  opts jsonb not null check (jsonb_typeof(opts) = 'array' and jsonb_array_length(opts) between 2 and 8),
  ans smallint[] not null check (cardinality(ans) between 1 and 5),
  expl text,
  diff smallint not null default 2 check (diff between 1 and 3),
  demo boolean not null default false,
  pair_key text,
  src text,
  hash text unique,
  seen int not null default 0,
  okc numeric not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bt_questions_pool on public.bt_questions (lang, course, subject, topic) where active;
alter table public.bt_questions enable row level security;
drop policy if exists bt_questions_admin on public.bt_questions;
create policy bt_questions_admin on public.bt_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

/* ---------- O'yinchilar (reyting) ---------- */
create table if not exists public.bt_players (
  user_id uuid primary key references auth.users on delete cascade,
  rating int not null default 1000,
  peak int not null default 1000,
  rated_games int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  room_games int not null default 0,
  room_wins int not null default 0,
  room_podiums int not null default 0,
  games int not null default 0,
  shield smallint not null default 0,
  invisible boolean not null default false,
  no_invites boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bt_players_rating on public.bt_players (rating desc) where rated_games > 0;
create index if not exists bt_players_seen on public.bt_players (last_seen desc);
alter table public.bt_players enable row level security;

/* ---------- O'yinlar ---------- */
create table if not exists public.bt_matches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('duel', 'room')),
  vis text not null default 'closed' check (vis in ('open', 'closed')),
  code text unique,
  owner uuid references auth.users on delete set null,
  invitee uuid references auth.users on delete set null,
  title text check (title is null or length(title) <= 60),
  lang text not null check (lang in ('uz', 'en')),
  course smallint not null,
  subject text,
  subject_name text,
  topic text,
  topic_name text,
  n_q smallint not null check (n_q between 1 and 30),
  reveal text not null default 'instant' check (reveal in ('instant', 'end')),
  diff_mode text not null default 'auto' check (diff_mode in ('auto', '1', '2', '3', 'mix')),
  cap smallint not null default 2 check (cap between 2 and 50),
  status text not null default 'lobby' check (status in ('lobby', 'live', 'done', 'cancelled')),
  end_reason text,
  ranked boolean not null default false,
  rated boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  deadline timestamptz,
  finished_at timestamptz
);
create index if not exists bt_matches_open on public.bt_matches (status, vis, lang, created_at desc);
create index if not exists bt_matches_invitee on public.bt_matches (invitee, status) where invitee is not null;
create index if not exists bt_matches_owner on public.bt_matches (owner, created_at desc);
alter table public.bt_matches enable row level security;

create table if not exists public.bt_match_q (
  match_id uuid not null references public.bt_matches on delete cascade,
  ord smallint not null,
  qid bigint not null references public.bt_questions on delete cascade,
  lim smallint not null,
  primary key (match_id, ord)
);
alter table public.bt_match_q enable row level security;

create table if not exists public.bt_parts (
  match_id uuid not null references public.bt_matches on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  kicked boolean not null default false,
  seq smallint[],
  perms jsonb,
  cur smallint not null default 0,
  shown_at timestamptz,
  score numeric(7, 2) not null default 0,
  okn smallint not null default 0,
  ms int not null default 0,
  done_at timestamptz,
  left_at timestamptz,
  place smallint,
  r_before int,
  r_after int,
  delta int,
  primary key (match_id, user_id)
);
create index if not exists bt_parts_user on public.bt_parts (user_id, joined_at desc);
alter table public.bt_parts enable row level security;

create table if not exists public.bt_answers (
  match_id uuid not null,
  user_id uuid not null,
  pos smallint not null,
  ord smallint not null,
  qid bigint not null references public.bt_questions on delete cascade,
  picked smallint[] not null default '{}',
  score numeric(4, 2) not null default 0,
  ok boolean not null default false,
  ms int not null default 0,
  at timestamptz not null default now(),
  primary key (match_id, user_id, pos),
  foreign key (match_id, user_id) references public.bt_parts (match_id, user_id) on delete cascade
);
create index if not exists bt_answers_seen on public.bt_answers (user_id, qid, at desc);
alter table public.bt_answers enable row level security;

/* Bir juftlik orasidagi reytingli o'yinlar (7 kunda 2 tadan ortig'i reytingga qo'shilmaydi) */
create table if not exists public.bt_pairs (
  a uuid not null references auth.users on delete cascade,
  b uuid not null references auth.users on delete cascade,
  match_id uuid references public.bt_matches on delete cascade,
  at timestamptz not null default now()
);
create index if not exists bt_pairs_ab on public.bt_pairs (a, b, at desc);
alter table public.bt_pairs enable row level security;

/* Reyting tarixi (haftalik va oylik reyting uchun) */
create table if not exists public.bt_rlog (
  user_id uuid not null references auth.users on delete cascade,
  match_id uuid references public.bt_matches on delete cascade,
  delta int not null,
  rating int not null,
  at timestamptz not null default now()
);
create index if not exists bt_rlog_at on public.bt_rlog (at desc, user_id);
create index if not exists bt_rlog_user on public.bt_rlog (user_id, at desc);
alter table public.bt_rlog enable row level security;

/* Tasodifiy raqib qidirish navbati */
create table if not exists public.bt_queue (
  user_id uuid primary key references auth.users on delete cascade,
  lang text not null,
  course smallint not null,
  subject text,
  topic text,
  n_q smallint not null,
  rating int not null,
  at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  match_id uuid references public.bt_matches on delete set null
);
alter table public.bt_queue enable row level security;

/* Bloklash (taklif va raqib bo'lishni to'xtatadi) */
create table if not exists public.bt_blocks (
  user_id uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked)
);
alter table public.bt_blocks enable row level security;

revoke all on public.bt_questions, public.bt_players, public.bt_matches, public.bt_match_q, public.bt_parts,
  public.bt_answers, public.bt_pairs, public.bt_rlog, public.bt_queue, public.bt_blocks from anon;
revoke all on public.bt_players, public.bt_matches, public.bt_match_q, public.bt_parts,
  public.bt_answers, public.bt_pairs, public.bt_rlog, public.bt_queue, public.bt_blocks from authenticated;
