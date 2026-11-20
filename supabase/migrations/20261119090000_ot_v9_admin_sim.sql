-- M9 · Order Tracking BRD/SRD v9 gaps + simulation tools that work on the real data.
--
-- Why: the admin simulator used to move a clock and run jobs in the browser only, while both the
-- admin and the customer read orders from Supabase. Nothing changed in the database, so the two
-- views disagreed. These admin-only RPCs move time and run jobs in the database instead, so the
-- customer page shows exactly what the admin sees.
--
-- Also (v9):
--   * FR-OT-11 / FR-OT-EX-03: report an issue or dispute the failure cause while a failed delivery
--     sits in the warehouse; the 14-day hold is frozen and extended by the frozen time.
--   * FR-OT-09 / Bảng 3.4: stock goods that come back after a failed delivery return to stock
--     when the order is cancelled (customer cancels or the hold expires). Printed designs do not.
--   * FR-OT-16: "in lại" after a complaint gives a new delivery window.
-- Rollback: supabase/rollbacks/20261119090000_ot_v9_admin_sim.down.sql

-- ---------------------------------------------------------------- stock goods back after a failed delivery
create or replace function public.restock_stock_items(p_order_id uuid)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  update public.inventory_items i
  set quantity_on_hand = i.quantity_on_hand + s.qty
  from (select inventory_item_id, sum(qty)::integer as qty
        from public.order_items where order_id = p_order_id and design_id is null group by inventory_item_id) s
  where i.id = s.inventory_item_id;
$$;
revoke execute on function public.restock_stock_items(uuid) from public, anon, authenticated;

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
  perform public.restock_stock_items(o.id);
  update public.orders set status_detail = 'Cancelled' where id = o.id;
  perform public.create_refund(o, case
    when not v_customer_fault then 'S3a'
    when public.order_has_custom(o.id) then 'S3c'
    else 'S3b' end);
end;
$$;

-- ---------------------------------------------------------------- report / dispute while in the warehouse
create or replace function public.report_issue(p_order_id uuid, p_ticket_id text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.ticket_id is not null and (o.status_detail = 'Return_Requested' or o.warehouse_disputed) then
    raise exception 'cannot_report';
  end if;
  if o.status_detail = 'Delivery_Failed' then
    -- FR-OT-EX-03: the customer disputes the failure cause; the hold clock stops.
    if o.warehouse_hold_until is null or now() > o.warehouse_hold_until then
      raise exception 'cannot_report';
    end if;
    perform public.set_order_actor('customer', 'Khách khiếu nại nguyên nhân giao không thành công');
    update public.orders set ticket_id = p_ticket_id, warehouse_disputed = true, frozen_at = now() where id = o.id;
  elsif o.status_detail in ('Delivered', 'Completed') and o.delivered_at is not null and now() <= o.delivered_at + interval '7 days' then
    perform public.set_order_actor('customer', 'Khách báo sự cố');
    update public.orders set status_detail = 'Return_Requested', ticket_id = p_ticket_id, frozen_at = now() where id = o.id;
  else
    raise exception 'cannot_report';
  end if;
  perform public.notify(o.user_id, 'support', 'Đã tiếp nhận yêu cầu hỗ trợ', 'Mã yêu cầu ' || p_ticket_id || '.', public.order_link(o.order_code));
end;
$$;

-- CSKH concludes a dispute about the failure cause. Customer right → carrier fault (free re-delivery
-- or 100% refund); otherwise the cause stays. Either way the frozen time is added back to the hold.
create or replace function public.resolve_dispute(p_order_id uuid, p_customer_right boolean, p_note text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
begin
  perform public.require_role('cskh');
  o := public.lock_order(p_order_id, false);
  if o.status_detail <> 'Delivery_Failed' or not o.warehouse_disputed then
    raise exception 'no_open_ticket';
  end if;
  perform public.log_order_note(o.id, 'cskh',
    case when p_customer_right then 'Khiếu nại giao hàng: khách đúng, chuyển sang lỗi vận chuyển' else 'Khiếu nại giao hàng: giữ nguyên nguyên nhân' end
    || coalesce(' – ' || nullif(trim(p_note), ''), ''));
  update public.orders
  set fault_override = case when p_customer_right then 'Damaged_In_Transit' else fault_override end,
      warehouse_hold_until = warehouse_hold_until + (now() - coalesce(frozen_at, now())),
      warehouse_disputed = false, frozen_at = null, ticket_id = null
  where id = o.id;
  perform public.notify(o.user_id, 'support', 'Kết quả khiếu nại giao hàng',
    case when p_customer_right then 'Shop nhận lỗi vận chuyển. Bạn có thể chọn giao lại miễn phí hoặc hủy và nhận hoàn 100%.'
         else 'Nguyên nhân giao không thành công được giữ nguyên. Hạn lưu kho đã được cộng bù thời gian chờ.' end,
    public.order_link(o.order_code));
end;
$$;
revoke execute on function public.resolve_dispute(uuid, boolean, text) from public, anon;
grant execute on function public.resolve_dispute(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------- reprint after a complaint: new delivery window
create or replace function public.apply_ticket_result(p_order_id uuid, p_resolution text, p_note text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  v_back text;
  v_today date := public.vn_now()::date;
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
      -- Custom goods go back to production, stock goods straight to packing; new delivery window.
      update public.orders
      set status_detail = case when public.order_has_custom(o.id) then 'In_Production' else 'Ready_for_Pickup' end,
          frozen_at = null,
          earliest_edd = public.add_working_days(v_today, (case when public.order_has_custom(o.id) then 2 else 1 end) + transit_min),
          latest_edd = public.add_working_days(v_today, (case when public.order_has_custom(o.id) then 3 else 2 end) + transit_max),
          late_voucher_issued = false
      where id = o.id;
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

-- ---------------------------------------------------------------- jobs: restock on hold expiry
-- Same as M6 job 4, plus stock goods back to stock. Only that block changes, so the job is wrapped.
create or replace function public.run_order_jobs_v9()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
begin
  -- Stock goods of failed deliveries whose hold has expired go back to stock before the M6 job closes them.
  for o in
    select * from public.orders x
    where x.status_detail = 'Delivery_Failed' and not x.warehouse_disputed and x.warehouse_hold_until <= now()
  loop
    perform public.restock_stock_items(o.id);
  end loop;
  perform public.run_order_jobs();
end;
$$;
revoke execute on function public.run_order_jobs_v9() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('order-jobs');
    perform cron.schedule('order-jobs', '* * * * *', 'select public.run_order_jobs_v9()');
  end if;
exception when others then
  null;  -- local tests without pg_cron
end;
$$;

-- ---------------------------------------------------------------- simulation (admin only)
-- "Tua thời gian" for one order: every timestamp of the order moves back by p_minutes, which is the
-- same as that much time passing for it. Then the jobs run, so auto-complete / auto-cancel /
-- production run / hold expiry happen exactly as they would in real life.
create or replace function public.sim_time_travel(p_order_id uuid, p_minutes integer)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  d interval := make_interval(mins => p_minutes);
  dd integer := floor(p_minutes / 1440.0)::integer;
begin
  perform public.require_role('admin');
  if p_minutes is null or p_minutes <= 0 or p_minutes > 60 * 24 * 30 then
    raise exception 'invalid_interval';
  end if;
  perform 1 from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  update public.orders set
    created_at = created_at - d, confirmed_at = confirmed_at - d, confirm_due_at = confirm_due_at - d,
    review_queued_at = review_queued_at - d, rejected_at = rejected_at - d, design_fix_reminded_at = design_fix_reminded_at - d,
    delivered_at = delivered_at - d, auto_complete_at = auto_complete_at - d, frozen_at = frozen_at - d,
    warehouse_hold_until = warehouse_hold_until - d,
    batch_date = batch_date - dd, earliest_edd = earliest_edd - dd, latest_edd = latest_edd - dd
  where id = p_order_id;
  update public.order_status_history set created_at = created_at - d where order_id = p_order_id;
  update public.cancel_requests set created_at = created_at - d, sla_due_at = sla_due_at - d, decided_at = decided_at - d where order_id = p_order_id;
  update public.refund_requests set created_at = created_at - d, reminder_sent_at = reminder_sent_at - d, escalated_at = escalated_at - d where order_id = p_order_id;
  update public.design_reviews set created_at = created_at - d where order_id = p_order_id;
  perform public.log_order_note(p_order_id, 'system', 'Mô phỏng: tua thời gian +' || p_minutes || ' phút');
  perform public.run_order_jobs_v9();
end;
$$;
revoke execute on function public.sim_time_travel(uuid, integer) from public, anon;
grant execute on function public.sim_time_travel(uuid, integer) to authenticated;

create or replace function public.sim_run_jobs()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  perform public.require_role('admin');
  perform public.run_order_jobs_v9();
end;
$$;
revoke execute on function public.sim_run_jobs() from public, anon;
grant execute on function public.sim_run_jobs() to authenticated;

-- Sample order for a real customer account (so it shows on that customer's "Đơn hàng của tôi").
-- p_kind: stock | custom | mixed · p_payment: cod | prepaid · p_tier: standard | express
create or replace function public.sim_create_sample_order(p_email text, p_kind text, p_payment text, p_tier text default 'standard')
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_admin text := current_setting('request.jwt.claim.sub', true);
  v_user uuid;
  v_model uuid;
  v_variant uuid;
  v_design uuid;
  v_items jsonb := '[]'::jsonb;
  v_express boolean := p_tier = 'express';
  v_fee integer := case when p_tier = 'express' then 45000 else 25000 end;
  v_order uuid;
begin
  perform public.require_role('admin');
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'customer_not_found';
  end if;
  select id into v_model from public.phone_models where slug = 'iphone-15-pro-max';
  if p_kind in ('stock', 'mixed') then
    select v.id into v_variant from public.product_variants v join public.products p on p.id = v.product_id
    join public.inventory_items i on i.id = v.inventory_item_id
    where p.product_type = 'case' and v.is_active and p.is_active and i.quantity_on_hand > 0
    order by (v.phone_model_id = v_model) desc nulls last, p.slug limit 1;
    if v_variant is null then
      raise exception 'out_of_stock';
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('type', 'product', 'id', v_variant, 'qty', 1));
  end if;
  if p_kind in ('custom', 'mixed') then
    insert into public.designs (user_id, phone_model_id, name, canvas_json, preview_url)
    values (v_user, v_model, 'Thiết kế mẫu (mô phỏng)', '{}'::jsonb, '/products/bloom-club.webp')
    returning id into v_design;
    v_items := v_items || jsonb_build_array(jsonb_build_object('type', 'design', 'id', v_design, 'qty', 1));
  end if;
  if jsonb_array_length(v_items) = 0 then
    raise exception 'invalid_kind';
  end if;
  -- place_order runs as the customer (auth.uid() reads this claim), then the admin claim is restored.
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  v_order := public.place_order(v_items, jsonb_build_object(
    'recipient', 'Khách mô phỏng', 'phone', '0900000000', 'line', '1 Lê Lợi', 'ward', 'Bến Nghé', 'district', 'Quận 1', 'city', 'TP. Hồ Chí Minh',
    'payment_method', p_payment, 'payment_channel', case when p_payment = 'cod' then 'cod' else 'vietqr' end,
    'tier', p_tier, 'fee', v_fee, 'standard_fee', 25000, 'express_surcharge', case when v_express then 20000 else 0 end,
    'transit_min', case when v_express then 0 else 1 end, 'transit_max', case when v_express then 0 else 2 end,
    'policy_version', 'CS-DH-2.0',
    'earliest_edd', public.add_working_days(public.vn_now()::date, case when v_express then 0 when p_kind = 'stock' then 2 else 3 end),
    'latest_edd', public.add_working_days(public.vn_now()::date, case when v_express then 1 when p_kind = 'stock' then 4 else 5 end)));
  perform set_config('request.jwt.claim.sub', coalesce(v_admin, ''), true);
  perform public.log_order_note(v_order, 'system', 'Mô phỏng: đơn mẫu do Admin tạo');
  return v_order;
end;
$$;
revoke execute on function public.sim_create_sample_order(text, text, text, text) from public, anon;
grant execute on function public.sim_create_sample_order(text, text, text, text) to authenticated;
