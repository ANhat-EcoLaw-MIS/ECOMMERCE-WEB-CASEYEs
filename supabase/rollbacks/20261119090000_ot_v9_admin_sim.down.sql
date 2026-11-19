-- Rollback M9: back to the M5 versions; drops the v9 / simulation functions.
create or replace function public.cancel_after_failure(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
  v_customer_fault boolean := public.is_customer_fault(coalesce(o.fault_override, o.failure_cause));
begin
  if o.status_detail <> 'Delivery_Failed' or o.warehouse_hold_until is null or o.warehouse_disputed then
    raise exception 'cannot_cancel';
  end if;
  perform public.set_order_actor('customer', 'Khách hủy đơn sau giao thất bại');
  update public.orders set status_detail = 'Cancelled' where id = o.id;
  perform public.create_refund(o, case
    when not v_customer_fault then 'S3a'
    when public.order_has_custom(o.id) then 'S3c'
    else 'S3b' end);
end;
$$;

create or replace function public.report_issue(p_order_id uuid, p_ticket_id text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.status_detail not in ('Delivered', 'Completed') or o.delivered_at is null or now() > o.delivered_at + interval '7 days' then
    raise exception 'cannot_report';
  end if;
  perform public.set_order_actor('customer', 'Khách báo sự cố');
  update public.orders set status_detail = 'Return_Requested', ticket_id = p_ticket_id, frozen_at = now() where id = o.id;
  perform public.notify(o.user_id, 'support', 'Đã tiếp nhận yêu cầu hỗ trợ', 'Mã yêu cầu ' || p_ticket_id || '.', public.order_link(o.order_code));
end;
$$;

create or replace function public.apply_ticket_result(p_order_id uuid, p_resolution text, p_note text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  v_back text;
begin
  perform public.require_role('cskh');
  o := public.lock_order(p_order_id, false);
  if o.status_detail <> 'Return_Requested' then
    raise exception 'no_open_ticket';
  end if;
  v_back := case when o.auto_complete_at is not null and o.frozen_at is not null
                      and o.auto_complete_at + (now() - o.frozen_at) > now() then 'Delivered' else 'Completed' end;
  perform public.set_order_actor('cskh', 'Kết quả yêu cầu hỗ trợ: ' || p_resolution || coalesce(' – ' || nullif(trim(p_note), ''), ''));
  case p_resolution
    when 'Reprint' then
      update public.orders set status_detail = 'In_Production', qc_reprint_count = qc_reprint_count + 1, frozen_at = null where id = o.id;
    when 'Refund' then
      update public.orders set status_detail = 'Refunded', frozen_at = null where id = o.id;
      perform public.create_refund(o, 'S4');
    when 'Voucher' then
      insert into public.order_vouchers (order_id, kind, code, value, expires_at)
      values (o.id, 'complaint', 'DENBU-' || upper(substr(md5(random()::text), 1, 6)),
              least(round(o.goods_total * 0.10)::integer, 30000), now() + interval '30 days');
      update public.orders set status_detail = v_back,
             auto_complete_at = auto_complete_at + (now() - frozen_at), frozen_at = null where id = o.id;
    when 'Rejected' then
      update public.orders set status_detail = v_back,
             auto_complete_at = auto_complete_at + (now() - frozen_at), frozen_at = null where id = o.id;
    else
      raise exception 'invalid_resolution';
  end case;
  perform public.notify(o.user_id, 'support', 'Kết quả xử lý yêu cầu hỗ trợ', coalesce(nullif(trim(p_note), ''), 'Xem chi tiết trong đơn hàng.'), public.order_link(o.order_code));
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('order-jobs');
    perform cron.schedule('order-jobs', '* * * * *', 'select public.run_order_jobs()');
  end if;
exception when others then
  null;
end;
$$;

drop function if exists public.sim_create_sample_order(text, text, text, text);
drop function if exists public.sim_run_jobs();
drop function if exists public.sim_time_travel(uuid, integer);
drop function if exists public.run_order_jobs_v9();
drop function if exists public.resolve_dispute(uuid, boolean, text);
drop function if exists public.restock_stock_items(uuid);
