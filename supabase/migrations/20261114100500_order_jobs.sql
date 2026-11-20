-- M6 · Background jobs (replaces the in-browser AutoJobs once the app reads orders from Supabase).
-- Same rules as services/scheduled-jobs.ts. Runs every minute with pg_cron and is idempotent.
-- pg_cron must be enabled for the project (Dashboard → Database → Extensions → pg_cron).
-- Rollback: supabase/rollbacks/20261114100500_order_jobs.down.sql

create or replace function public.run_order_jobs()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  r public.refund_requests;
  v_today date := public.vn_now()::date;
  v_due_now boolean := public.is_working_day(v_today) and public.vn_now()::time >= time '16:00';
  v_customer_fault boolean;
begin
  -- 1. Daily 16:00 production run, catching up orders that missed theirs.
  perform public.set_order_actor('system', 'Đợt sản xuất tự động');
  for o in
    select * from public.orders x
    where x.status_detail = 'Pending_Confirmation' and x.confirmed_at is not null
      and public.order_has_custom(x.id) and not public.order_on_hold(x.id)
      and (x.batch_date < v_today or (x.batch_date = v_today and v_due_now))
    for update
  loop
    update public.orders set status_detail = 'In_Production' where id = o.id;
  end loop;

  -- 2. Auto-complete 72 hours after delivery (not while a support ticket freezes the timer).
  perform public.set_order_actor('system', 'Tự hoàn thành sau 72 giờ');
  update public.orders set status_detail = 'Completed'
  where status_detail = 'Delivered' and frozen_at is null and auto_complete_at <= now();

  -- 3. Design not fixed within 7 days: cancel with a 100% refund (S2); reminder on day 3.
  for o in
    select * from public.orders x where x.status_detail = 'Action_Required' and x.rejected_at <= now() - interval '7 days' for update
  loop
    perform public.restock_order(o.id);
    perform public.set_order_actor('system', 'Quá hạn chỉnh sửa thiết kế');
    update public.orders set status_detail = 'Cancelled' where id = o.id;
    perform public.create_refund(o, 'S2');
    perform public.notify(o.user_id, 'order', 'Đơn hàng đã hủy', 'Quá hạn chỉnh sửa thiết kế. Shop sẽ hoàn 100% giá trị đơn sau khi xác nhận.', public.order_link(o.order_code));
  end loop;
  for o in
    select * from public.orders x
    where x.status_detail = 'Action_Required' and x.design_fix_reminded_at is null and x.rejected_at <= now() - interval '3 days'
  loop
    update public.orders set design_fix_reminded_at = now() where id = o.id;
    perform public.notify(o.user_id, 'design', 'Nhắc chỉnh sửa thiết kế', 'Còn 4 ngày để chỉnh sửa thiết kế hoặc hủy và nhận hoàn 100%.', public.order_link(o.order_code));
  end loop;

  -- 4. Warehouse hold (14 days) expired after a failed delivery.
  for o in
    select * from public.orders x
    where x.status_detail = 'Delivery_Failed' and not x.warehouse_disputed and x.warehouse_hold_until <= now() for update
  loop
    v_customer_fault := public.is_customer_fault(coalesce(o.fault_override, o.failure_cause));
    perform public.set_order_actor('system', 'Quá hạn lưu kho 14 ngày');
    update public.orders set status_detail = 'Cancelled' where id = o.id;
    perform public.create_refund(o, case
      when not v_customer_fault then 'S3a'
      when public.order_has_custom(o.id) then 'S3c'
      else 'S3b' end);
    perform public.notify(o.user_id, 'order', 'Đơn hàng đã đóng', 'Quá hạn lưu kho 14 ngày, đơn được đóng theo chính sách.', public.order_link(o.order_code));
  end loop;

  -- 5. Refund account: reminder on day 3, hand over to CSKH on day 7 (no automatic voucher).
  for r in
    select * from public.refund_requests x
    where x.status = 'Pending_Approval' and x.refund_method is null and x.escalated_at is null and x.created_at <= now() - interval '3 days'
    for update
  loop
    select * into o from public.orders where id = r.order_id;
    if r.created_at <= now() - interval '7 days' then
      update public.refund_requests set escalated_at = now() where id = r.id;
      perform public.notify(o.user_id, 'payment', 'CSKH sẽ liên hệ để hoàn tiền', 'Bạn chưa cung cấp tài khoản nhận hoàn. Nhân viên CSKH sẽ liên hệ để hỗ trợ.', public.order_link(o.order_code));
    elsif r.reminder_sent_at is null then
      update public.refund_requests set reminder_sent_at = now() where id = r.id;
      perform public.notify(o.user_id, 'payment', 'Nhắc cung cấp tài khoản nhận hoàn', 'Vui lòng nhập tài khoản ngân hàng nhận hoàn trong chi tiết đơn.', public.order_link(o.order_code));
    end if;
  end loop;
end;
$$;

revoke execute on function public.run_order_jobs() from public, anon, authenticated;

-- Schedule every minute when pg_cron is available (skipped otherwise, e.g. local tests).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('order-jobs', '* * * * *', 'select public.run_order_jobs()');
  else
    raise notice 'pg_cron is not available: schedule public.run_order_jobs() manually';
  end if;
end;
$$;
