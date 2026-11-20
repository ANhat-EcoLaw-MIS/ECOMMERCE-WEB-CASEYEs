-- M3 · Tables around an order: cancel requests, refunds, policy consents, design reviews,
-- shipments, carrier webhooks and compensation vouchers.
-- Customers only READ rows of their own orders; every write goes through the RPCs (M5).
-- Money / legal rows block deleting the order or the customer (on delete restrict).
-- Rollback: supabase/rollbacks/20261114100200_order_support_tables.down.sql

create table public.cancel_requests (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  reason          text not null check (reason in ('High_Shipping_Fee', 'Changed_Mind', 'Wrong_Phone_Model', 'Wrong_Address', 'Other')),
  note            text,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  sla_due_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references public.profiles (id) on delete set null,
  decision_reason text
);
create index cancel_requests_order_idx on public.cancel_requests (order_id);
-- At most one pending request per order.
create unique index cancel_requests_one_pending on public.cancel_requests (order_id) where status = 'pending';

create table public.refund_requests (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete restrict,
  situation         text not null check (situation in ('S1', 'S2', 'S3a', 'S3b', 'S3c', 'S4')),
  amount            integer not null check (amount >= 0),
  deducted_fee      integer not null default 0 check (deducted_fee >= 0),
  status            text not null default 'Pending_Approval'
                    check (status in ('Pending_Approval', 'Processing', 'Refunded', 'Rejected', 'Refund_Pending_Retry', 'Refund_Pending_Manual')),
  refund_method     text check (refund_method in ('bank')),   -- bank transfer only (no voucher refunds)
  bank              text,
  account_no        text,
  account_holder    text,
  bank_ref          text,
  transfer_attempts smallint not null default 0,
  reminder_sent_at  timestamptz,
  escalated_at      timestamptz,                               -- handed to CSKH after the deadline
  approved_by       uuid references public.profiles (id) on delete set null,
  reject_reason     text,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create index refund_requests_order_idx on public.refund_requests (order_id);

create table public.policy_consents (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders (id) on delete restrict,
  user_id        uuid not null references public.profiles (id) on delete restrict,
  policy_version text not null,
  accepted_at    timestamptz not null default now()
);

create table public.design_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  design_id       uuid references public.designs (id) on delete set null,
  round           smallint not null,
  decision        text not null check (decision in ('approved', 'rejected')),
  violation_group text,
  reason          text,
  reviewer_id     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index design_reviews_order_idx on public.design_reviews (order_id);

create table public.shipments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete cascade,
  carrier       text not null,
  tracking_code text not null unique,
  created_at    timestamptz not null default now()
);

create table public.delivery_attempts (
  id            uuid primary key default gen_random_uuid(),
  shipment_id   uuid not null references public.shipments (id) on delete cascade,
  attempt_no    smallint not null,
  started_at    timestamptz not null default now(),
  result        text check (result in ('delivered', 'failed')),
  failure_cause text,
  ended_at      timestamptz,
  unique (shipment_id, attempt_no)
);

-- Carrier webhooks are applied once per event_id (idempotent).
create table public.webhook_events (
  event_id    text primary key,
  order_id    uuid references public.orders (id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}',
  received_at timestamptz not null default now()
);

create table public.order_vouchers (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  kind       text not null check (kind in ('late_delivery', 'express_surcharge', 'complaint')),
  code       text not null unique,
  value      integer not null check (value >= 0),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index order_vouchers_order_idx on public.order_vouchers (order_id);

-- ---------------------------------------------------------------- RLS: read only

alter table public.cancel_requests   enable row level security;
alter table public.refund_requests   enable row level security;
alter table public.policy_consents   enable row level security;
alter table public.design_reviews    enable row level security;
alter table public.shipments         enable row level security;
alter table public.delivery_attempts enable row level security;
alter table public.webhook_events    enable row level security;
alter table public.order_vouchers    enable row level security;

create function public.owns_order(p_order_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from public.orders o where o.id = p_order_id and o.user_id = auth.uid());
$$;
revoke execute on function public.owns_order(uuid) from public, anon;
grant  execute on function public.owns_order(uuid) to authenticated;

create policy "read own or staff" on public.cancel_requests for select to authenticated
  using (public.owns_order(order_id) or public.is_staff());
-- Bank details: only the order owner and Admin.
create policy "read own or admin" on public.refund_requests for select to authenticated
  using (public.owns_order(order_id) or public.current_app_role() = 'admin');
create policy "read own or staff" on public.policy_consents for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy "read own or staff" on public.design_reviews for select to authenticated
  using (public.owns_order(order_id) or public.is_staff());
create policy "read own or staff" on public.shipments for select to authenticated
  using (public.owns_order(order_id) or public.is_staff());
create policy "read own or staff" on public.delivery_attempts for select to authenticated
  using (public.is_staff() or exists (select 1 from public.shipments s where s.id = shipment_id and public.owns_order(s.order_id)));
create policy "staff only" on public.webhook_events for select to authenticated
  using (public.is_staff());
create policy "read own or staff" on public.order_vouchers for select to authenticated
  using (public.owns_order(order_id) or public.is_staff());
