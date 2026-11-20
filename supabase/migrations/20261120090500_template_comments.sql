-- DES · Comments on Design Studio templates ("Bình luận & Góp ý thẩm mỹ" in the template preview).
-- Before: comments lived in a component signal and were lost on reload (audit: INITIAL_REVIEWS).
-- Templates are still the TS catalog (TEMPLATE_CATALOG), so a comment references the template by its
-- text id (e.g. 'tpl-cloud-kittens'); it becomes a FK when the `templates` table exists (P1).
-- Anyone can read; a signed-in customer posts as themselves (user and name are set by the database).
-- Rollback: supabase/rollbacks/20261120090500_template_comments.down.sql

create table public.template_comments (
  id           uuid primary key default gen_random_uuid(),
  template_id  text not null check (template_id ~ '^[a-z0-9-]{1,64}$'),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  author_name  text not null,
  device_model text check (device_model is null or char_length(device_model) <= 60),
  comment      text not null check (char_length(btrim(comment)) between 1 and 1000),
  created_at   timestamptz not null default now()
);
create index template_comments_template_idx on public.template_comments (template_id, created_at desc);

-- The poster is always the signed-in user, shown with their profile name (never a name sent by the browser).
create or replace function public.set_template_comment_author()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), 'Khách hàng') into new.author_name
  from public.profiles p where p.id = new.user_id;
  new.author_name := coalesce(new.author_name, 'Khách hàng');
  new.comment := btrim(new.comment);
  new.created_at := now();
  return new;
end;
$$;

create trigger template_comments_set_author
  before insert on public.template_comments
  for each row execute function public.set_template_comment_author();

alter table public.template_comments enable row level security;

create policy "anyone reads template comments" on public.template_comments
  for select to anon, authenticated using (true);
create policy "customers post as themselves" on public.template_comments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "authors delete own comments" on public.template_comments
  for delete to authenticated using (user_id = (select auth.uid()));

-- user_id is not exposed to the API (the public sees the profile name only).
revoke all on public.template_comments from anon, authenticated;
grant select (id, template_id, author_name, device_model, comment, created_at) on public.template_comments to anon, authenticated;
grant insert (template_id, device_model, comment) on public.template_comments to authenticated;
grant delete on public.template_comments to authenticated;
