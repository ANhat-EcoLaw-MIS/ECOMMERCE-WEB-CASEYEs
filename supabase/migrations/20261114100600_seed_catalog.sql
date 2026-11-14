-- M7 · Catalog seed for Shop and Design Studio (the catalog tables are empty on the live project).
-- Data copied from features/shop/catalog.ts (8 cases, 3 accessories) and the Design Studio phone
-- models. Safe to re-run: every insert skips rows that already exist (by slug).
-- Rollback: supabase/rollbacks/20261114100600_seed_catalog.down.sql

-- Phone models: union of Design Studio (custom cases) and Shop (ready-made cases).
insert into public.phone_models (brand, name, slug, custom_price) values
  ('Apple',   'iPhone 16 Pro Max', 'iphone-16-pro-max', 250000),
  ('Apple',   'iPhone 16 Pro',     'iphone-16-pro',     250000),
  ('Apple',   'iPhone 16',         'iphone-16',         250000),
  ('Apple',   'iPhone 15 Pro Max', 'iphone-15-pro-max', 250000),
  ('Apple',   'iPhone 15 Pro',     'iphone-15-pro',     250000),
  ('Apple',   'iPhone 15',         'iphone-15',         250000),
  ('Apple',   'iPhone 14',         'iphone-14',         250000),
  ('Samsung', 'Galaxy S24 Ultra',  'galaxy-s24-ultra',  250000),
  ('Samsung', 'Galaxy S24',        'galaxy-s24',        250000),
  ('Samsung', 'Galaxy S23',        'galaxy-s23',        250000),
  ('Xiaomi',  'Xiaomi 14 Ultra',   'xiaomi-14-ultra',   250000)
on conflict (slug) do nothing;

-- One blank (unprinted case) per phone model, used up by custom designs.
insert into public.inventory_items (kind, name, phone_model_id, quantity_on_hand)
select 'blank', 'Phôi ốp ' || m.name, m.id, 100
from public.phone_models m
where not exists (select 1 from public.inventory_items i where i.kind = 'blank' and i.phone_model_id = m.id);

-- Ready-made products: one stock item per product (shared by its phone-model variants).
create temporary table seed_products (slug text, name text, description text, product_type public.product_type, price integer, stock integer, image text);
insert into seed_products values
  ('lilac-dream',   'Lavender Daydream', 'Một chút mộng mơ dành riêng cho những ngày đầy cảm hứng.', 'case', 289000, 18, '/products/lilac-dream.webp'),
  ('midnight-eyes', 'Midnight Eyes',     'Cá tính không cần quá nhiều lời.',                         'case', 329000, 12, '/products/midnight-eyes.webp'),
  ('bloom-club',    'Bloom Club',        'Những đóa hoa nhỏ mang đến năng lượng tích cực.',           'case', 279000, 23, '/products/bloom-club.webp'),
  ('purple-orbit',  'Purple Orbit',      'Một quỹ đạo tím dành cho những tâm hồn tò mò.',             'case', 349000,  7, '/products/purple-orbit.webp'),
  ('little-love',   'Little Love Notes', 'Một lời nhắn dễ thương theo bạn mỗi ngày.',                 'case', 269000, 15, '/products/little-love.webp'),
  ('noir-muse',     'Noir Muse',         'Sự tinh tế khi bạn chọn khác biệt.',                        'case', 319000, 11, '/products/noir-muse.webp'),
  ('cloud-nine',    'Cloud Nine',        'Nhẹ tênh như đang bước trên mây.',                          'case', 299000, 24, '/products/cloud-nine.webp'),
  ('mono-heart',    'Mono Heart',        'Một biểu tượng nhỏ, một cá tính rất riêng.',                'case', 259000,  0, '/products/mono-heart.webp'),
  ('accessory-magsafe', 'Đế sạc MagSafe CasEYE’s',    'Phụ kiện đi kèm.', 'accessory', 599000, 12, '/products/accessory-magsafe.webp'),
  ('accessory-airpods', 'Case AirPods Bloom',          'Phụ kiện đi kèm.', 'accessory', 199000,  9, '/products/accessory-airpods.webp'),
  ('accessory-strap',   'Dây đeo điện thoại Lavender', 'Phụ kiện đi kèm.', 'accessory',  99000, 16, '/products/accessory-strap.webp'),
  ('gift-hologram',     'Gói quà Hologram & Thiệp viết tay', 'Hộp quà ánh kim kèm thiệp viết tay (tùy chọn ở Thanh toán).', 'accessory', 25000, 999, null);

insert into public.products (slug, name, description, product_type, image_url)
select s.slug, s.name, s.description, s.product_type, s.image from seed_products s
on conflict (slug) do nothing;

insert into public.inventory_items (kind, name, phone_model_id, quantity_on_hand)
select 'trade_good', 'Hàng ' || s.name, null, s.stock
from seed_products s
where not exists (select 1 from public.inventory_items i where i.kind = 'trade_good' and i.name = 'Hàng ' || s.name);

-- Cases: one variant per phone model sold in the Shop. Accessories: one variant without a model.
insert into public.product_variants (product_id, name, phone_model_id, inventory_item_id, price)
select p.id, m.name, m.id, i.id, s.price
from seed_products s
join public.products p on p.slug = s.slug
join public.inventory_items i on i.kind = 'trade_good' and i.name = 'Hàng ' || s.name
join public.phone_models m on m.slug in ('iphone-16-pro-max', 'iphone-16-pro', 'iphone-16', 'iphone-15-pro', 'iphone-15',
                                          'iphone-14', 'galaxy-s24-ultra', 'galaxy-s24', 'galaxy-s23')
where s.product_type = 'case'
on conflict (product_id, phone_model_id) do nothing;

insert into public.product_variants (product_id, name, phone_model_id, inventory_item_id, price)
select p.id, null, null, i.id, s.price
from seed_products s
join public.products p on p.slug = s.slug
join public.inventory_items i on i.kind = 'trade_good' and i.name = 'Hàng ' || s.name
where s.product_type = 'accessory'
  and not exists (select 1 from public.product_variants v where v.product_id = p.id);

drop table seed_products;
