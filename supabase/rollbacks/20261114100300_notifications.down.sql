-- Rollback M4
drop function if exists public.notify(uuid, text, text, text, text);
drop table if exists public.notifications;
