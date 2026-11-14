-- Rollback M2: back to the original orders / history / items columns and trigger.
drop policy if exists "staff read all orders" on public.orders;
drop policy if exists "staff read all order items" on public.order_items;
drop policy if exists "staff read all order history" on public.order_status_history;

drop trigger if exists orders_sync_status on public.orders;
drop trigger if exists orders_log_status on public.orders;
drop function if exists public.sync_order_status();
drop function if exists public.order_status_for(text);
drop function if exists public.log_order_note(uuid, text, text);
drop function if exists public.set_order_actor(text, text);

-- Original trigger function and trigger (20261105060224_orders.sql)
create or replace function public.log_order_status()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;
create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

alter table public.order_items
  drop column if exists is_custom,
  drop column if exists design_version,
  drop column if exists phone_model;

alter table public.order_status_history
  drop column if exists reason,
  drop column if exists actor_id,
  drop column if exists actor_type,
  drop column if exists status_detail;

alter table public.orders
  drop constraint if exists orders_status_detail_check,
  drop constraint if exists orders_payment_status_check,
  drop constraint if exists orders_shipping_tier_check,
  drop constraint if exists orders_money_check;

alter table public.orders
  drop column if exists order_code,
  drop column if exists status_detail,
  drop column if exists payment_status,
  drop column if exists payment_channel,
  drop column if exists payment_txn_ref,
  drop column if exists shipping_tier,
  drop column if exists shipping_fee,
  drop column if exists standard_fee,
  drop column if exists express_surcharge,
  drop column if exists transit_min,
  drop column if exists transit_max,
  drop column if exists goods_total,
  drop column if exists discount,
  drop column if exists earliest_edd,
  drop column if exists latest_edd,
  drop column if exists batch_date,
  drop column if exists confirmed_at,
  drop column if exists confirm_due_at,
  drop column if exists review_queued_at,
  drop column if exists rejected_at,
  drop column if exists design_fix_reminded_at,
  drop column if exists delivered_at,
  drop column if exists auto_complete_at,
  drop column if exists frozen_at,
  drop column if exists design_resubmit_count,
  drop column if exists redelivery_used,
  drop column if exists qc_reprint_count,
  drop column if exists late_voucher_issued,
  drop column if exists failure_cause,
  drop column if exists fault_override,
  drop column if exists warehouse_hold_until,
  drop column if exists warehouse_disputed,
  drop column if exists ticket_id,
  drop column if exists updated_at,
  drop column if exists version;

drop sequence if exists public.order_code_seq;
drop function if exists public.batch_date_for(timestamptz);
drop function if exists public.working_days_between(date, date);
drop function if exists public.add_working_days(date, integer);
drop function if exists public.is_working_day(date);
drop function if exists public.vn_now();
