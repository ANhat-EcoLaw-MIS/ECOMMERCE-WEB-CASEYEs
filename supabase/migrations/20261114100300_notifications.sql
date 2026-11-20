-- M4 · One notification table for the whole app (order, design, payment, support).
-- Rows belong to the customer (deleted with the profile). Customers read their own rows and can
-- only set read_at; rows are created by triggers / RPCs through public.notify().
-- Rollback: supabase/rollbacks/20261114100300_notifications.down.sql

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in ('order', 'design', 'payment', 'support')),
  title      text not null,
  body       text not null,
  link       text,                                  -- in-app route, e.g. /order-tracking/CC-261114-0001
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Realtime: the header bell listens for new rows of the signed-in user.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

create or replace function public.notify(p_user_id uuid, p_type text, p_title text, p_body text, p_link text default null)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
