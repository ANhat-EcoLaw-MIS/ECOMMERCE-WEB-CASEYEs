-- Image buckets. Both are public-read so image URLs work directly in <img>.
--   product-images : shop photos. Upload by staff (dashboard), so no write policy.
--   design-assets  : customer uploads and preview PNGs, stored under "<user id>/...".

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true),
       ('design-assets',  'design-assets',  true)
  on conflict (id) do nothing;

create policy "public reads product images"
  on storage.objects for select using (bucket_id = 'product-images');

create policy "public reads design assets"
  on storage.objects for select using (bucket_id = 'design-assets');

create policy "users upload into own design folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'design-assets'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users update own design files"
  on storage.objects for update to authenticated
                                         using (bucket_id = 'design-assets'
                                         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own design files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'design-assets'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
