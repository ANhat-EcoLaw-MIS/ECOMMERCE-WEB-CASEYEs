-- Rollback: remove template comments (the comments themselves are lost).
drop table if exists public.template_comments;
drop function if exists public.set_template_comment_author();
