-- =============================================================================
-- Spring Pal Lead Generation Website
-- Migration: Add admin follow-up call_status and notes columns to public.leads
-- =============================================================================

alter table public.leads
  add column if not exists call_status text not null default 'new',
  add column if not exists admin_notes text null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_call_status_chk'
  ) then
    alter table public.leads
      add constraint leads_call_status_chk
      check (call_status in ('new', 'called', 'no_answer', 'converted', 'closed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_admin_notes_length_chk'
  ) then
    alter table public.leads
      add constraint leads_admin_notes_length_chk
      check (admin_notes is null or char_length(admin_notes) <= 2000);
  end if;
end
$$;

comment on column public.leads.call_status is 'Sales follow-up status: new, called, no_answer, converted, or closed.';
comment on column public.leads.admin_notes is 'Internal Spring Pal team notes recorded in the admin dashboard.';

create index if not exists leads_call_status_created_at_idx
  on public.leads (call_status, created_at desc);
