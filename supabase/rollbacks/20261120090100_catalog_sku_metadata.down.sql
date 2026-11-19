-- Rollback P0-2. Run after the seed v2 rollback (it removes the per-SKU rows first);
-- the old unique keys can only come back when each model has one blank and one variant per product.
drop index if exists public.product_variants_phone_model_idx;
drop index if exists public.product_variants_product_model_sku_key;
alter table public.product_variants drop column if exists color_sku;
alter table public.product_variants
  add constraint product_variants_product_id_phone_model_id_key unique (product_id, phone_model_id);

drop index if exists public.one_blank_per_model_sku;
drop index if exists public.inventory_items_sku_code_key;
alter table public.inventory_items
  drop column if exists sku_code,
  drop column if exists case_type,
  drop column if exists color_name,
  drop column if exists color_hex;
create unique index if not exists one_blank_per_phone_model
  on public.inventory_items (phone_model_id)
  where kind = 'blank';

alter table public.phone_models
  drop column if exists has_3d_model,
  drop column if exists model_3d_url;

alter table public.products drop constraint if exists products_badge_check;
alter table public.products drop constraint if exists products_premium_check;
alter table public.products
  drop column if exists collection,
  drop column if exists category,
  drop column if exists styles,
  drop column if exists tags,
  drop column if exists badge,
  drop column if exists caption,
  drop column if exists finish,
  drop column if exists premium,
  drop column if exists art_url;
