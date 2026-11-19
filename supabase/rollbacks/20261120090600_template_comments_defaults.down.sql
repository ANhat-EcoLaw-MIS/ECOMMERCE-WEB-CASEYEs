-- Rollback: remove the column defaults (the trigger keeps setting both values).
alter table public.template_comments alter column user_id drop default;
alter table public.template_comments alter column author_name drop default;
