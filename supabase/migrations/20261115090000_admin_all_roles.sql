-- M8 · One back-office account is enough for the demo: 'admin' may run Operator and CSKH actions too.
-- Rollback: supabase/rollbacks/20261115090000_admin_all_roles.down.sql

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
  if public.current_app_role() = 'admin' or public.current_app_role() = any (p_roles) then
    return;
  end if;
  raise exception 'forbidden';
end;
$$;
