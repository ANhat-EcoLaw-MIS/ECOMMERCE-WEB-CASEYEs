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
// TEST-ONLY workaround: the team's handle_new_user() inserts profiles without onboarding_status (NOT NULL).
await db.exec(`alter table public.profiles alter column onboarding_status set default 'skipped'`);
const uid = async (email) => (await db.query(`insert into auth.users (email) values ($1) returning id`, [email])).rows[0].id;
const A = await uid('a@test.vn'), B = await uid('b@test.vn'), OP = await uid('op@test.vn'), CS = await uid('cs@test.vn'), AD = await uid('ad@test.vn');
// Profiles may be created by the sign-up trigger; make sure they exist.
for (const id of [A, B, OP, CS, AD]) {
  await db.query(`insert into public.profiles (id, display_name, onboarding_status) values ($1, 'u', 'skipped') on conflict (id) do nothing`, [id]);
}
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

ok((await as(A, `select count(*)::int n from public.products`)).rows[0].n === 12, 'M7: catalog readable by customers (12 products)');
ok((await as(A, `select count(*)::int n from public.product_variants`)).rows[0].n === 8 * 9 + 4, 'M7: 9 variants per case + 4 accessories');
const variant = (await one(`select v.id from public.product_variants v join public.products p on p.id = v.product_id where p.slug = 'bloom-club' limit 1`)).id;
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
ok(refund && refund.situation === 'S1' && refund.amount === 304000, `refund S1 created (${refund?.amount})`);
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
