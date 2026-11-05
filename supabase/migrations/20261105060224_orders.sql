-- Checkout side: orders, their lines, and the tracking timeline.
-- Order lines copy name / image / price so old orders never change.

create table public.orders (
                             id             uuid primary key default gen_random_uuid(),
                             user_id        uuid not null references public.profiles (id),
                             status         public.order_status not null default 'pending',
                             total          integer not null default 0 check (total >= 0),
                             payment_method text not null default 'cod',
  -- shipping snapshot
                             recipient      text not null,
                             phone          text not null,
                             address_line   text not null,
                             ward           text not null,
                             district       text,
                             city           text not null,
                             created_at     timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
                                  id                uuid primary key default gen_random_uuid(),
                                  order_id          uuid not null references public.orders (id) on delete cascade,
                                  variant_id        uuid references public.product_variants (id),
                                  design_id         uuid references public.designs (id),
                                  inventory_item_id uuid not null references public.inventory_items (id),  -- stock taken, used for cancel
                                  name              text not null,
                                  image_url         text,
                                  unit_price        integer not null check (unit_price >= 0),
                                  qty               integer not null check (qty > 0),

  -- exactly one of variant / design
                                  constraint one_source check (num_nonnulls(variant_id, design_id) = 1)
);

create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
                                           id         uuid primary key default gen_random_uuid(),
                                           order_id   uuid not null references public.orders (id) on delete cascade,
                                           status     public.order_status not null,
                                           note       text,
                                           created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Write a timeline row when an order is created and whenever its status changes.
create function public.log_order_status()
  returns trigger
  language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status)
    values (new.id, new.status);
end if;
return new;
end;
$$;

create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();
