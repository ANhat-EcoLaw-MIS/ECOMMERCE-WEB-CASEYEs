-- Rollback M8: back to exact-role checks (M1 version).
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
