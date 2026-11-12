-- GymBuddy: routines (workout templates) and their exercises.
-- A routine can span several days, e.g. Push/Pull/Legs has days {Push, Pull, Legs}.
-- Starter routines have user_id = null and are readable by all signed-in users;
-- users copy one into their own account (source_template_id) to edit it.

create table public.routines (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete cascade default auth.uid(),
  name               text not null check (char_length(name) between 1 and 60),
  description        text check (char_length(description) <= 500),
  days               text[] not null default array['Day 1']
                       check (cardinality(days) between 1 and 7),
  is_template        boolean generated always as (user_id is null) stored,
  source_template_id uuid references public.routines (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  synced_at          timestamptz not null default now()
);

comment on table public.routines is
  'Workout plans. user_id null = starter template; days[] holds the day names of a split.';

create index routines_user_synced_idx on public.routines (user_id, synced_at);

create table public.routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references public.routines (id) on delete cascade,
  user_id         uuid references auth.users (id) on delete cascade default auth.uid(),
  exercise_id     uuid not null references public.exercises (id) on delete restrict,
  day_index       smallint not null default 0 check (day_index between 0 and 6),
  position        smallint not null default 0 check (position >= 0),
  target_sets     smallint not null default 3 check (target_sets between 1 and 20),
  target_reps_min smallint not null default 8 check (target_reps_min between 1 and 100),
  target_reps_max smallint not null default 12 check (target_reps_max between 1 and 100),
  rest_seconds    smallint not null default 90 check (rest_seconds between 0 and 900),
  notes           text check (char_length(notes) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  synced_at       timestamptz not null default now(),
  constraint routine_exercises_rep_range check (target_reps_min <= target_reps_max)
);

comment on table public.routine_exercises is
  'Exercises in a routine day, with targets. For duration exercises, reps are seconds.';

create index routine_exercises_routine_idx on public.routine_exercises (routine_id, day_index, position);
create index routine_exercises_exercise_idx on public.routine_exercises (exercise_id);
create index routine_exercises_user_synced_idx on public.routine_exercises (user_id, synced_at);

create trigger routines_row_guard
  before insert or update on public.routines
  for each row execute function public.sync_row_guard();

create trigger routine_exercises_row_guard
  before insert or update on public.routine_exercises
  for each row execute function public.sync_row_guard();

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;

-- routines ------------------------------------------------------------------
create policy "routines: read templates and own"
  on public.routines for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "routines: insert own"
  on public.routines for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "routines: update own"
  on public.routines for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "routines: delete own"
  on public.routines for delete to authenticated
  using (user_id = (select auth.uid()));

-- routine_exercises -----------------------------------------------------------
-- Writes must point at a routine the user owns and an exercise the user can see.
create policy "routine_exercises: read templates and own"
  on public.routine_exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "routine_exercises: insert own"
  on public.routine_exercises for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "routine_exercises: update own"
  on public.routine_exercises for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "routine_exercises: delete own"
  on public.routine_exercises for delete to authenticated
  using (user_id = (select auth.uid()));
