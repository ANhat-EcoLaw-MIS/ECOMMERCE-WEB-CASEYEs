-- M1 · Staff roles on profiles (profiles already holds real users: additive only).
-- Every existing profile gets role = 'customer' through the default; nothing else changes.
-- Customers cannot change their own role: the existing column grant
--   update (display_name, avatar_url, device_type, preferences, onboarding_status)
-- does not include "role".
-- Rollback: supabase/rollbacks/20261114100000_profiles_role.down.sql

alter table public.profiles
  add column if not exists role text not null default 'customer';

alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'operator', 'cskh', 'admin'));

-- Role of the signed-in user ('customer' when unknown).
create or replace function public.current_app_role()
  returns text
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'customer');
$$;

create or replace function public.is_staff()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select public.current_app_role() in ('operator', 'cskh', 'admin');
$$;

-- Raises unless the caller has one of the roles (the service role, used by Edge Functions
-- and pg_cron jobs, is always allowed).
create or replace function public.require_role(variadic p_roles text[])
  returns void
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return;
  end if;
  if not (public.current_app_role() = any (p_roles)) then
    raise exception 'forbidden';
  end if;
end;
$$;

revoke execute on function public.current_app_role()        from public, anon;
revoke execute on function public.is_staff()                from public, anon;
revoke execute on function public.require_role(text[])      from public, anon;
grant  execute on function public.current_app_role()        to authenticated;
grant  execute on function public.is_staff()                to authenticated;
grant  execute on function public.require_role(text[])      to authenticated;
