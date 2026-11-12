-- GymBuddy: body measurements/photos and personal records.

create table public.body_stats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  measured_on  date not null default current_date,
  weight_kg    numeric(5, 2) check (weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 75),
  -- Object path inside the private "progress-photos" bucket: {user_id}/{uuid}.jpg
  photo_path   text,
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz not null default now(),
  constraint body_stats_has_value
    check (weight_kg is not null or body_fat_pct is not null or photo_path is not null),
  constraint body_stats_photo_in_own_folder
    check (photo_path is null or photo_path like (user_id::text || '/%'))
);

comment on table public.body_stats is 'Body-weight log entries and progress photo references.';

create index body_stats_user_measured_idx on public.body_stats (user_id, measured_on desc);
create index body_stats_user_synced_idx on public.body_stats (user_id, synced_at);

create table public.personal_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade default auth.uid(),
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  record_type    text not null
                   check (record_type in ('max_weight', 'max_reps', 'max_e1rm', 'max_volume')),
  value          numeric(9, 2) not null check (value >= 0),
  weight_kg      numeric(6, 2),
  reps           smallint,
  workout_set_id uuid references public.workout_sets (id) on delete set null,
  achieved_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now(),
  constraint personal_records_one_per_type unique (user_id, exercise_id, record_type)
);

comment on table public.personal_records is
  'Best result per user, exercise and record type. Computed on the device (works offline) and synced.';
comment on column public.personal_records.value is
  'max_weight/max_e1rm: kg. max_reps: reps in one set. max_volume: weight_kg * reps in one set.';

create index personal_records_user_synced_idx on public.personal_records (user_id, synced_at);
create index personal_records_exercise_idx on public.personal_records (exercise_id);
create index personal_records_set_idx on public.personal_records (workout_set_id);

create trigger body_stats_row_guard
  before insert or update on public.body_stats
  for each row execute function public.sync_row_guard();

create trigger personal_records_row_guard
  before insert or update on public.personal_records
  for each row execute function public.sync_row_guard();

alter table public.body_stats enable row level security;
alter table public.personal_records enable row level security;

-- body_stats ------------------------------------------------------------------
create policy "body_stats: read own"
  on public.body_stats for select to authenticated
  using (user_id = (select auth.uid()));

create policy "body_stats: insert own"
  on public.body_stats for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "body_stats: update own"
  on public.body_stats for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "body_stats: delete own"
  on public.body_stats for delete to authenticated
  using (user_id = (select auth.uid()));

-- personal_records --------------------------------------------------------------
create policy "personal_records: read own"
  on public.personal_records for select to authenticated
  using (user_id = (select auth.uid()));

create policy "personal_records: insert own"
  on public.personal_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "personal_records: update own"
  on public.personal_records for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "personal_records: delete own"
  on public.personal_records for delete to authenticated
  using (user_id = (select auth.uid()));
