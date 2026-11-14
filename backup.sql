


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."inventory_kind" AS ENUM (
    'blank',
    'material',
    'trade_good'
);


ALTER TYPE "public"."inventory_kind" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'shipping',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."product_type" AS ENUM (
    'case',
    'accessory'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_order"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."cancel_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_order_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status)
    values (new.id, new.status);
end if;
return new;
end;
$$;


ALTER FUNCTION "public"."log_order_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order"("p_items" "jsonb", "p_shipping" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."place_order"("p_items" "jsonb", "p_shipping" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recipient" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "line" "text" NOT NULL,
    "ward" "text" NOT NULL,
    "district" "text",
    "city" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone_model_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'My design'::"text" NOT NULL,
    "canvas_json" "jsonb" NOT NULL,
    "preview_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "public"."inventory_kind" NOT NULL,
    "name" "text" NOT NULL,
    "phone_model_id" "uuid",
    "quantity_on_hand" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "blank_needs_phone_model" CHECK ((("kind" = 'blank'::"public"."inventory_kind") = ("phone_model_id" IS NOT NULL))),
    CONSTRAINT "inventory_items_quantity_on_hand_check" CHECK (("quantity_on_hand" >= 0))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "design_id" "uuid",
    "inventory_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text",
    "unit_price" integer NOT NULL,
    "qty" integer NOT NULL,
    CONSTRAINT "one_source" CHECK (("num_nonnulls"("variant_id", "design_id") = 1)),
    CONSTRAINT "order_items_qty_check" CHECK (("qty" > 0)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "public"."order_status" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "total" integer DEFAULT 0 NOT NULL,
    "payment_method" "text" DEFAULT 'cod'::"text" NOT NULL,
    "recipient" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address_line" "text" NOT NULL,
    "ward" "text" NOT NULL,
    "district" "text",
    "city" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_total_check" CHECK (("total" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "custom_price" integer NOT NULL,
    "mask_image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "phone_models_custom_price_check" CHECK (("custom_price" >= 0))
);


ALTER TABLE "public"."phone_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text",
    "phone_model_id" "uuid",
    "inventory_item_id" "uuid" NOT NULL,
    "price" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_variants_price_check" CHECK (("price" >= 0))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "product_type" "public"."product_type" NOT NULL,
    "image_url" "text",
    "gallery_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "device_type" "text",
    "preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "onboarding_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_availability" AS
 SELECT "id" AS "inventory_item_id",
    "quantity_on_hand" AS "available"
   FROM "public"."inventory_items"
  WHERE ("kind" = ANY (ARRAY['blank'::"public"."inventory_kind", 'trade_good'::"public"."inventory_kind"]));


ALTER VIEW "public"."stock_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL
);


ALTER TABLE "public"."test" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_models"
    ADD CONSTRAINT "phone_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_models"
    ADD CONSTRAINT "phone_models_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_phone_model_id_key" UNIQUE ("product_id", "phone_model_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test"
    ADD CONSTRAINT "test_pkey" PRIMARY KEY ("id");



CREATE INDEX "addresses_user_idx" ON "public"."addresses" USING "btree" ("user_id");



CREATE INDEX "designs_user_idx" ON "public"."designs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "one_blank_per_phone_model" ON "public"."inventory_items" USING "btree" ("phone_model_id") WHERE ("kind" = 'blank'::"public"."inventory_kind");



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_status_history_order_idx" ON "public"."order_status_history" USING "btree" ("order_id", "created_at");



CREATE INDEX "orders_user_idx" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "product_variants_product_idx" ON "public"."product_variants" USING "btree" ("product_id");



CREATE OR REPLACE TRIGGER "orders_log_status" AFTER INSERT OR UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_order_status"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_phone_model_id_fkey" FOREIGN KEY ("phone_model_id") REFERENCES "public"."phone_models"("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_phone_model_id_fkey" FOREIGN KEY ("phone_model_id") REFERENCES "public"."phone_models"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_phone_model_id_fkey" FOREIGN KEY ("phone_model_id") REFERENCES "public"."phone_models"("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anyone reads active phone models" ON "public"."phone_models" FOR SELECT USING ("is_active");



CREATE POLICY "anyone reads active products" ON "public"."products" FOR SELECT USING ("is_active");



CREATE POLICY "anyone reads active variants" ON "public"."product_variants" FOR SELECT USING ("is_active");



CREATE POLICY "anyone signed in can read" ON "public"."test" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."designs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manage own addresses" ON "public"."addresses" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "manage own designs" ON "public"."designs" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "read own order history" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "read own order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "read own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "signed in can add" ON "public"."test" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."test" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_all" ON "public"."test" USING (true) WITH CHECK (true);



CREATE POLICY "update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_order_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_order_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_order_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."place_order"("p_items" "jsonb", "p_shipping" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order"("p_items" "jsonb", "p_shipping" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_order"("p_items" "jsonb", "p_shipping" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."designs" TO "anon";
GRANT ALL ON TABLE "public"."designs" TO "authenticated";
GRANT ALL ON TABLE "public"."designs" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."phone_models" TO "anon";
GRANT ALL ON TABLE "public"."phone_models" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_models" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("display_name"),UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("avatar_url"),UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("device_type"),UPDATE("device_type") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("preferences"),UPDATE("preferences") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("onboarding_status"),UPDATE("onboarding_status") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."stock_availability" TO "service_role";
GRANT SELECT ON TABLE "public"."stock_availability" TO "anon";
GRANT SELECT ON TABLE "public"."stock_availability" TO "authenticated";



GRANT ALL ON TABLE "public"."test" TO "anon";
GRANT ALL ON TABLE "public"."test" TO "authenticated";
GRANT ALL ON TABLE "public"."test" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































