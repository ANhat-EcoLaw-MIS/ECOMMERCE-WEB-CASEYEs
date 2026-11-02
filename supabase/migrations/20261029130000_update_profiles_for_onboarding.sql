-- Move the old automatically-created profile rows to the onboarding model.
-- These rows were created at sign-up, so they do not prove onboarding was completed.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.profiles
  add column onboarding_status text;

-- Keep existing users' profiles, marking them as skipped because their onboarding
-- completion state was not recorded by the old schema.
update public.profiles
set onboarding_status = 'skipped';

alter table public.profiles
  alter column onboarding_status set not null,
  add constraint profiles_onboarding_status_check
    check (onboarding_status in ('completed', 'skipped')),
  add column updated_at timestamptz not null default now(),
  drop column status;

-- Refresh updated_at whenever an existing profile changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Rebuild the profile policies so users can only manage their own row.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

create policy "read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Anonymous users have no table privileges. Authenticated users get only the
-- operations and columns needed by onboarding and profile editing.
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, device_type, preferences, onboarding_status)
  on public.profiles to authenticated;
grant update (display_name, avatar_url, device_type, preferences, onboarding_status)
  on public.profiles to authenticated;
