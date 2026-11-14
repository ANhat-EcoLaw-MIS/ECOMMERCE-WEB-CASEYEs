-- Rollback M6
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('order-jobs');
  end if;
end;
$$;
drop function if exists public.run_order_jobs();
