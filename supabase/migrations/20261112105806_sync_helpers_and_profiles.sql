-- GymBuddy: shared sync helpers and user profiles.
--
-- Sync model (see CLAUDE.md):
--   * Clients generate UUID primary keys offline.
--   * Clients own `updated_at`; an UPDATE carrying an older `updated_at` than the
--     stored row is silently skipped (last write wins).
--   * The server stamps `synced_at` on every write so clients can pull
--     "everything changed since my last sync" with one indexed query.

create or replace function public.sync_row_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Last write wins: ignore stale updates coming from an older offline edit.
    if new.updated_at < old.updated_at then
      return null;
    end if;
    -- Rows can never be moved to another owner.
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id cannot be changed';
    end if;
  end if;
  new.synced_at := now();
  return new;
end;
$$;

comment on function public.sync_row_guard() is
  'BEFORE INSERT/UPDATE trigger: last-write-wins on updated_at, immutable owner, stamps synced_at.';

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text check (char_length(display_name) <= 60),
  avatar_path          text,
  unit_system          text not null default 'kg' check (unit_system in ('kg', 'lb')),
  theme                text not null default 'system' check (theme in ('system', 'light', 'dark')),
  experience_level     text not null default 'beginner'
                         check (experience_level in ('beginner', 'intermediate', 'advanced')),
  goal                 text check (goal in ('strength', 'muscle', 'general_fitness', 'weight_loss')),
  weekly_target        smallint not null default 3 check (weekly_target between 1 and 7),
  reminders_enabled    boolean not null default false,
  reminder_time        time,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  synced_at            timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings and onboarding answers. Row id = auth.users.id.';

-- profiles has no user_id column, so it gets its own small guard.
create or replace function public.profiles_row_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := now();
  return new;
end;
$$;

create trigger profiles_row_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_row_guard();

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: insert own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Create a profile automatically when someone signs up (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
