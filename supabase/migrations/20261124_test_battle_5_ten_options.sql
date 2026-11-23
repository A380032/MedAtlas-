/* Test battle 5: 10 tagacha variant (5 to'g'ri javobli savollar uchun) */
alter table public.bt_questions drop constraint if exists bt_questions_opts_check;
alter table public.bt_questions add constraint bt_questions_opts_check
  check (jsonb_typeof(opts) = 'array' and jsonb_array_length(opts) between 2 and 10);
