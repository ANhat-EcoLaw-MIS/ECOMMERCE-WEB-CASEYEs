create table public.test (id uuid primary key default gen_random_uuid(), title text not null);
alter table public.test enable row level security;
create policy "anyone signed in can read" on public.test for select to authenticated using (true);
create policy "signed in can add"        on public.test for insert to authenticated with check (true);
