-- Rollback P1-1 (subset): drop the profile fields (their values are lost; every profile row stays).
revoke insert (phone, birth_date, gender, deletion_requested_at) on public.profiles from authenticated;
revoke update (phone, birth_date, gender, deletion_requested_at) on public.profiles from authenticated;
drop trigger if exists profiles_check_birth_date on public.profiles;
drop function if exists public.check_profile_birth_date();
drop index if exists public.profiles_phone_key;
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles
  drop column if exists phone,
  drop column if exists birth_date,
  drop column if exists gender,
  drop column if exists deletion_requested_at;
