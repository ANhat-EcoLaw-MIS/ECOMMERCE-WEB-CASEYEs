// Runs every Supabase migration of the repo on an in-memory Postgres (PGlite) with small stubs
// for Supabase's auth/storage schemas, then plays the order scenarios and the rollbacks.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2];
const MIG = join(ROOT, 'supabase', 'migrations');
const RB = join(ROOT, 'supabase', 'rollbacks');
const db = new PGlite();
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

const files = readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  try {
    await db.exec(readFileSync(join(MIG, f), 'utf8'));
    console.log(`MIGRATE ${f}`);
  } catch (e) {
    console.log(`MIGRATE FAILED ${f}: ${e.message} ${e.where ?? ''}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------- data
// P0-1 (Spec B1): sign-up works without any workaround and the profile starts in onboarding.
const uid = async (email) => (await db.query(`insert into auth.users (email) values ($1) returning id`, [email])).rows[0].id;
const A = await uid('a@test.vn'), B = await uid('b@test.vn'), OP = await uid('op@test.vn'), CS = await uid('cs@test.vn'), AD = await uid('ad@test.vn');
ok((await db.query(`select count(*)::int n from public.profiles where onboarding_status = 'pending'`)).rows[0].n === 5, 'P0-1: sign-up trigger creates profiles with onboarding_status = pending');
ok((await db.query(`select display_name from public.profiles where id = $1`, [A])).rows[0].display_name === 'a', 'P0-1: display name from the e-mail');
ok((await db.query(`select count(*)::int n from public.profiles where role = 'customer'`)).rows[0].n === 5, 'M1: existing profiles get role = customer');
await db.query(`update public.profiles set role = 'operator' where id = $1`, [OP]);
await db.query(`update public.profiles set role = 'cskh' where id = $1`, [CS]);
await db.query(`update public.profiles set role = 'admin' where id = $1`, [AD]);

async function as(user, sql, params = []) {
  await db.exec(`set request.jwt.claim.sub = '${user}'; set request.jwt.claim.role = 'authenticated'; set role authenticated;`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;`);
  }
}
async function expectError(user, sql, params, text, msg) {
  try {
    await as(user, sql, params);
    ok(false, `${msg} (no error)`);
  } catch (e) {
    ok(e.message.includes(text), `${msg} → ${e.message}`);
  }
}
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];

const ship = (extra = {}) => JSON.stringify({
  recipient: 'Nguyễn A', phone: '0900000000', line: '1 Lê Lợi', ward: 'Bến Nghé', city: 'TP. Hồ Chí Minh',
  payment_method: 'prepaid', payment_channel: 'vietqr', tier: 'standard', fee: 25000, standard_fee: 25000,
  transit_min: 1, transit_max: 2, policy_version: 'CS-DH-2.0', earliest_edd: '2026-11-20', latest_edd: '2026-11-22', ...extra,
});

// onboarding: a customer may finish (pending → completed) but never set an unknown value
ok((await as(A, `update public.profiles set onboarding_status = 'completed' where id = $1 returning id`, [A])).rows.length === 1, 'P0-1: customer completes onboarding');
await expectError(B, `update public.profiles set onboarding_status = 'done' where id = $1`, [B], 'profiles_onboarding_status_check', 'P0-1: unknown onboarding status refused');

// P1-1: profile fields shown on /account are stored
ok((await as(A, `update public.profiles set phone = '0912345678', birth_date = '2000-05-01', gender = 'female' where id = $1 returning phone, gender`, [A])).rows[0]?.gender === 'female', 'P1-1: customer saves phone, birth date, gender');
await expectError(B, `update public.profiles set phone = '0912345678' where id = $1`, [B], 'profiles_phone_key', 'P1-1: a phone number belongs to one account');
await expectError(B, `update public.profiles set phone = '12345' where id = $1`, [B], 'profiles_phone_check', 'P1-1: invalid phone refused');
await expectError(B, `update public.profiles set birth_date = current_date - 365 where id = $1`, [B], 'birth_date_too_young', 'P1-1: under 13 refused');
await expectError(B, `update public.profiles set gender = 'x' where id = $1`, [B], 'profiles_gender_check', 'P1-1: unknown gender refused');
ok((await as(B, `update public.profiles set phone = '0987654321' where id = $1 returning id`, [A])).rows.length === 0, 'P1-1: B cannot edit A\'s profile');
ok((await as(A, `update public.profiles set deletion_requested_at = now() where id = $1 returning deletion_requested_at`, [A])).rows[0].deletion_requested_at !== null, 'P1-1: deletion request stored');
await as(A, `update public.profiles set deletion_requested_at = null where id = $1`, [A]);

// ---------------------------------------------------------------- template comments (Design Studio)
await db.query(`update public.profiles set display_name = 'Lan Anh' where id = $1`, [A]);
const c1 = (await as(A, `insert into public.template_comments (template_id, device_model, comment) values ('tpl-cloud-kittens', 'iPhone 15 Pro Max', '  Màu rất xinh  ') returning id, author_name, comment`)).rows[0];
ok(c1.author_name === 'Lan Anh' && c1.comment === 'Màu rất xinh', 'comments: posted with the profile name, trimmed');
const spoof = (await as(B, `insert into public.template_comments (template_id, comment) values ('tpl-cloud-kittens', 'Tôi là B') returning author_name`)).rows[0];
ok(spoof.author_name !== 'Lan Anh', 'comments: B posts under B\'s own name');
await expectError(B, `insert into public.template_comments (template_id, comment, author_name) values ('tpl-cloud-kittens', 'giả danh', 'Lan Anh')`, [], 'permission denied', 'comments: author name cannot be sent by the browser');
await expectError(A, `insert into public.template_comments (template_id, comment) values ('tpl-cloud-kittens', '   ')`, [], 'template_comments_comment_check', 'comments: empty comment refused');
await expectError(A, `select user_id from public.template_comments`, [], 'permission denied', 'comments: user ids are not exposed');
await db.exec(`set role anon;`);
ok((await db.query(`select count(*)::int n from public.template_comments where template_id = 'tpl-cloud-kittens'`)).rows[0].n === 2, 'comments: visitors (anon) read them');
try {
  await db.query(`insert into public.template_comments (template_id, comment) values ('tpl-cloud-kittens', 'x')`);
  ok(false, 'comments: visitors cannot post (no error)');
} catch (e) {
  ok(e.message.includes('permission denied'), `comments: visitors cannot post → ${e.message}`);
}
await db.exec(`reset role;`);
ok((await as(B, `delete from public.template_comments where id = $1 returning id`, [c1.id])).rows.length === 0, 'comments: B cannot delete A\'s comment');
ok((await as(A, `delete from public.template_comments where id = $1 returning id`, [c1.id])).rows.length === 1, 'comments: author deletes own comment');

// ---------------------------------------------------------------- P0-2/P0-3: catalog seed v2 = supabase/seed/catalog.json
const catalog = JSON.parse(readFileSync(join(ROOT, 'supabase', 'seed', 'catalog.json'), 'utf8'));
const skus = catalog.phoneModels.flatMap((m) => m.skus.map((s) => ({ ...s, model: m.slug })));
const activeVariants = (await as(A, `select p.slug, m.slug model, v.color_sku sku, v.price from public.product_variants v
  join public.products p on p.id = v.product_id left join public.phone_models m on m.id = v.phone_model_id`)).rows;
const missing = [];
for (const d of catalog.designs.filter((x) => !x.soldOut)) {
  for (const s of skus) {
    const v = activeVariants.find((r) => r.slug === d.id && r.model === s.model && r.sku === s.skuId);
    if (!v || v.price !== s.price + d.premium) missing.push(`${d.id}:${s.skuId}`);
  }
}
for (const a of catalog.accessories) {
  const v = activeVariants.find((r) => r.slug === a.id && r.model === null);
  if (!v || v.price !== a.price) missing.push(a.id);
}
ok(missing.length === 0, `P0-3: every shop artwork × SKU and accessory has an active variant at the UI price (missing: ${missing.slice(0, 5).join(', ') || 'none'})`);
ok(activeVariants.some((r) => r.model === 'iphone-15-pro-max'), 'P0-3: iphone-15-pro-max has ready-made case variants (Spec B5)');
const activeModels = (await as(A, `select slug from public.phone_models order by slug`)).rows.map((r) => r.slug);
ok(JSON.stringify(activeModels) === JSON.stringify(catalog.phoneModels.map((m) => m.slug).sort()),
  `P0-3: active phone models = catalog (Shop / Studio / onboarding): ${activeModels.join(', ')}`);
ok(!activeVariants.some((r) => ['accessory-magsafe', 'accessory-airpods', 'accessory-strap'].includes(r.slug)), 'P0-3: seed v1 accessories are hidden');
ok(!activeVariants.some((r) => r.slug === 'mono-heart'), 'P0-3: sold-out artwork has no active variant');
ok((await one(`select count(*)::int n from public.inventory_items where kind = 'blank' and sku_code is not null`)).n === skus.length, `P0-2: one blank per SKU (${skus.length})`);
ok((await as(A, `select count(*)::int n from public.stock_availability`)).rows[0].n > 0, 'stock_availability readable by customers');
const catalogCount = async () => (await one(`select (select count(*) from public.products) + (select count(*) from public.product_variants)
  + (select count(*) from public.inventory_items) n`)).n;
const countBefore = await catalogCount();
await db.exec(readFileSync(join(MIG, '20261120090200_seed_catalog_v2.sql'), 'utf8'));
ok((await catalogCount()) === countBefore, 'P0-3: seed v2 is idempotent (re-run adds nothing)');

const variantRow = await one(`select v.id, v.price, v.inventory_item_id from public.product_variants v join public.products p on p.id = v.product_id
  where p.slug = 'bloom-club' and v.color_sku = 'sku-ip15pm-titanium'`);
const variant = variantRow.id;
const model = (await one(`select id from public.phone_models where slug = 'iphone-15-pro-max'`)).id;
const design = (await one(`insert into public.designs (user_id, phone_model_id, name, canvas_json) values ($1, $2, 'Ốp mèo', '{}') returning id`, [A, model])).id;

// ---------------------------------------------------------------- custom prepaid: review → production → delivery
await expectError(A, `select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([{ type: 'design', id: design, qty: 1 }]), ship({ payment_method: 'cod' })], 'cod_requires_stock_only', 'COD refused for custom designs');
const o1 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'design', id: design, qty: 1 }]), ship()])).rows[0].id;
let r = await one(`select status, status_detail, total, goods_total, order_code, payment_status from public.orders where id = $1`, [o1]);
ok(r.status_detail === 'Pending_Review' && r.status === 'pending' && r.total === 275000 && r.payment_status === 'paid', `place_order custom → Pending_Review, total ${r.total}, code ${r.order_code}`);
ok((await one(`select count(*)::int n from public.policy_consents where order_id = $1`, [o1])).n === 1, 'PolicyConsent stored');
ok((await one(`select count(*)::int n from public.notifications where user_id = $1`, [A])).n === 1, 'notification created');
await expectError(A, `select public.moderate_design($1, true)`, [o1], 'forbidden', 'customer cannot moderate');
await as(OP, `select public.moderate_design($1, true)`, [o1]);
r = await one(`select status_detail, confirmed_at, batch_date from public.orders where id = $1`, [o1]);
ok(r.status_detail === 'Pending_Confirmation' && r.confirmed_at && r.batch_date, 'Operator approves → Pending_Confirmation + production day');
await db.query(`update public.orders set batch_date = current_date - 3 where id = $1`, [o1]); // missed its run
ok((await as(OP, `select public.start_production() n`)).rows[0].n === 1, 'late order starts production at any time');
await as(OP, `select public.mark_packed($1)`, [o1]);
ok((await as(OP, `select public.apply_carrier_event('ev-1', $1, 'In_Transit')`, [o1])).rows[0].apply_carrier_event === 'applied', 'carrier In_Transit');
ok((await as(OP, `select public.apply_carrier_event('ev-1', $1, 'In_Transit')`, [o1])).rows[0].apply_carrier_event === 'duplicate', 'duplicate webhook ignored');
await db.query(`update public.orders set latest_edd = current_date - 1 where id = $1`, [o1]); // delivered late
await as(OP, `select public.apply_carrier_event('ev-2', $1, 'Delivered')`, [o1]);
r = await one(`select status, status_detail, auto_complete_at from public.orders where id = $1`, [o1]);
ok(r.status_detail === 'Delivered' && r.status === 'delivered' && r.auto_complete_at, 'Delivered, 72h timer set');
ok((await one(`select count(*)::int n from public.order_vouchers where order_id = $1 and kind = 'late_delivery'`, [o1])).n === 1, 'late delivery voucher issued');
await as(A, `select public.confirm_received($1)`, [o1]);
ok((await one(`select status_detail from public.orders where id = $1`, [o1])).status_detail === 'Completed', 'customer confirms → Completed');
const hist = await db.query(`select status_detail, actor_type, reason from public.order_status_history where order_id = $1 order by created_at, id`, [o1]);
ok(hist.rows.length >= 6 && hist.rows.some((h) => h.actor_type === 'operator'), `history with actors (${hist.rows.map((h) => h.status_detail).join(' → ')})`);

// ---------------------------------------------------------------- COD stock: cancel in the window
const o2 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'product', id: variant, qty: 2 }]), ship({ payment_method: 'cod', payment_channel: 'cod' })])).rows[0].id;
const stockBefore = (await one(`select quantity_on_hand q from public.inventory_items i join public.product_variants v on v.inventory_item_id = i.id where v.id = $1`, [variant])).q;
await as(A, `select public.cancel_order($1)`, [o2]);
r = await one(`select status, status_detail from public.orders where id = $1`, [o2]);
const stockAfter = (await one(`select quantity_on_hand q from public.inventory_items i join public.product_variants v on v.inventory_item_id = i.id where v.id = $1`, [variant])).q;
ok(r.status_detail === 'Cancelled' && r.status === 'cancelled' && stockAfter === stockBefore + 2, 'COD cancelled in window, stock returned');
await expectError(A, `select public.cancel_order($1)`, [o1], 'cannot_cancel', 'prepaid / completed order cannot use cancel_order');

// ---------------------------------------------------------------- prepaid stock: request → CSKH accepts → refund
const o3 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'product', id: variant, qty: 1 }]), ship()])).rows[0].id;
await as(A, `select public.request_cancel($1, 'Changed_Mind')`, [o3]);
await expectError(A, `select public.request_cancel($1, 'Other')`, [o3], 'request_exists', 'only one pending request');
await expectError(OP, `select public.mark_packed($1)`, [o3], 'on_hold', 'held order cannot be packed');
await expectError(OP, `select public.decide_cancel_request($1, true)`, [o3], 'forbidden', 'only CSKH decides');
await as(CS, `select public.decide_cancel_request($1, true)`, [o3]);
const refund = await one(`select id, situation, amount, status from public.refund_requests where order_id = $1`, [o3]);
ok(refund && refund.situation === 'S1' && refund.amount === variantRow.price + 25000, `refund S1 created (${refund?.amount})`);
await as(A, `select public.submit_refund_account($1, 'Vietcombank', '0123456789', 'nguyen a')`, [refund.id]);
await expectError(CS, `select public.approve_refund($1)`, [refund.id], 'forbidden', 'only Admin approves refunds');
await as(AD, `select public.approve_refund($1)`, [refund.id]);
await as(AD, `select public.complete_refund($1, 'FT123')`, [refund.id]);
ok((await one(`select status from public.refund_requests where id = $1`, [refund.id])).status === 'Refunded', 'Admin completes the bank transfer');

// ---------------------------------------------------------------- RLS
ok((await as(B, `select count(*)::int n from public.orders`)).rows[0].n === 0, 'RLS: customer B sees none of A\'s orders');
ok((await as(B, `select count(*)::int n from public.refund_requests`)).rows[0].n === 0, 'RLS: B cannot read A\'s refund (bank details)');
ok((await as(CS, `select count(*)::int n from public.refund_requests`)).rows[0].n === 0, 'RLS: CSKH cannot read bank details');
ok((await as(AD, `select count(*)::int n from public.refund_requests`)).rows[0].n === 1, 'RLS: Admin reads refunds');
ok((await as(OP, `select count(*)::int n from public.orders`)).rows[0].n === 3, 'RLS: staff read all orders');
await expectError(A, `update public.profiles set role = 'admin' where id = $1`, [A], 'permission denied', 'customer cannot promote own role');
await expectError(A, `insert into public.notifications (user_id, type, title, body) values ($1, 'order', 'x', 'y')`, [A], 'permission denied', 'customer cannot insert notifications');
ok((await as(A, `update public.notifications set read_at = now() where user_id = $1 returning id`, [A])).rows.length > 0, 'customer marks own notifications read');

// ---------------------------------------------------------------- P0-4: place_order v3
const acc = await one(`select v.id, v.price, v.inventory_item_id inv from public.product_variants v join public.products p on p.id = v.product_id where p.slug = 'accessory-ring-holder'`);
const accStock = async () => (await one(`select quantity_on_hand q from public.inventory_items where id = $1`, [acc.inv])).q;
const accBefore = await accStock();
const codAcc = (extra) => [JSON.stringify([{ type: 'product', id: acc.id, qty: 1 }]), ship({ payment_method: 'cod', payment_channel: 'cod', checkout_ref: 'ck-p0-1', ...extra })];
const p1 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, codAcc())).rows[0].id;
const p1again = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, codAcc())).rows[0].id;
ok(p1 === p1again && (await accStock()) === accBefore - 1, 'P0-4: same checkout_ref → same order, stock taken once (Spec B8)');
ok((await one(`select count(*)::int n from public.orders where checkout_ref = 'ck-p0-1'`)).n === 1, 'P0-4: one row per checkout_ref');
ok((await one(`select payment_method from public.orders where id = $1`, [p1])).payment_method === 'cod', 'P0-4: accessory is a stock item → COD allowed (Spec B4)');
await expectError(B, `select public.place_order($1::jsonb, $2::jsonb)`, codAcc(), 'checkout_ref_conflict', 'P0-4: another customer cannot reuse a checkout_ref');
const forged = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'product', id: acc.id, qty: 1 }]),
  ship({ checkout_ref: 'ck-p0-2', tier: 'express', fee: 0, standard_fee: 0, express_surcharge: 0, discount: 99999999, order_code: 'CE-89421',
         shipper_note: 'Gọi trước khi giao', gift_message: 'x'.repeat(200) })])).rows[0].id;
r = await one(`select order_code, shipping_fee, standard_fee, express_surcharge, discount, goods_total, total, shipper_note, char_length(gift_message) gm from public.orders where id = $1`, [forged]);
ok(/^CC-\d{6}-\d{4}$/.test(r.order_code), `P0-4: client order_code ignored (${r.order_code})`);
ok(r.shipping_fee === 45000 && r.standard_fee === 25000 && r.express_surcharge === 20000, 'P0-4: express fee computed by the server');
ok(r.discount === r.goods_total && r.total === 45000, `P0-4: discount clamped to the goods total (total ${r.total})`);
ok(r.shipper_note === 'Gọi trước khi giao' && r.gm === 150, 'P0-4: shipper note stored, gift message capped at 150');
const lilac = (await one(`select id, quantity_on_hand q from public.inventory_items where sku_code = 'sku-ip15pm-lilac'`));
const design2 = (await one(`insert into public.designs (user_id, phone_model_id, name, canvas_json) values ($1, $2, 'Ốp lilac', '{"v":1}') returning id`, [A, model])).id;
const p3 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'design', id: design2, qty: 1, sku: 'sku-ip15pm-lilac', design_version: 2 }]), ship({ checkout_ref: 'ck-p0-3' })])).rows[0].id;
r = await one(`select inventory_item_id, design_version, unit_price from public.order_items where order_id = $1`, [p3]);
ok(r.inventory_item_id === lilac.id && (await one(`select quantity_on_hand q from public.inventory_items where id = $1`, [lilac.id])).q === lilac.q - 1, 'P0-4: custom design uses the blank of the chosen SKU');
ok(r.design_version === 2 && r.unit_price === 250000, 'P0-4: design_version stored, flat custom price');

// ---------------------------------------------------------------- jobs
const o4 = (await as(A, `select public.place_order($1::jsonb, $2::jsonb) id`, [JSON.stringify([{ type: 'design', id: design, qty: 1 }]), ship()])).rows[0].id;
await as(OP, `select public.moderate_design($1, false, 'Bản quyền', 'Ảnh có logo')`, [o4]);
await db.query(`update public.orders set rejected_at = now() - interval '8 days' where id = $1`, [o4]);
await db.exec(`select public.run_order_jobs()`);
r = await one(`select status_detail from public.orders where id = $1`, [o4]);
ok(r.status_detail === 'Cancelled' && (await one(`select situation from public.refund_requests where order_id = $1`, [o4]))?.situation === 'S2', 'job: design not fixed in 7 days → Cancelled + refund S2');
ok((await as(A, `select count(*)::int n from public.list_open_orders()`)).rows[0].n >= 1, 'list_open_orders shows the pending refund');

// ---------------------------------------------------------------- M9: simulation on the real data (admin ↔ customer in sync)
await expectError(OP, `select public.sim_time_travel($1, 30)`, [o4], 'forbidden', 'M9: only Admin can move time');
const s1 = (await as(AD, `select public.sim_create_sample_order('a@test.vn', 'stock', 'cod') id`)).rows[0].id;
ok((await as(A, `select count(*)::int n from public.orders where id = $1`, [s1])).rows[0].n === 1, 'M9: sample order created by Admin shows for the customer');
await expectError(OP, `select public.mark_packed($1)`, [s1], 'not_confirmed', 'M9: COD sample still in the change-of-mind window');
await as(AD, `select public.sim_time_travel($1, 31)`, [s1]);
await as(OP, `select public.mark_packed($1)`, [s1]);
ok((await one(`select status_detail from public.orders where id = $1`, [s1])).status_detail === 'Ready_for_Pickup', 'M9: +31 min → COD confirmed, packed (same result on both views)');
await as(OP, `select public.apply_carrier_event('m9-1', $1, 'In_Transit')`, [s1]);
await as(OP, `select public.apply_carrier_event('m9-2', $1, 'Delivered')`, [s1]);
await as(AD, `select public.sim_time_travel($1, 72 * 60 + 1)`, [s1]);
ok((await one(`select status_detail from public.orders where id = $1`, [s1])).status_detail === 'Completed', 'M9: +72 h → job auto-completes the order');
const s2 = (await as(AD, `select public.sim_create_sample_order('a@test.vn', 'custom', 'prepaid') id`)).rows[0].id;
await as(OP, `select public.moderate_design($1, false, 'Bản quyền', 'Ảnh có logo')`, [s2]);
await as(AD, `select public.sim_time_travel($1, 7 * 1440 + 10)`, [s2]);
ok((await one(`select status_detail from public.orders where id = $1`, [s2])).status_detail === 'Cancelled', 'M9: +7 days without a fix → Cancelled + refund S2');
// stock goods come back to stock when a failed prepaid delivery is cancelled
const s3 = (await as(AD, `select public.sim_create_sample_order('a@test.vn', 'stock', 'prepaid') id`)).rows[0].id;
const inv3 = (await one(`select inventory_item_id id from public.order_items where order_id = $1`, [s3])).id;
const q3 = (await one(`select quantity_on_hand q from public.inventory_items where id = $1`, [inv3])).q;
await as(OP, `select public.mark_packed($1)`, [s3]);
await as(OP, `select public.apply_carrier_event('m9-3', $1, 'In_Transit')`, [s3]);
await as(OP, `select public.apply_carrier_event('m9-4', $1, 'Delivery_Failed', 'Customer_Unreachable')`, [s3]);
await as(OP, `select public.apply_carrier_event('m9-5', $1, 'Warehouse_Received')`, [s3]);
await as(A, `select public.report_issue($1, 'TK-M9')`, [s3]);
r = await one(`select status_detail, warehouse_disputed, frozen_at from public.orders where id = $1`, [s3]);
ok(r.status_detail === 'Delivery_Failed' && r.warehouse_disputed && r.frozen_at, 'M9: dispute during the warehouse hold freezes the hold (FR-OT-EX-03)');
await as(CS, `select public.resolve_dispute($1, true, 'Hãng xác nhận lỗi')`, [s3]);
r = await one(`select warehouse_disputed, fault_override from public.orders where id = $1`, [s3]);
ok(!r.warehouse_disputed && r.fault_override === 'Damaged_In_Transit', 'M9: CSKH says customer right → carrier fault');
await as(A, `select public.cancel_after_failure($1)`, [s3]);
ok((await one(`select quantity_on_hand q from public.inventory_items where id = $1`, [inv3])).q === q3 + 1, 'M9: cancelled failed delivery → stock goods back to stock');
ok((await one(`select situation from public.refund_requests where order_id = $1`, [s3])).situation === 'S3a', 'M9: after the dispute the refund is S3a (100%)');
// reprint after a complaint gives a new delivery window
const s4 = (await as(AD, `select public.sim_create_sample_order('a@test.vn', 'custom', 'prepaid') id`)).rows[0].id;
await as(OP, `select public.moderate_design($1, true)`, [s4]);
await db.query(`update public.orders set batch_date = current_date - 1 where id = $1`, [s4]);
await as(OP, `select public.start_production()`);
await as(OP, `select public.mark_packed($1)`, [s4]);
await as(OP, `select public.apply_carrier_event('m9-6', $1, 'In_Transit')`, [s4]);
await as(OP, `select public.apply_carrier_event('m9-7', $1, 'Delivered')`, [s4]);
await db.query(`update public.orders set earliest_edd = current_date - 10, latest_edd = current_date - 9 where id = $1`, [s4]);
await as(A, `select public.report_issue($1, 'TK-M9-2')`, [s4]);
await as(CS, `select public.apply_ticket_result($1, 'Reprint')`, [s4]);
r = await one(`select status_detail, latest_edd >= current_date as fresh from public.orders where id = $1`, [s4]);
ok(r.status_detail === 'In_Production' && r.fresh, 'M9: reprint → In_Production with a new delivery window');

// ---------------------------------------------------------------- rollbacks keep users / profiles
const profilesBefore = (await one(`select count(*)::int n from public.profiles`)).n;
await db.exec(`delete from public.refund_requests; delete from public.policy_consents; delete from public.order_items; delete from public.order_status_history; delete from public.orders;`);
for (const f of readdirSync(RB).filter((x) => x.endsWith('.down.sql')).sort().reverse()) {
  try {
    await db.exec(readFileSync(join(RB, f), 'utf8'));
    console.log(`ROLLBACK ${f}`);
  } catch (e) {
    ok(false, `rollback ${f}: ${e.message}`);
  }
}
ok((await one(`select count(*)::int n from public.profiles`)).n === profilesBefore, 'rollbacks keep every profile');
ok((await one(`select count(*)::int n from auth.users`)).n === 5, 'rollbacks keep every user');
ok((await db.query(`select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role'`)).rows.length === 0, 'role column removed by rollback');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
