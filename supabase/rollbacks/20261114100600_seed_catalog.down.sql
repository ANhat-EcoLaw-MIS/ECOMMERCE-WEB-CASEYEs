-- Rollback M7: remove the seeded catalog (only rows created by the seed; fails if an order uses them).
delete from public.product_variants v using public.products p
where v.product_id = p.id and p.slug in ('lilac-dream', 'midnight-eyes', 'bloom-club', 'purple-orbit', 'little-love', 'noir-muse',
                                         'cloud-nine', 'mono-heart', 'accessory-magsafe', 'accessory-airpods', 'accessory-strap', 'gift-hologram');
delete from public.products where slug in ('lilac-dream', 'midnight-eyes', 'bloom-club', 'purple-orbit', 'little-love', 'noir-muse',
                                           'cloud-nine', 'mono-heart', 'accessory-magsafe', 'accessory-airpods', 'accessory-strap', 'gift-hologram');
delete from public.inventory_items where kind = 'trade_good' and name like 'Hàng %';
delete from public.inventory_items where kind = 'blank' and name like 'Phôi ốp %';
delete from public.phone_models m
where m.slug in ('iphone-16-pro-max', 'iphone-16-pro', 'iphone-16', 'iphone-15-pro-max', 'iphone-15-pro', 'iphone-15',
                 'iphone-14', 'galaxy-s24-ultra', 'galaxy-s24', 'galaxy-s23', 'xiaomi-14-ultra')
  and not exists (select 1 from public.designs d where d.phone_model_id = m.id);
