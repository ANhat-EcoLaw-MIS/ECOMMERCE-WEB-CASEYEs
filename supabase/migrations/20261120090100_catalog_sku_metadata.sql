-- P0-2 · Catalog schema for "artwork × phone-model SKU" (Spec B5, CD-SH Product / ProductVariant).
-- The Shop sells an artwork printed on a phone-model SKU (colour / case type). Stock is counted per
-- SKU blank (decision Q2): every shop variant of that SKU and every custom design on it uses up the
-- same blank. Additive only: existing rows and the one-blank-per-model rows stay valid.
-- Rollback: supabase/rollbacks/20261120090100_catalog_sku_metadata.down.sql

-- ---------------------------------------------------------------- products: shop metadata
alter table public.products
  add column if not exists collection text,
  add column if not exists category   text,                          -- accessories: MagSafe / Dây đeo / Charm
  add column if not exists styles     text[] not null default '{}',
  add column if not exists tags       text[] not null default '{}',
  add column if not exists badge      text,
  add column if not exists caption    text,
  add column if not exists finish     text,
  add column if not exists premium    integer not null default 0,     -- artwork surcharge on top of the SKU price
  add column if not exists art_url    text;

alter table public.products drop constraint if exists products_premium_check;
alter table public.products add constraint products_premium_check check (premium >= 0);
alter table public.products drop constraint if exists products_badge_check;
alter table public.products add constraint products_badge_check
  check (badge is null or badge in ('BEST SELLER', 'NEW DROP', 'LIMITED', 'HOT'));

-- ---------------------------------------------------------------- phone models: 3D viewer
alter table public.phone_models
  add column if not exists has_3d_model boolean not null default false,
  add column if not exists model_3d_url text;

-- ---------------------------------------------------------------- inventory: one blank per SKU
alter table public.inventory_items
  add column if not exists sku_code   text,                           -- e.g. sku-ip15pm-titanium (null = legacy model-level blank)
  add column if not exists case_type  text,
  add column if not exists color_name text,
  add column if not exists color_hex  text;

create unique index if not exists inventory_items_sku_code_key on public.inventory_items (sku_code);

drop index if exists public.one_blank_per_phone_model;
create unique index if not exists one_blank_per_model_sku
  on public.inventory_items (phone_model_id, coalesce(sku_code, ''))
  where kind = 'blank';

-- ---------------------------------------------------------------- variants: one per (product, model, SKU)
alter table public.product_variants
  add column if not exists color_sku text;                            -- = inventory_items.sku_code of the blank it uses

alter table public.product_variants drop constraint if exists product_variants_product_id_phone_model_id_key;
create unique index if not exists product_variants_product_model_sku_key
  on public.product_variants (product_id, coalesce(phone_model_id::text, ''), coalesce(color_sku, ''));
create index if not exists product_variants_phone_model_idx on public.product_variants (phone_model_id);
