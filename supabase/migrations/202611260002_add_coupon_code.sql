-- =============================================================================
-- Spring Pal Lead Generation Website
-- Migration: Add unique per-lead custom discount coupon_code to public.leads
-- =============================================================================

alter table public.leads
  add column if not exists coupon_code text null;

comment on column public.leads.coupon_code is 'Unique customer discount coupon code generated on Step 1 submission (e.g., SP50-7K4M92 or SP40-8P3R61).';

create unique index if not exists leads_coupon_code_uidx
  on public.leads (coupon_code)
  where coupon_code is not null;
