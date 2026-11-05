create type public.order_status as enum ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled');
create type public.inventory_kind as enum ('blank', 'material', 'trade_good');
create type public.product_type as enum ('case', 'accessory');

create function public.handle_new_user()
  returns trigger
  language plpgsql
security definer
set search_path = ''
as $$
begin
insert into public.profiles (id, full_name)
values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
