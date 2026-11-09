-- npx supabase migration new profiles_rls_policies
create policy "profiles_select_own" on public.profiles
  for select to authenticated
               using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
               using (auth.uid() = id)
      with check (auth.uid() = id);
