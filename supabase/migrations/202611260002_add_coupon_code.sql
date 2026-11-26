-- =============================================================================
-- Spring Pal Lead Generation Website
-- Migration: Add custom discount coupon_code (SP50-LAST7DIGITS) to public.leads
-- =============================================================================

alter table public.leads
  add column if not exists coupon_code text null;

comment on column public.leads.coupon_code is 'Customer discount coupon code in format SP50-<last 7 digits of phone number>.';

-- Drop unique index if created by an earlier revision (same phone may submit multiple inquiries)
drop index if exists public.leads_coupon_code_uidx;

create index if not exists leads_coupon_code_idx
  on public.leads (coupon_code)
  where coupon_code is not null;
