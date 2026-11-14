-- M5 · Order business rules as RPCs (security definer). Same rules as the Angular
-- OrderTrackingService (BRD v8). Customers act on their own orders; staff actions check
-- profiles.role through require_role(). Replaces place_order and cancel_order.
-- Rollback: supabase/rollbacks/20261114100400_order_rpcs.down.sql

-- ---------------------------------------------------------------- internal helpers

create or replace function public.lock_order(p_order_id uuid, p_own boolean)
  returns public.orders
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders
  where id = p_order_id and (not p_own or user_id = auth.uid())
  for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  return o;
end;
$$;

create or replace function public.order_has_custom(p_order_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from public.order_items i where i.order_id = p_order_id and i.design_id is not null);
$$;

create or replace function public.order_on_hold(p_order_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from public.cancel_requests r where r.order_id = p_order_id and r.status = 'pending');
$$;

create or replace function public.is_customer_fault(p_cause text)
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select coalesce(p_cause in ('Customer_Unreachable', 'Wrong_Address_By_Customer', 'Customer_Refused'), false);
$$;

create or replace function public.restock_order(p_order_id uuid)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  update public.inventory_items i
  set quantity_on_hand = i.quantity_on_hand + s.qty
  from (select inventory_item_id, sum(qty)::integer as qty
        from public.order_items where order_id = p_order_id group by inventory_item_id) s
  where i.id = s.inventory_item_id;
$$;

create or replace function public.create_refund(p_order public.orders, p_situation text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_fee integer := 0;
  v_amount integer;
begin
  if p_order.payment_status <> 'paid' or p_situation = 'S3c' then
    return;                                  -- nothing was paid, or custom goods + customer fault
  end if;
  if p_situation = 'S3b' then
    v_fee := 2 * p_order.standard_fee;       -- two-way Standard shipping
    v_amount := greatest(0, p_order.goods_total - p_order.discount - v_fee);
  else
    v_amount := p_order.total;
  end if;
  insert into public.refund_requests (order_id, situation, amount, deducted_fee)
  values (p_order.id, p_situation, v_amount, v_fee);
end;
$$;

create or replace function public.order_link(p_code text)
  returns text
  language sql
  immutable
  set search_path = ''
as $$
  select '/order-tracking/' || p_code;
$$;

revoke execute on function public.lock_order(uuid, boolean)              from public, anon, authenticated;
revoke execute on function public.order_has_custom(uuid)                 from public, anon, authenticated;
revoke execute on function public.order_on_hold(uuid)                    from public, anon, authenticated;
revoke execute on function public.restock_order(uuid)                    from public, anon, authenticated;
revoke execute on function public.create_refund(public.orders, text)     from public, anon, authenticated;

-- ---------------------------------------------------------------- place_order (replaces M0 version)

-- p_items:    [{ "type": "product" | "design", "id": uuid, "qty": int }]
-- p_shipping: { recipient, phone, line, ward, district?, city,
--               payment_method: "cod" | "prepaid", payment_channel?, payment_txn_ref?,
--               tier: "standard" | "express", fee, standard_fee, express_surcharge, transit_min, transit_max,
--               discount?, policy_version, earliest_edd, latest_edd, batch_date?, order_code? }
-- Delivery dates are computed by the Angular app (domain/edd.ts) and stored here.
create or replace function public.place_order(p_items jsonb, p_shipping jsonb)
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_order_id   uuid;
  v_item       jsonb;
  v_qty        integer;
  v_goods      integer := 0;
  v_variant    uuid;
  v_design     uuid;
  v_inv        uuid;
  v_price      integer;
  v_name       text;
  v_image      text;
  v_model      text;
  v_cod        boolean := coalesce(p_shipping ->> 'payment_method', 'prepaid') = 'cod';
  v_express    boolean := coalesce(p_shipping ->> 'tier', 'standard') = 'express';
  v_fee        integer := coalesce((p_shipping ->> 'fee')::integer, 0);
  v_discount   integer := coalesce((p_shipping ->> 'discount')::integer, 0);
  v_has_custom boolean;
  v_code       text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;
  if coalesce(p_shipping ->> 'policy_version', '') = '' then
    raise exception 'policy_consent_required';
  end if;

  select coalesce(bool_or(e ->> 'type' = 'design'), false) into v_has_custom from jsonb_array_elements(p_items) e;
  if v_cod and v_has_custom then
    raise exception 'cod_requires_stock_only';      -- custom designs are prepaid (BRD v8)
  end if;
  if v_express and v_has_custom then
    raise exception 'express_requires_stock_only';
  end if;

  v_code := coalesce(nullif(p_shipping ->> 'order_code', ''),
                     'CC-' || to_char(public.vn_now(), 'YYMMDD') || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0'));

  perform public.set_order_actor('customer', 'Đặt hàng thành công');
  insert into public.orders (
    user_id, order_code, status_detail, payment_method, payment_status, payment_channel, payment_txn_ref,
    recipient, phone, address_line, ward, district, city,
    shipping_tier, shipping_fee, standard_fee, express_surcharge, transit_min, transit_max, discount,
    earliest_edd, latest_edd, batch_date, confirm_due_at, confirmed_at, review_queued_at)
  values (
    v_user, v_code,
    case when v_has_custom then 'Pending_Review' else 'Pending_Confirmation' end,
    case when v_cod then 'cod' else 'prepaid' end,
    case when v_cod then 'unpaid' else 'paid' end,
    p_shipping ->> 'payment_channel', p_shipping ->> 'payment_txn_ref',
    p_shipping ->> 'recipient', p_shipping ->> 'phone', p_shipping ->> 'line',
    p_shipping ->> 'ward', p_shipping ->> 'district', p_shipping ->> 'city',
    case when v_express then 'express' else 'standard' end,
    v_fee, coalesce((p_shipping ->> 'standard_fee')::integer, v_fee), coalesce((p_shipping ->> 'express_surcharge')::integer, 0),
    coalesce((p_shipping ->> 'transit_min')::smallint, 1), coalesce((p_shipping ->> 'transit_max')::smallint, 2), v_discount,
    (p_shipping ->> 'earliest_edd')::date, (p_shipping ->> 'latest_edd')::date,
    coalesce((p_shipping ->> 'batch_date')::date, public.batch_date_for(now())),
    case when v_cod then now() + interval '30 minutes' end,           -- hidden change-of-mind window
    case when not v_cod and not v_has_custom then now() end,          -- prepaid stock: confirmed by the payment
    case when v_has_custom then now() end)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'invalid_quantity';
    end if;
    v_variant := null;
    v_design := null;
    v_model := null;

    if v_item ->> 'type' = 'product' then
      select v.id, v.price, p.name || coalesce(' - ' || v.name, ''), p.image_url, v.inventory_item_id, m.name
      into v_variant, v_price, v_name, v_image, v_inv, v_model
      from public.product_variants v
      join public.products p on p.id = v.product_id
      left join public.phone_models m on m.id = v.phone_model_id
      where v.id = (v_item ->> 'id')::uuid and v.is_active and p.is_active;
      if not found then
        raise exception 'product_not_found';
      end if;
    elsif v_item ->> 'type' = 'design' then
      select d.id, m.custom_price, d.name, d.preview_url, b.id, m.name
      into v_design, v_price, v_name, v_image, v_inv, v_model
      from public.designs d
      join public.phone_models m on m.id = d.phone_model_id
      join public.inventory_items b on b.phone_model_id = m.id and b.kind = 'blank'
      where d.id = (v_item ->> 'id')::uuid and d.user_id = v_user and m.is_active;
      if not found then
        raise exception 'design_not_found';
      end if;
    else
      raise exception 'invalid_item_type';
    end if;

    update public.inventory_items set quantity_on_hand = quantity_on_hand - v_qty
    where id = v_inv and quantity_on_hand >= v_qty;
    if not found then
      raise exception 'out_of_stock';
    end if;

    insert into public.order_items (order_id, variant_id, design_id, inventory_item_id, name, image_url, unit_price, qty, phone_model)
    values (v_order_id, v_variant, v_design, v_inv, v_name, v_image, v_price, v_qty, v_model);
    v_goods := v_goods + v_price * v_qty;
  end loop;

  update public.orders set goods_total = v_goods, total = greatest(0, v_goods + v_fee - v_discount) where id = v_order_id;
  insert into public.policy_consents (order_id, user_id, policy_version) values (v_order_id, v_user, p_shipping ->> 'policy_version');
  perform public.notify(v_user, 'order', 'Đặt hàng thành công', 'Cảm ơn bạn đã đặt hàng! Đơn ' || v_code || ' đã được ghi nhận.', public.order_link(v_code));
  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------- customer actions

-- COD orders only, inside the hidden 30-minute window (BRD v8). Replaces the old version that
-- cancelled any pending order, prepaid included.
create or replace function public.cancel_order(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.payment_method <> 'cod' or o.status_detail <> 'Pending_Confirmation' or o.confirm_due_at is null or now() > o.confirm_due_at then
    raise exception 'cannot_cancel';
  end if;
  perform public.restock_order(o.id);
  perform public.set_order_actor('customer', 'Khách hủy đơn trong thời gian đổi ý');
  update public.orders set status_detail = 'Cancelled' where id = o.id;
  perform public.notify(o.user_id, 'order', 'Đơn hàng đã hủy', 'Đơn ' || o.order_code || ' đã được hủy, không phát sinh phí.', public.order_link(o.order_code));
end;
$$;

-- Prepaid orders before production: ask CSKH; the order is held until the decision.
create or replace function public.request_cancel(p_order_id uuid, p_reason text, p_note text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
  v_now timestamp := public.vn_now();
begin
  if o.payment_status <> 'paid' or o.status_detail not in ('Pending_Review', 'Pending_Confirmation') then
    raise exception 'cannot_request_cancel';
  end if;
  if public.order_on_hold(o.id) then
    raise exception 'request_exists';
  end if;
  insert into public.cancel_requests (order_id, reason, note, sla_due_at)
  values (o.id, p_reason, nullif(trim(p_note), ''),
          (public.add_working_days(v_now::date, 1) + v_now::time) at time zone 'Asia/Ho_Chi_Minh');
  perform public.log_order_note(o.id, 'customer', 'Khách gửi yêu cầu hủy đơn');
  perform public.notify(o.user_id, 'order', 'Đã gửi yêu cầu hủy đơn', 'CSKH sẽ phản hồi trong 1 ngày làm việc. Trong thời gian này, đơn tạm dừng xử lý.', public.order_link(o.order_code));
end;
$$;

create or replace function public.withdraw_cancel_request(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  update public.cancel_requests set status = 'withdrawn', decided_at = now()
  where order_id = o.id and status = 'pending';
  if not found then
    raise exception 'no_pending_request';
  end if;
  perform public.log_order_note(o.id, 'customer', 'Khách rút lại yêu cầu hủy đơn');
end;
$$;

create or replace function public.resubmit_design(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.status_detail <> 'Action_Required' or o.design_resubmit_count >= 2 then
    raise exception 'cannot_resubmit';
  end if;
  perform public.set_order_actor('customer', 'Khách gửi lại bản thiết kế');
  update public.orders
  set status_detail = 'Pending_Review', design_resubmit_count = design_resubmit_count + 1, review_queued_at = now()
  where id = o.id;
end;
$$;

-- Design rejected → cancel with a 100% refund (S2).
create or replace function public.cancel_rejected_order(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.status_detail <> 'Action_Required' then
    raise exception 'cannot_cancel';
  end if;
  perform public.restock_order(o.id);
  perform public.set_order_actor('customer', 'Khách hủy đơn: thiết kế bị từ chối');
  update public.orders set status_detail = 'Cancelled' where id = o.id;
  perform public.create_refund(o, 'S2');
  perform public.notify(o.user_id, 'order', 'Đơn hàng đã hủy', 'Shop sẽ hoàn 100% giá trị đơn sau khi xác nhận.', public.order_link(o.order_code));
end;
$$;

create or replace function public.confirm_received(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.status_detail <> 'Delivered' then
    raise exception 'cannot_confirm';
  end if;
  perform public.set_order_actor('customer', 'Khách xác nhận đã nhận hàng');
  update public.orders set status_detail = 'Completed' where id = o.id;
end;
$$;

-- After delivery, within 7 days: open a support ticket (ticket owned by CSKH & Khiếu nại).
-- The 72-hour auto-complete timer is frozen while the ticket is open.
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

create or replace function public.request_redelivery(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders := public.lock_order(p_order_id, true);
begin
  if o.status_detail <> 'Delivery_Failed' or o.warehouse_hold_until is null or o.warehouse_disputed or o.redelivery_used then
    raise exception 'cannot_redeliver';
  end if;
  perform public.set_order_actor('customer', 'Khách yêu cầu giao lại');
  update public.orders set status_detail = 'Ready_for_Pickup', redelivery_used = true, warehouse_hold_until = null where id = o.id;
end;
$$;

-- Failed delivery, goods back in the warehouse: cancel instead of re-delivery.
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

-- Bank transfer only (no voucher refunds).
create or replace function public.submit_refund_account(p_refund_id uuid, p_bank text, p_account_no text, p_holder text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if p_account_no !~ '^[0-9]{6,19}$' or coalesce(trim(p_bank), '') = '' or coalesce(trim(p_holder), '') = '' then
    raise exception 'invalid_account';
  end if;
  update public.refund_requests r
  set refund_method = 'bank', bank = trim(p_bank), account_no = p_account_no, account_holder = upper(trim(p_holder))
  where r.id = p_refund_id
    and r.status in ('Pending_Approval', 'Refund_Pending_Retry')
    and exists (select 1 from public.orders o where o.id = r.order_id and o.user_id = auth.uid());
  if not found then
    raise exception 'refund_not_found';
  end if;
end;
$$;

-- Profile: an account cannot be deleted while it has open orders (Table 3.1).
create or replace function public.list_open_orders()
  returns table (order_code text, status_detail text)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select o.order_code, o.status_detail
  from public.orders o
  where o.user_id = auth.uid()
    and (o.status_detail not in ('Completed', 'Cancelled', 'Refunded')
         or exists (select 1 from public.refund_requests r
                    where r.order_id = o.id and r.status not in ('Refunded', 'Rejected'))
         or exists (select 1 from public.cancel_requests c where c.order_id = o.id and c.status = 'pending'));
$$;

-- ---------------------------------------------------------------- CSKH

create or replace function public.decide_cancel_request(p_order_id uuid, p_accept boolean, p_reason text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  r public.cancel_requests;
  v_held integer;
begin
  perform public.require_role('cskh');
  o := public.lock_order(p_order_id, false);
  select * into r from public.cancel_requests where order_id = o.id and status = 'pending' for update;
  if not found then
    raise exception 'no_pending_request';
  end if;

  if p_accept then
    update public.cancel_requests set status = 'accepted', decided_at = now(), decided_by = auth.uid(), decision_reason = nullif(trim(p_reason), '')
    where id = r.id;
    perform public.restock_order(o.id);
    perform public.set_order_actor('cskh', 'CSKH chấp nhận yêu cầu hủy');
    update public.orders set status_detail = 'Cancelled' where id = o.id;
    perform public.create_refund(o, 'S1');
    perform public.notify(o.user_id, 'order', 'Yêu cầu hủy đã được chấp nhận', 'Vui lòng nhập tài khoản nhận hoàn trong chi tiết đơn.', public.order_link(o.order_code));
    return;
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  update public.cancel_requests set status = 'rejected', decided_at = now(), decided_by = auth.uid(), decision_reason = trim(p_reason)
  where id = r.id;
  -- Held working days are added to the delivery date, unless CSKH answered late (EX-16).
  v_held := case when now() > r.sla_due_at then 0
                 else public.working_days_between((r.created_at at time zone 'Asia/Ho_Chi_Minh')::date, public.vn_now()::date) end;
  if v_held > 0 and o.earliest_edd is not null then
    update public.orders
    set earliest_edd = public.add_working_days(earliest_edd, v_held), latest_edd = public.add_working_days(latest_edd, v_held)
    where id = o.id;
  end if;
  perform public.log_order_note(o.id, 'cskh', 'CSKH từ chối yêu cầu hủy: ' || trim(p_reason));
  perform public.notify(o.user_id, 'order', 'Yêu cầu hủy không được chấp nhận', trim(p_reason) || '. Đơn của bạn tiếp tục được xử lý.', public.order_link(o.order_code));
end;
$$;

-- Result of a support ticket (the ticket itself lives in CSKH & Khiếu nại).
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

-- ---------------------------------------------------------------- Operator (workshop)

create or replace function public.moderate_design(p_order_id uuid, p_approve boolean, p_violation text default null, p_reason text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  v_round smallint;
begin
  perform public.require_role('operator');
  o := public.lock_order(p_order_id, false);
  if o.status_detail <> 'Pending_Review' then
    raise exception 'handled_by_other';
  end if;
  if public.order_on_hold(o.id) then
    raise exception 'on_hold';
  end if;
  select count(*) + 1 into v_round from public.design_reviews where order_id = o.id;

  if p_approve then
    insert into public.design_reviews (order_id, round, decision, reviewer_id) values (o.id, v_round, 'approved', auth.uid());
    perform public.set_order_actor('operator', 'Duyệt bản thiết kế vòng ' || v_round);
    update public.orders set status_detail = 'Pending_Confirmation', confirmed_at = now(), batch_date = public.batch_date_for(now())
    where id = o.id;
    perform public.notify(o.user_id, 'design', 'Thiết kế đã được duyệt', 'Đơn ' || o.order_code || ' sẽ sớm được đưa vào sản xuất.', public.order_link(o.order_code));
    return;
  end if;

  if coalesce(trim(p_violation), '') = '' or coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  insert into public.design_reviews (order_id, round, decision, violation_group, reason, reviewer_id)
  values (o.id, v_round, 'rejected', trim(p_violation), trim(p_reason), auth.uid());
  perform public.set_order_actor('operator', 'Từ chối thiết kế vòng ' || v_round || ': ' || trim(p_violation));
  update public.orders set status_detail = 'Action_Required', rejected_at = now(), design_fix_reminded_at = null where id = o.id;
  perform public.notify(o.user_id, 'design', 'Thiết kế cần chỉnh sửa', 'Lý do: ' || trim(p_violation) || '. Bạn có 7 ngày để chỉnh sửa, hoặc có thể hủy đơn và nhận hoàn 100%.', public.order_link(o.order_code));
end;
$$;

-- Daily 16:00 run (Mon–Fri) plus any order that missed its run. Called by Operator or pg_cron.
create or replace function public.start_production()
  returns integer
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_today date := public.vn_now()::date;
  v_due_now boolean := public.is_working_day(v_today) and public.vn_now()::time >= time '16:00';
  v_count integer := 0;
  v_id uuid;
begin
  perform public.require_role('operator');
  perform public.set_order_actor(case when coalesce(auth.role(), '') = 'service_role' then 'system' else 'operator' end, 'Bắt đầu sản xuất');
  for v_id in
    select o.id from public.orders o
    where o.status_detail = 'Pending_Confirmation' and o.confirmed_at is not null
      and public.order_has_custom(o.id) and not public.order_on_hold(o.id)
      and (o.batch_date < v_today or (o.batch_date = v_today and v_due_now))
    for update
  loop
    update public.orders set status_detail = 'In_Production' where id = v_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.mark_packed(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
begin
  perform public.require_role('operator');
  o := public.lock_order(p_order_id, false);
  if public.order_on_hold(o.id) then
    raise exception 'on_hold';
  end if;
  if o.status_detail = 'Pending_Confirmation' then
    if public.order_has_custom(o.id) then
      raise exception 'custom_needs_production';
    end if;
    if o.confirmed_at is null and (o.confirm_due_at is null or now() <= o.confirm_due_at) then
      raise exception 'not_confirmed';
    end if;
  elsif o.status_detail <> 'In_Production' then
    raise exception 'cannot_pack';
  end if;
  perform public.set_order_actor('operator', 'Đã đóng gói');
  update public.orders set status_detail = 'Ready_for_Pickup' where id = o.id;
end;
$$;

create or replace function public.mark_qc_reprint(p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
begin
  perform public.require_role('operator');
  o := public.lock_order(p_order_id, false);
  if o.status_detail <> 'In_Production' then
    raise exception 'cannot_reprint';
  end if;
  update public.orders
  set qc_reprint_count = qc_reprint_count + 1,
      earliest_edd = public.add_working_days(earliest_edd, 1),
      latest_edd = public.add_working_days(latest_edd, 1)
  where id = o.id;
  perform public.log_order_note(o.id, 'operator', 'In lại do lỗi QC (+1 ngày làm việc)');
  perform public.notify(o.user_id, 'order', 'Cập nhật tiến độ', 'Sản phẩm được in lại để bảo đảm chất lượng, ngày giao lùi 1 ngày làm việc.', public.order_link(o.order_code));
end;
$$;

-- ---------------------------------------------------------------- carrier (mock 3PL / Edge Function)

-- p_type: In_Transit | Delivered | Delivery_Failed | Warehouse_Received. Idempotent per event id.
create or replace function public.apply_carrier_event(p_event_id text, p_order_id uuid, p_type text, p_failure_cause text default null)
  returns text
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o public.orders;
  v_ship uuid;
  v_attempt smallint;
  v_rows integer;
  v_late integer;
begin
  perform public.require_role('operator', 'admin');
  insert into public.webhook_events (event_id, order_id, type, payload)
  values (p_event_id, p_order_id, p_type, jsonb_build_object('failure_cause', p_failure_cause))
  on conflict (event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 'duplicate';
  end if;

  o := public.lock_order(p_order_id, false);
  select id into v_ship from public.shipments where order_id = o.id;

  if p_type = 'In_Transit' then
    if o.status_detail <> 'Ready_for_Pickup' then
      raise exception 'invalid_state';
    end if;
    if v_ship is null then
      insert into public.shipments (order_id, carrier, tracking_code)
      values (o.id, 'Giao Hàng Nhanh', 'GHN' || replace(replace(o.order_code, 'CC-', ''), '-', ''))
      returning id into v_ship;
    end if;
    select coalesce(max(attempt_no), 0) + 1 into v_attempt from public.delivery_attempts where shipment_id = v_ship;
    insert into public.delivery_attempts (shipment_id, attempt_no) values (v_ship, v_attempt);
    perform public.set_order_actor('carrier', 'Đơn vị vận chuyển đã lấy hàng');
    update public.orders set status_detail = 'In_Transit' where id = o.id;

  elsif p_type = 'Delivered' then
    if o.status_detail <> 'In_Transit' then
      raise exception 'invalid_state';
    end if;
    update public.delivery_attempts set result = 'delivered', ended_at = now()
    where shipment_id = v_ship and ended_at is null;
    perform public.set_order_actor('carrier', 'Giao hàng thành công');
    update public.orders set status_detail = 'Delivered', delivered_at = now(), auto_complete_at = now() + interval '72 hours', frozen_at = null
    where id = o.id;
    -- Late delivery voucher: 10% of goods, max 30.000đ, + Hỏa tốc surcharge (once per order).
    if not o.late_voucher_issued and o.latest_edd is not null and public.vn_now()::date > o.latest_edd then
      v_late := least(round(o.goods_total * 0.10)::integer, 30000);
      insert into public.order_vouchers (order_id, kind, code, value, expires_at)
      values (o.id, 'late_delivery', 'TRE-' || upper(substr(md5(random()::text), 1, 6)), v_late, now() + interval '30 days');
      if o.express_surcharge > 0 then
        insert into public.order_vouchers (order_id, kind, code, value, expires_at)
        values (o.id, 'express_surcharge', 'HOATOC-' || upper(substr(md5(random()::text), 1, 6)), o.express_surcharge, now() + interval '30 days');
      end if;
      update public.orders set late_voucher_issued = true where id = o.id;
      perform public.notify(o.user_id, 'order', 'Xin lỗi vì đơn giao trễ', 'CasEYE’s gửi bạn voucher bù giao trễ, xem trong chi tiết đơn.', public.order_link(o.order_code));
    end if;
    perform public.notify(o.user_id, 'order', 'Đơn hàng đã được giao', 'Hãy kiểm tra sản phẩm và bấm "Đã nhận được hàng" khi bạn hài lòng.', public.order_link(o.order_code));

  elsif p_type = 'Delivery_Failed' then
    if o.status_detail <> 'In_Transit' or coalesce(p_failure_cause, '') = '' then
      raise exception 'invalid_state';
    end if;
    update public.delivery_attempts set result = 'failed', failure_cause = p_failure_cause, ended_at = now()
    where shipment_id = v_ship and ended_at is null;
    perform public.set_order_actor('carrier', 'Giao hàng không thành công');
    update public.orders set status_detail = 'Delivery_Failed', failure_cause = p_failure_cause, fault_override = null, warehouse_hold_until = null
    where id = o.id;
    perform public.notify(o.user_id, 'order', 'Giao hàng không thành công', 'Hàng đang được chuyển về kho của shop.', public.order_link(o.order_code));

  elsif p_type = 'Warehouse_Received' then
    if o.status_detail <> 'Delivery_Failed' then
      raise exception 'invalid_state';
    end if;
    if o.payment_method = 'cod' and public.is_customer_fault(o.failure_cause) then
      -- COD + customer fault: closed when the goods come back (stock goods return to stock).
      if not public.order_has_custom(o.id) then
        perform public.restock_order(o.id);
      end if;
      perform public.set_order_actor('system', 'Hàng về kho, đơn COD được đóng');
      update public.orders set status_detail = 'Cancelled' where id = o.id;
    else
      update public.orders set warehouse_hold_until = now() + interval '14 days' where id = o.id;
      perform public.log_order_note(o.id, 'carrier', 'Hàng đã về kho, giữ 14 ngày');
      perform public.notify(o.user_id, 'order', 'Hàng đã về kho', 'Vui lòng chọn giao lại hoặc hủy đơn trong 14 ngày.', public.order_link(o.order_code));
    end if;
  else
    raise exception 'invalid_event';
  end if;
  return 'applied';
end;
$$;

-- ---------------------------------------------------------------- Admin (refunds, manual transfer)

create or replace function public.lock_refund(p_refund_id uuid)
  returns public.refund_requests
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  r public.refund_requests;
begin
  perform public.require_role('admin');
  select * into r from public.refund_requests where id = p_refund_id for update;
  if not found then
    raise exception 'refund_not_found';
  end if;
  return r;
end;
$$;
revoke execute on function public.lock_refund(uuid) from public, anon, authenticated;

create or replace function public.approve_refund(p_refund_id uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
declare r public.refund_requests := public.lock_refund(p_refund_id);
begin
  if r.status <> 'Pending_Approval' then raise exception 'handled_by_other'; end if;
  if r.refund_method is null then raise exception 'no_account'; end if;
  update public.refund_requests set status = 'Processing', approved_by = auth.uid() where id = r.id;
end;
$$;

create or replace function public.complete_refund(p_refund_id uuid, p_bank_ref text)
  returns void language plpgsql security definer set search_path = ''
as $$
declare
  r public.refund_requests := public.lock_refund(p_refund_id);
  o public.orders;
begin
  if r.status not in ('Processing', 'Refund_Pending_Manual') then raise exception 'handled_by_other'; end if;
  if coalesce(trim(p_bank_ref), '') = '' then raise exception 'bank_ref_required'; end if;
  update public.refund_requests set status = 'Refunded', bank_ref = trim(p_bank_ref), resolved_at = now() where id = r.id;
  select * into o from public.orders where id = r.order_id;
  perform public.notify(o.user_id, 'payment', 'Đã hoàn tiền', r.amount || ' đ đã được chuyển với nội dung "HOAN ' || o.order_code || '".', public.order_link(o.order_code));
end;
$$;

create or replace function public.mark_transfer_failed(p_refund_id uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
declare
  r public.refund_requests := public.lock_refund(p_refund_id);
  o public.orders;
begin
  if r.status <> 'Processing' then raise exception 'handled_by_other'; end if;
  update public.refund_requests
  set transfer_attempts = transfer_attempts + 1,
      status = case when transfer_attempts + 1 >= 2 then 'Refund_Pending_Manual' else 'Refund_Pending_Retry' end
  where id = r.id;
  if r.transfer_attempts + 1 < 2 then
    select * into o from public.orders where id = r.order_id;
    perform public.notify(o.user_id, 'payment', 'Cần xác nhận lại tài khoản nhận hoàn', 'Chuyển khoản chưa thành công. Vui lòng kiểm tra lại thông tin tài khoản.', public.order_link(o.order_code));
  end if;
end;
$$;

create or replace function public.retry_transfer(p_refund_id uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
declare r public.refund_requests := public.lock_refund(p_refund_id);
begin
  if r.status <> 'Refund_Pending_Retry' then raise exception 'handled_by_other'; end if;
  update public.refund_requests set status = 'Processing' where id = r.id;
end;
$$;

create or replace function public.reject_refund(p_refund_id uuid, p_reason text)
  returns void language plpgsql security definer set search_path = ''
as $$
declare
  r public.refund_requests := public.lock_refund(p_refund_id);
  o public.orders;
begin
  if r.status <> 'Pending_Approval' then raise exception 'handled_by_other'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update public.refund_requests set status = 'Rejected', reject_reason = trim(p_reason), approved_by = auth.uid(), resolved_at = now() where id = r.id;
  select * into o from public.orders where id = r.order_id;
  perform public.notify(o.user_id, 'payment', 'Yêu cầu hoàn tiền bị từ chối', trim(p_reason), public.order_link(o.order_code));
end;
$$;

-- ---------------------------------------------------------------- API grants

do $$
declare
  f text;
begin
  foreach f in array array[
    'place_order(jsonb, jsonb)', 'cancel_order(uuid)', 'request_cancel(uuid, text, text)', 'withdraw_cancel_request(uuid)',
    'resubmit_design(uuid)', 'cancel_rejected_order(uuid)', 'confirm_received(uuid)', 'report_issue(uuid, text)',
    'request_redelivery(uuid)', 'cancel_after_failure(uuid)', 'submit_refund_account(uuid, text, text, text)', 'list_open_orders()',
    'decide_cancel_request(uuid, boolean, text)', 'apply_ticket_result(uuid, text, text)',
    'moderate_design(uuid, boolean, text, text)', 'start_production()', 'mark_packed(uuid)', 'mark_qc_reprint(uuid)',
    'apply_carrier_event(text, uuid, text, text)',
    'approve_refund(uuid)', 'complete_refund(uuid, text)', 'mark_transfer_failed(uuid)', 'retry_transfer(uuid)', 'reject_refund(uuid, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
