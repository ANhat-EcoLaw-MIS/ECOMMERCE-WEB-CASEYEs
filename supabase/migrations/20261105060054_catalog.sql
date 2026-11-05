-- Shopping module: products the shop sells.
-- A product is the "what" (name, photos). A variant is the "which one + how much".

create table public.products (
                               id           uuid primary key default gen_random_uuid(),
                               slug         text not null unique,
                               name         text not null,
                               description  text not null default '',
                               product_type public.product_type not null,
                               image_url    text,                                  -- main photo (cards, cart, order snapshot)
                               gallery_urls text[] not null default '{}',          -- extra photos for the detail page
                               is_active    boolean not null default true,
                               created_at   timestamptz not null default now()
);

create table public.product_variants (
                                       id                uuid primary key default gen_random_uuid(),
                                       product_id        uuid not null references public.products (id) on delete cascade,
                                       name              text,                             -- label, e.g. "iPhone 15" or "Black"
                                       phone_model_id    uuid references public.phone_models (id),  -- null if it fits no specific phone
                                       inventory_item_id uuid not null references public.inventory_items (id),  -- what buying this uses up
                                       price             integer not null check (price >= 0),
                                       is_active         boolean not null default true,
                                       created_at        timestamptz not null default now(),
                                       unique (product_id, phone_model_id)
);

create index product_variants_product_idx on public.product_variants (product_id);
