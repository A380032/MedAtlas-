-- Telefon raqamni @alvoramed_bot orqali tasdiqlash (tg-bot funksiyasi bilan). 2026-11-16 da qo'llangan.
alter table public.login_phones add column if not exists verified boolean not null default false;

create table if not exists public.phone_verify (
  code text primary key check (code ~ '^[a-z0-9]{16,40}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  tg_id text not null,
  lang text not null default 'uz',
  status text not null default 'new' check (status in ('new', 'started', 'done', 'failed')),
  phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phone_verify_tg_idx on public.phone_verify (tg_id, created_at desc);
create index if not exists phone_verify_user_idx on public.phone_verify (user_id);
alter table public.phone_verify enable row level security;
-- Siyosat yo'q: jadvalga faqat server (Edge Function, service role) kiradi.
revoke all on public.phone_verify from anon, authenticated;
