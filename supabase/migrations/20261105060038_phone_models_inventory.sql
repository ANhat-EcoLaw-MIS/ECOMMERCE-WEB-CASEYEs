-- Phone models (shared reference) + back-room inventory.
-- Prices are whole VND (integer).

create table public.phone_models (
                                   id              uuid primary key default gen_random_uuid(),
                                   brand           text not null,
                                   name            text not null,
                                   slug            text not null unique,
                                   custom_price    integer not null check (custom_price >= 0),  -- price of a custom case
                                   mask_image_url  text,                                        -- outline shown in the design studio
                                   is_active       boolean not null default true,
                                   created_at      timestamptz not null default now()
);

-- One table for everything we keep in stock.
--   blank      = unprinted case, exactly one per phone model
--   trade_good = imported accessory sold as-is
--   material   = ink, film, ... (adjusted by hand, never auto-deducted)
create table public.inventory_items (
                                      id               uuid primary key default gen_random_uuid(),
                                      kind             public.inventory_kind not null,
                                      name             text not null,
                                      phone_model_id   uuid references public.phone_models (id),
                                      quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
                                      created_at       timestamptz not null default now(),

  -- a blank must belong to a phone model; other kinds must not
                                      constraint blank_needs_phone_model check ((kind = 'blank') = (phone_model_id is not null))
);

-- Only one blank per phone model.
create unique index one_blank_per_phone_model
  on public.inventory_items (phone_model_id)
  where kind = 'blank';

-- The only public window into stock: no kind, no materials, just "how many".
create view public.stock_availability as
select id as inventory_item_id, quantity_on_hand as available
from public.inventory_items
where kind in ('blank', 'trade_good');

-- A simple view is writable, so lock it down to read-only.
revoke all on public.stock_availability from anon, authenticated;
grant select on public.stock_availability to anon, authenticated;
