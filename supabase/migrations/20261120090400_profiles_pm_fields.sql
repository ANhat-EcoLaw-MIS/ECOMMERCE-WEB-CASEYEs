-- P1-1 (subset) · Profile fields the account page already collects (Spec CD-PM Profile, B19).
-- phone, birth_date, gender and the account-deletion request were shown on /account but had no
-- column, so they were reset to empty on every visit. Additive only; existing rows get nulls.
-- Rollback: supabase/rollbacks/20261120090400_profiles_pm_fields.down.sql

alter table public.profiles
  add column if not exists phone                 text,
  add column if not exists birth_date            date,
  add column if not exists gender                text,
  add column if not exists deletion_requested_at timestamptz;

-- BR-PM-05: Vietnamese mobile number, stored without spaces; one account per number.
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check check (phone is null or phone ~ '^0(3|5|7|8|9)[0-9]{8}$');
create unique index if not exists profiles_phone_key on public.profiles (phone) where phone is not null;

-- FR-PM-13: stored values male / female / other.
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender is null or gender in ('male', 'female', 'other'));

-- BR-PM-06: at least 13 years old and not in the future (checked on write; the date moves, so not a CHECK).
create or replace function public.check_profile_birth_date()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > (current_date - interval '13 years')::date then
    raise exception 'birth_date_too_young';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_check_birth_date on public.profiles;
create trigger profiles_check_birth_date
  before insert or update of birth_date on public.profiles
  for each row execute function public.check_profile_birth_date();

-- Customers edit their own values (role stays out of the grant, as before).
grant insert (phone, birth_date, gender, deletion_requested_at) on public.profiles to authenticated;
grant update (phone, birth_date, gender, deletion_requested_at) on public.profiles to authenticated;
