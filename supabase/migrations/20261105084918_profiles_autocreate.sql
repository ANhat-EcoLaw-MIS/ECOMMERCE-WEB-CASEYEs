create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
insert into public.profiles (id, display_name, avatar_url)
values (
         new.id,
         coalesce(
           nullif(new.raw_user_meta_data ->> 'full_name', ''),
           nullif(new.raw_user_meta_data ->> 'name', ''),
           split_part(new.email, '@', 1)
         ),
         coalesce(
           new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
       )
  on conflict (id) do nothing;
return new;
end;
$$;

update public.profiles p
set
  display_name = coalesce(
    p.display_name,
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(u.email, '@', 1)
                 ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
  from auth.users u
where u.id = p.id
  and (p.display_name is null or p.avatar_url is null);
