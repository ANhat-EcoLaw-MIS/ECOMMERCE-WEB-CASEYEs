-- M2 · Order tracking columns (Quản lý đơn hàng, BRD v8).
-- orders is still empty on the live project; every new column has a default.
-- The 5-value enum "status" stays for the other modules; "status_detail" holds the 12 BRD codes
-- and a trigger keeps "status" in sync.
-- Rollback: supabase/rollbacks/20261114100100_orders_tracking.down.sql

-- ---------------------------------------------------------------- calendar helpers (Vietnam time)

create or replace function public.vn_now()
  returns timestamp
  language sql
  stable
  set search_path = ''
as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh');
$$;

create or replace function public.is_working_day(p_day date)
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select extract(isodow from p_day) between 1 and 5;   -- Mon–Fri; public holidays: none yet
$$;

create or replace function public.add_working_days(p_day date, p_count integer)
  returns date
  language plpgsql
  immutable
  set search_path = ''
as $$
declare
  d date := p_day;
  n integer := 0;
begin
  while n < p_count loop
    d := d + 1;
    if public.is_working_day(d) then
      n := n + 1;
    end if;
  end loop;
  return d;
end;
$$;

-- Working days in (p_from, p_to].
create or replace function public.working_days_between(p_from date, p_to date)
  returns integer
  language sql
  immutable
  set search_path = ''
as $$
  select count(*)::integer
  from generate_series(p_from + 1, p_to, interval '1 day') g(d)
  where public.is_working_day(g.d::date);
$$;

-- Production day of an order confirmed at p_at: the 16:00 run of that working day, otherwise
-- the next working day (same rule as domain/edd.ts batchDateFor).
create or replace function public.batch_date_for(p_at timestamptz)
  returns date
  language plpgsql
  stable
  set search_path = ''
as $$
declare
  local_ts timestamp := p_at at time zone 'Asia/Ho_Chi_Minh';
  d date := local_ts::date;
begin
  if not public.is_working_day(d) then
    while not public.is_working_day(d) loop
      d := d + 1;
    end loop;
    return d;
  end if;
  if local_ts::time <= time '16:00' then
    return d;
  end if;
  return public.add_working_days(d, 1);
end;
$$;

-- ---------------------------------------------------------------- orders

create sequence if not exists public.order_code_seq;

alter table public.orders
  add column if not exists order_code            text unique,
  add column if not exists status_detail         text not null default 'Pending_Confirmation',
  add column if not exists payment_status        text not null default 'unpaid',
  add column if not exists payment_channel       text,           -- mock: vietqr / e_wallet / card / cod (not validated)
  add column if not exists payment_txn_ref       text,
  add column if not exists shipping_tier         text not null default 'standard',
  add column if not exists shipping_fee          integer not null default 0,
  add column if not exists standard_fee          integer not null default 0,
  add column if not exists express_surcharge     integer not null default 0,
  add column if not exists transit_min           smallint not null default 1,
  add column if not exists transit_max           smallint not null default 2,
  add column if not exists goods_total           integer not null default 0,
  add column if not exists discount              integer not null default 0,
  add column if not exists earliest_edd          date,
  add column if not exists latest_edd            date,
  add column if not exists batch_date            date,
  add column if not exists confirmed_at          timestamptz,
  add column if not exists confirm_due_at        timestamptz,     -- hidden COD change-of-mind window
  add column if not exists review_queued_at      timestamptz,
  add column if not exists rejected_at           timestamptz,
  add column if not exists design_fix_reminded_at timestamptz,
  add column if not exists delivered_at          timestamptz,
  add column if not exists auto_complete_at      timestamptz,
  add column if not exists frozen_at             timestamptz,
  add column if not exists design_resubmit_count smallint not null default 0,
  add column if not exists redelivery_used       boolean not null default false,
  add column if not exists qc_reprint_count      smallint not null default 0,
  add column if not exists late_voucher_issued   boolean not null default false,
  add column if not exists failure_cause         text,
  add column if not exists fault_override        text,
  add column if not exists warehouse_hold_until  timestamptz,
  add column if not exists warehouse_disputed    boolean not null default false,
  add column if not exists ticket_id             text,            -- CSKH & Khiếu nại owns tickets
  add column if not exists updated_at            timestamptz not null default now(),
  add column if not exists version               integer not null default 0;

alter table public.orders
  add constraint orders_status_detail_check check (status_detail in (
    'Pending_Review', 'Pending_Confirmation', 'Action_Required', 'In_Production', 'Ready_for_Pickup',
    'In_Transit', 'Delivered', 'Completed', 'Delivery_Failed', 'Return_Requested', 'Cancelled', 'Refunded')),
  add constraint orders_payment_status_check check (payment_status in ('unpaid', 'paid')),
  add constraint orders_shipping_tier_check  check (shipping_tier in ('standard', 'express')),
  add constraint orders_money_check check (shipping_fee >= 0 and standard_fee >= 0 and express_surcharge >= 0
                                           and goods_total >= 0 and discount >= 0);

create index if not exists orders_status_detail_idx on public.orders (status_detail);

-- 12 BRD codes → 5-value enum used by the other modules.
create or replace function public.order_status_for(p_detail text)
  returns public.order_status
  language sql
  immutable
  set search_path = ''
as $$
  select (case
    when p_detail in ('Pending_Review', 'Pending_Confirmation', 'Action_Required') then 'pending'
    when p_detail in ('In_Production', 'Ready_for_Pickup')                        then 'confirmed'
    when p_detail in ('In_Transit', 'Delivery_Failed')                            then 'shipping'
    when p_detail in ('Delivered', 'Completed', 'Return_Requested')               then 'delivered'
    else 'cancelled'
  end)::public.order_status;
$$;

create or replace function public.sync_order_status()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.status := public.order_status_for(new.status_detail);
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_sync_status on public.orders;
create trigger orders_sync_status
  before insert or update on public.orders
  for each row execute function public.sync_order_status();

-- ---------------------------------------------------------------- history with actor and reason

alter table public.order_status_history
  add column if not exists status_detail text,
  add column if not exists actor_type    text not null default 'system',
  add column if not exists actor_id      text,
  add column if not exists reason        text;

-- RPCs call this before changing an order so the trigger can log who did it and why.
create or replace function public.set_order_actor(p_actor_type text, p_reason text)
  returns void
  language plpgsql
  set search_path = ''
as $$
begin
  perform set_config('app.actor_type', p_actor_type, true);
  perform set_config('app.actor_id', coalesce(auth.uid()::text, ''), true);
  perform set_config('app.reason', coalesce(p_reason, ''), true);
end;
$$;

-- Log on create and on every change of the detailed status.
create or replace function public.log_order_status()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status_detail is distinct from old.status_detail then
    insert into public.order_status_history (order_id, status, status_detail, actor_type, actor_id, reason)
    values (new.id, new.status, new.status_detail,
            coalesce(nullif(current_setting('app.actor_type', true), ''), 'system'),
            nullif(current_setting('app.actor_id', true), ''),
            nullif(current_setting('app.reason', true), ''));
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
  after insert or update of status, status_detail on public.orders
  for each row execute function public.log_order_status();

-- Events that do not change the status (cancel request, QC reprint…) are logged with this.
create or replace function public.log_order_note(p_order_id uuid, p_actor_type text, p_reason text)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  insert into public.order_status_history (order_id, status, status_detail, actor_type, actor_id, reason)
  select o.id, o.status, o.status_detail, p_actor_type, auth.uid()::text, p_reason
  from public.orders o where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------- order lines

alter table public.order_items
  add column if not exists phone_model    text,
  add column if not exists design_version integer not null default 1,
  add column if not exists is_custom      boolean generated always as (design_id is not null) stored;

-- Internal helpers are not callable from the API.
revoke execute on function public.set_order_actor(text, text)        from public, anon, authenticated;
revoke execute on function public.log_order_note(uuid, text, text)   from public, anon, authenticated;

-- ---------------------------------------------------------------- staff can read every order

create policy "staff read all orders"
  on public.orders for select to authenticated using (public.is_staff());
create policy "staff read all order items"
  on public.order_items for select to authenticated using (public.is_staff());
create policy "staff read all order history"
  on public.order_status_history for select to authenticated using (public.is_staff());
