-- GX Helpdesk Report: shared report + history storage.
-- Supabase Dashboard -> SQL Editor -> New query -> paste and Run.
create table if not exists public.gx_report_files (
  pathname text primary key,
  body_b64 text not null,
  uploaded_at timestamptz not null default now(),
  size bigint not null default 0
);

alter table public.gx_report_files enable row level security;
revoke all on table public.gx_report_files from anon, authenticated;
grant all on table public.gx_report_files to service_role;
