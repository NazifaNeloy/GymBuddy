-- GymBuddy: logged workouts and their sets.

create table public.workouts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade default auth.uid(),
  routine_id        uuid references public.routines (id) on delete set null,
  routine_day_index smallint check (routine_day_index between 0 and 6),
  name              text not null check (char_length(name) between 1 and 60),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  notes             text check (char_length(notes) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  synced_at         timestamptz not null default now(),
  constraint workouts_end_after_start check (ended_at is null or ended_at >= started_at)
);

comment on table public.workouts is 'A training session. ended_at null = still in progress.';

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index workouts_user_synced_idx on public.workouts (user_id, synced_at);
create index workouts_routine_idx on public.workouts (routine_id);

create table public.workout_sets (
  id               uuid primary key default gen_random_uuid(),
  workout_id       uuid not null references public.workouts (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade default auth.uid(),
  exercise_id      uuid not null references public.exercises (id) on delete restrict,
  exercise_order   smallint not null default 0 check (exercise_order >= 0),
  set_number       smallint not null check (set_number between 1 and 50),
  reps             smallint not null default 0 check (reps between 0 and 200),
  weight_kg        numeric(6, 2) not null default 0 check (weight_kg between 0 and 1000),
  duration_seconds integer check (duration_seconds between 0 and 36000),
  rpe              numeric(3, 1) check (rpe between 1 and 10),
  is_warmup        boolean not null default false,
  completed_at     timestamptz,
  -- Epley estimated 1RM, only for working sets of 1-12 reps with load.
  estimated_1rm_kg numeric(7, 2) generated always as (
                     case
                       when not is_warmup and reps between 1 and 12 and weight_kg > 0
                         then round(weight_kg * (1 + reps / 30.0), 2)
                     end
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  synced_at        timestamptz not null default now()
);

comment on table public.workout_sets is
  'One logged set. Weight is always stored in kg; the app converts for lb users.';
comment on column public.workout_sets.estimated_1rm_kg is
  'Epley: weight_kg * (1 + reps/30). Null for warm-ups, 0 kg, or more than 12 reps.';

create index workout_sets_workout_idx on public.workout_sets (workout_id, exercise_order, set_number);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, completed_at desc);
create index workout_sets_user_synced_idx on public.workout_sets (user_id, synced_at);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);

create trigger workouts_row_guard
  before insert or update on public.workouts
  for each row execute function public.sync_row_guard();

create trigger workout_sets_row_guard
  before insert or update on public.workout_sets
  for each row execute function public.sync_row_guard();

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

-- workouts ------------------------------------------------------------------
create policy "workouts: read own"
  on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workouts: insert own"
  on public.workouts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
      where r.id = routine_id and (r.user_id is null or r.user_id = (select auth.uid()))))
  );

create policy "workouts: update own"
  on public.workouts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
      where r.id = routine_id and (r.user_id is null or r.user_id = (select auth.uid()))))
  );

create policy "workouts: delete own"
  on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

-- workout_sets ----------------------------------------------------------------
create policy "workout_sets: read own"
  on public.workout_sets for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workout_sets: insert own"
  on public.workout_sets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "workout_sets: update own"
  on public.workout_sets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "workout_sets: delete own"
  on public.workout_sets for delete to authenticated
  using (user_id = (select auth.uid()));
