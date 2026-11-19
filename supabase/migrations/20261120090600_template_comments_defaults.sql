-- Defaults for the columns the trigger fills in (set_template_comment_author), so the generated
-- database.types.ts marks them optional on insert: the browser sends only template_id, comment and
-- device_model. The trigger still overrides both values (the author is always the signed-in user).
-- Rollback: supabase/rollbacks/20261120090600_template_comments_defaults.down.sql

alter table public.template_comments alter column user_id set default auth.uid();
alter table public.template_comments alter column author_name set default '';
