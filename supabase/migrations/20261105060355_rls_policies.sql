-- Row Level Security.
-- No policy = no access. Staff change data with the dashboard / service role.

alter table public.profiles             enable row level security;
alter table public.addresses            enable row level security;
alter table public.phone_models         enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.designs              enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;

-- Public catalog (read only)
create policy "anyone reads active phone models"
  on public.phone_models for select using (is_active);

create policy "anyone reads active products"
  on public.products for select using (is_active);

create policy "anyone reads active variants"
  on public.product_variants for select using (is_active);

-- inventory_items: intentionally NO policy. Customers use the stock_availability view.

-- Own rows only
-- (profiles may already exist with policies, so drop-then-create to avoid a name clash)
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;

create policy "read own profile"
  on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile"
  on public.profiles for update to authenticated
                                  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "manage own addresses"
  on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "manage own designs"
  on public.designs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Orders: read only. Creating and cancelling goes through place_order / cancel_order.
create policy "read own orders"
  on public.orders for select to authenticated using (user_id = (select auth.uid()));

create policy "read own order items"
  on public.order_items for select to authenticated
                                     using (exists (select 1 from public.orders o
                                     where o.id = order_id and o.user_id = (select auth.uid())));

create policy "read own order history"
  on public.order_status_history for select to authenticated
                                              using (exists (select 1 from public.orders o
                                              where o.id = order_id and o.user_id = (select auth.uid())));
