-- Checkout functions. They run with elevated rights, so they re-check everything themselves.
--
-- place_order items format:    [{ "type": "product", "id": "<variant id>", "qty": 2 },
--                               { "type": "design",  "id": "<design id>",  "qty": 1 }]
-- place_order shipping format: { "recipient", "phone", "line", "ward", "district", "city" }
--
-- If anything fails (bad item, out of stock, ...) the whole order is rolled back.

create function public.place_order(p_items jsonb, p_shipping jsonb)
  returns uuid
  language plpgsql
security definer
set search_path = ''
as $$
declare
v_user     uuid := auth.uid();
  v_order_id uuid;
  v_item     jsonb;
  v_qty      integer;
  v_total    integer := 0;
  v_variant  uuid;
  v_design   uuid;
  v_inv      uuid;
  v_price    integer;
  v_name     text;
  v_image    text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
end if;

insert into public.orders (user_id, recipient, phone, address_line, ward, district, city)
values (v_user,
        p_shipping ->> 'recipient', p_shipping ->> 'phone', p_shipping ->> 'line',
        p_shipping ->> 'ward', p_shipping ->> 'district', p_shipping ->> 'city')
  returning id into v_order_id;

for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty := (v_item ->> 'qty')::integer;
if v_qty is null or v_qty < 1 then
      raise exception 'invalid_quantity';
end if;

    v_variant := null;
    v_design  := null;

    if v_item ->> 'type' = 'product' then
      -- price and stock source come from the database, never from the browser
select v.id, v.price, p.name || coalesce(' - ' || v.name, ''), p.image_url, v.inventory_item_id
into v_variant, v_price, v_name, v_image, v_inv
from public.product_variants v
       join public.products p on p.id = v.product_id
where v.id = (v_item ->> 'id')::uuid and v.is_active and p.is_active;
if not found then
        raise exception 'product_not_found';
end if;

    elsif v_item ->> 'type' = 'design' then
select d.id, m.custom_price, d.name, d.preview_url, b.id
into v_design, v_price, v_name, v_image, v_inv
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

    -- take stock (one atomic statement, so two buyers cannot both get the last one)
update public.inventory_items
set quantity_on_hand = quantity_on_hand - v_qty
where id = v_inv and quantity_on_hand >= v_qty;
if not found then
      raise exception 'out_of_stock';
end if;

insert into public.order_items
(order_id, variant_id, design_id, inventory_item_id, name, image_url, unit_price, qty)
values
  (v_order_id, v_variant, v_design, v_inv, v_name, v_image, v_price, v_qty);

v_total := v_total + v_price * v_qty;
end loop;

update public.orders set total = v_total where id = v_order_id;
return v_order_id;
end;
$$;

-- Customers may cancel only while the order is still pending. Stock goes back.
create function public.cancel_order(p_order_id uuid)
  returns void
  language plpgsql
security definer
set search_path = ''
as $$
declare
v_status public.order_status;
begin
select status into v_status
from public.orders
where id = p_order_id and user_id = auth.uid()
  for update;
if not found then
    raise exception 'order_not_found';
end if;
  if v_status <> 'pending' then
    raise exception 'cannot_cancel';
end if;

update public.inventory_items i
set quantity_on_hand = i.quantity_on_hand + s.qty
  from (select inventory_item_id, sum(qty)::integer as qty
            from public.order_items
           where order_id = p_order_id
           group by inventory_item_id) s
where i.id = s.inventory_item_id;

update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- Only signed-in users may call them.
revoke execute on function public.place_order(jsonb, jsonb) from public, anon;
revoke execute on function public.cancel_order(uuid)        from public, anon;
grant  execute on function public.place_order(jsonb, jsonb) to authenticated;
grant  execute on function public.cancel_order(uuid)        to authenticated;
