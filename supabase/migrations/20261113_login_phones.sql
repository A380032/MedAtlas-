create table if not exists public.login_phones (
  phone text primary key check (phone ~ '^[0-9]{9,15}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.login_phones enable row level security;
-- Siyosat yo'q: jadvalga faqat server (service role, Edge Function) kira oladi.
revoke all on public.login_phones from anon, authenticated;
