-- P0-1 · Onboarding status "pending" (Spec B1, FR-AUTH-EX-13, BR-PM-07).
-- Before: onboarding_status NOT NULL, no default, CHECK (completed, skipped), and handle_new_user()
-- did not set it, so a sign-up on a database built from the migrations failed, while the app
-- relies on 'pending'. Existing rows keep their value; nothing is deleted.
-- Idempotent on purpose: the live project may already have a default added by hand.
-- Rollback: supabase/rollbacks/20261120090000_profiles_onboarding_pending.down.sql

alter table public.profiles drop constraint if exists profiles_onboarding_status_check;
alter table public.profiles
  add constraint profiles_onboarding_status_check
    check (onboarding_status in ('pending', 'completed', 'skipped'));
alter table public.profiles alter column onboarding_status set default 'pending';

-- New accounts start in onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, onboarding_status)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
