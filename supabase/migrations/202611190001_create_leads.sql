-- =============================================================================
-- Spring Pal Lead Generation Website
-- Migration: Create public.leads table with strict RLS and least-privilege setup
-- =============================================================================

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

-- Create leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone_number text not null,
  product_type text not null,
  mattress_length numeric(6, 2) null,
  mattress_width numeric(6, 2) null,
  size_label text null,
  lead_status text not null default 'pending_size',
  source text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,

  constraint leads_customer_name_length_chk
    check (char_length(trim(customer_name)) between 2 and 120),
  constraint leads_phone_number_format_chk
    check (phone_number ~ '^\+947[0-9]{8}$'),
  constraint leads_product_type_chk
    check (product_type in ('mattress_only', 'divan_bed_mattress')),
  constraint leads_status_chk
    check (lead_status in ('pending_size', 'completed')),
  constraint leads_dimensions_range_chk
    check (
      (mattress_length is null and mattress_width is null)
      or (
        mattress_length is not null
        and mattress_width is not null
        and mattress_length >= 24
        and mattress_length <= 120
        and mattress_width >= 24
        and mattress_width <= 120
      )
    ),
  constraint leads_completed_consistency_chk
    check (
      (lead_status = 'pending_size' and completed_at is null)
      or (
        lead_status = 'completed'
        and completed_at is not null
        and mattress_length is not null
        and mattress_width is not null
      )
    )
);

comment on table public.leads is 'Spring Pal Meta campaign customer leads captured before and updated after mattress size selection.';
comment on column public.leads.phone_number is 'Normalized Sri Lankan mobile number in E.164 format (+947XXXXXXXX).';
comment on column public.leads.lead_status is 'Workflow status: pending_size (Step 1 saved) or completed (Step 3 dimensions confirmed).';

-- Performance indexes for reporting, deduplication, and campaign attribution
create index if not exists leads_created_at_idx
  on public.leads (created_at desc);

create index if not exists leads_status_created_at_idx
  on public.leads (lead_status, created_at desc);

create index if not exists leads_phone_created_at_idx
  on public.leads (phone_number, created_at desc);

create index if not exists leads_utm_campaign_idx
  on public.leads (utm_campaign)
  where utm_campaign is not null;

-- =============================================================================
-- Row Level Security (RLS) & Least-Privilege Access Control
-- =============================================================================
-- All reads/writes are performed exclusively by Next.js server-side Route
-- Handlers using the server-only SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS
-- securely on the server). Public anon/authenticated roles have ZERO access.

alter table public.leads enable row level security;
alter table public.leads force row level security;

revoke all on table public.leads from public;
revoke all on table public.leads from anon;
revoke all on table public.leads from authenticated;

-- Explicitly grant full table access only to service_role (server-side API)
grant select, insert, update, delete on table public.leads to service_role;
