-- Rollback P0-4: back to the place_order of 20261114100400_order_rpcs.sql (body copied verbatim)
-- and drop the columns v3 added. Orders keep every other value.

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

drop index if exists public.orders_checkout_ref_key;
alter table public.orders drop constraint if exists orders_gift_message_check;
alter table public.orders
  drop column if exists checkout_ref,
  drop column if exists shipper_note,
  drop column if exists gift_message;
