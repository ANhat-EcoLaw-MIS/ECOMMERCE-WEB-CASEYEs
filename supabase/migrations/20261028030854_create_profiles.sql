create table public.profiles (
                               id           uuid primary key references auth.users(id) on delete cascade,
                               display_name text,
                               avatar_url   text,
                               device_type  text,
                               preferences  text[] not null default '{}',
                               status       text not null default 'ACTIVE' check (status in ('ACTIVE','LOCKED','BANNED')),
                               created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"   on public.profiles for select using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update
                                                            using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- users may edit personal fields but never their own status
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar_url, device_type, preferences) on public.profiles to authenticated;

-- auto-create a profile whenever Supabase creates a user
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
insert into public.profiles (id, display_name, avatar_url)
values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
