-- Rollback P0-1: back to CHECK (completed, skipped) without a default.
-- Rows still 'pending' become 'skipped' (same choice as 20261029130000 for unknown state).
update public.profiles set onboarding_status = 'skipped' where onboarding_status = 'pending';

alter table public.profiles drop constraint if exists profiles_onboarding_status_check;
alter table public.profiles
  add constraint profiles_onboarding_status_check
    check (onboarding_status in ('completed', 'skipped'));
alter table public.profiles alter column onboarding_status drop default;

-- Previous body (20261105084918_profiles_autocreate.sql).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
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
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
