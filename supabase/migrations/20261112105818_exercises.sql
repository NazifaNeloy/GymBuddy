-- GymBuddy: exercise library.
-- Built-in exercises have user_id = null and are readable by everyone (including
-- signed-out users browsing the library). Users may also add private custom exercises.

create table public.exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete cascade default auth.uid(),
  slug              text unique,
  name              text not null check (char_length(name) between 1 and 80),
  primary_muscle    text not null check (primary_muscle in (
                      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
                      'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body', 'cardio')),
  secondary_muscles text[] not null default '{}',
  equipment         text not null check (equipment in (
                      'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
                      'kettlebell', 'band', 'other')),
  category          text not null default 'compound'
                      check (category in ('compound', 'isolation', 'cardio')),
  tracking          text not null default 'weight_reps'
                      check (tracking in ('weight_reps', 'bodyweight_reps', 'duration')),
  instructions      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  synced_at         timestamptz not null default now(),
  -- Only built-in exercises carry a slug.
  constraint exercises_slug_builtin_only check (slug is null or user_id is null)
);

comment on table public.exercises is
  'Exercise library. user_id null = built-in (public); otherwise a private custom exercise.';

create unique index exercises_custom_name_unique
  on public.exercises (user_id, lower(name))
  where user_id is not null and deleted_at is null;
create index exercises_primary_muscle_idx on public.exercises (primary_muscle);
create index exercises_user_synced_idx on public.exercises (user_id, synced_at);

create trigger exercises_row_guard
  before insert or update on public.exercises
  for each row execute function public.sync_row_guard();

alter table public.exercises enable row level security;

create policy "exercises: read built-in and own"
  on public.exercises for select to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "exercises: insert own custom"
  on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "exercises: update own custom"
  on public.exercises for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "exercises: delete own custom"
  on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));
