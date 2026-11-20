-- Rollback M1: profiles keeps all its data; only the role column and helpers go away.
drop function if exists public.require_role(text[]);
drop function if exists public.is_staff();
drop function if exists public.current_app_role();
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop column if exists role;
