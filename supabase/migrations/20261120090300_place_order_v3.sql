-- P0-4 · place_order v3: idempotent checkout, server-side codes and fees (Spec B6, B8, part of B9).
-- Same signature and return type as before: place_order(p_items jsonb, p_shipping jsonb) → uuid.
--
-- Changes from 20261114100400:
--   * p_shipping.checkout_ref (Checkout session id): a second call with the same ref returns the
--     order that already exists instead of creating a new one (BR-P-10, FR-P-13, FR-P-35 retries).
--   * The order code is always CC-YYMMDD-NNNN from the database; p_shipping.order_code is ignored.
--   * The shipping fee is computed here (Standard 25.000 ₫, Hỏa tốc 45.000 ₫ = 25.000 + 20.000, BR-P-03);
--     p_shipping.fee / standard_fee / express_surcharge are ignored.
--   * Vouchers stay a front-end mock-up (team decision): p_shipping.discount is kept but clamped to
--     0 … goods total, so a forged value can never make the order negative or free of goods.
--   * p_shipping.shipper_note and p_shipping.gift_message (≤ 150 chars) are stored on the order.
--   * Design lines may carry "sku" (studio SKU, e.g. sku-ip15pm-lilac): the blank of that SKU is used,
--     otherwise the model's blank with the most stock (decision Q2: stock per SKU blank).
--   * Design lines may carry "design_version" (stored on order_items; default 1).
-- Rollback: supabase/rollbacks/20261120090300_place_order_v3.down.sql

alter table public.orders
  add column if not exists checkout_ref text,
  add column if not exists shipper_note text,
  add column if not exists gift_message text;

alter table public.orders drop constraint if exists orders_gift_message_check;
alter table public.orders add constraint orders_gift_message_check check (gift_message is null or char_length(gift_message) <= 150);
create unique index if not exists orders_checkout_ref_key on public.orders (checkout_ref) where checkout_ref is not null;

create or replace function public.place_order(p_items jsonb, p_shipping jsonb)
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  c_standard_fee   constant integer := 25000;
  c_express_extra  constant integer := 20000;
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
  v_version    integer;
  v_cod        boolean := coalesce(p_shipping ->> 'payment_method', 'prepaid') = 'cod';
  v_express    boolean := coalesce(p_shipping ->> 'tier', 'standard') = 'express';
  v_fee        integer;
  v_discount   integer := greatest(0, coalesce((p_shipping ->> 'discount')::integer, 0));
  v_ref        text := nullif(trim(coalesce(p_shipping ->> 'checkout_ref', '')), '');
  v_has_custom boolean;
  v_code       text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Idempotency: one order per checkout session. The lock serialises two concurrent retries.
  if v_ref is not null then
    perform pg_advisory_xact_lock(hashtext('place_order:' || v_ref));
    select o.id into v_order_id from public.orders o where o.checkout_ref = v_ref;
    if found then
      if not exists (select 1 from public.orders o where o.id = v_order_id and o.user_id = v_user) then
        raise exception 'checkout_ref_conflict';
      end if;
      return v_order_id;
    end if;
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

  v_fee := c_standard_fee + case when v_express then c_express_extra else 0 end;
  v_code := 'CC-' || to_char(public.vn_now(), 'YYMMDD') || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0');

  perform public.set_order_actor('customer', 'Đặt hàng thành công');
  insert into public.orders (
    user_id, order_code, checkout_ref, status_detail, payment_method, payment_status, payment_channel, payment_txn_ref,
    recipient, phone, address_line, ward, district, city, shipper_note, gift_message,
    shipping_tier, shipping_fee, standard_fee, express_surcharge, transit_min, transit_max, discount,
    earliest_edd, latest_edd, batch_date, confirm_due_at, confirmed_at, review_queued_at)
  values (
    v_user, v_code, v_ref,
    case when v_has_custom then 'Pending_Review' else 'Pending_Confirmation' end,
    case when v_cod then 'cod' else 'prepaid' end,
    case when v_cod then 'unpaid' else 'paid' end,
    p_shipping ->> 'payment_channel', p_shipping ->> 'payment_txn_ref',
    p_shipping ->> 'recipient', p_shipping ->> 'phone', p_shipping ->> 'line',
    p_shipping ->> 'ward', p_shipping ->> 'district', p_shipping ->> 'city',
    nullif(left(trim(coalesce(p_shipping ->> 'shipper_note', '')), 500), ''),
    nullif(left(trim(coalesce(p_shipping ->> 'gift_message', '')), 150), ''),
    case when v_express then 'express' else 'standard' end,
    v_fee, c_standard_fee, case when v_express then c_express_extra else 0 end,
    coalesce((p_shipping ->> 'transit_min')::smallint, 1), coalesce((p_shipping ->> 'transit_max')::smallint, 2), 0,
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
    v_version := 1;

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
      select d.id, m.custom_price, d.name, d.preview_url, m.name
      into v_design, v_price, v_name, v_image, v_model
      from public.designs d
      join public.phone_models m on m.id = d.phone_model_id
      where d.id = (v_item ->> 'id')::uuid and d.user_id = v_user and m.is_active;
      if not found then
        raise exception 'design_not_found';
      end if;
      -- Blank of the chosen SKU, else the model's blank with the most stock.
      select b.id into v_inv
      from public.inventory_items b
      join public.designs d on d.phone_model_id = b.phone_model_id
      where d.id = v_design and b.kind = 'blank'
      order by (b.sku_code is not distinct from nullif(v_item ->> 'sku', '')) desc, b.quantity_on_hand desc
      limit 1;
      if v_inv is null then
        raise exception 'out_of_stock';
      end if;
      v_version := greatest(1, coalesce((v_item ->> 'design_version')::integer, 1));
    else
      raise exception 'invalid_item_type';
    end if;

    update public.inventory_items set quantity_on_hand = quantity_on_hand - v_qty
    where id = v_inv and quantity_on_hand >= v_qty;
    if not found then
      raise exception 'out_of_stock';
    end if;

    insert into public.order_items (order_id, variant_id, design_id, inventory_item_id, name, image_url, unit_price, qty, phone_model, design_version)
    values (v_order_id, v_variant, v_design, v_inv, v_name, v_image, v_price, v_qty, v_model, v_version);
    v_goods := v_goods + v_price * v_qty;
  end loop;

  v_discount := least(v_discount, v_goods);
  update public.orders
  set goods_total = v_goods, discount = v_discount, total = greatest(0, v_goods + v_fee - v_discount)
  where id = v_order_id;
  insert into public.policy_consents (order_id, user_id, policy_version) values (v_order_id, v_user, p_shipping ->> 'policy_version');
  perform public.notify(v_user, 'order', 'Đặt hàng thành công', 'Cảm ơn bạn đã đặt hàng! Đơn ' || v_code || ' đã được ghi nhận.', public.order_link(v_code));
  return v_order_id;
end;
$$;

revoke execute on function public.place_order(jsonb, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;
