-- Rollback M3. refund_requests / policy_consents keep money and legal records: export them first.
drop table if exists public.order_vouchers;
drop table if exists public.webhook_events;
drop table if exists public.delivery_attempts;
drop table if exists public.shipments;
drop table if exists public.design_reviews;
drop table if exists public.policy_consents;
drop table if exists public.refund_requests;
drop table if exists public.cancel_requests;
drop function if exists public.owns_order(uuid);
