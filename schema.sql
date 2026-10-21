-- GX Helpdesk Report — shared report storage on Supabase
-- Run once in Supabase → SQL Editor → New query → paste this whole file → Run.
-- Safe to run again (idempotent).
--
-- Model
--   report_imports   one row per imported dataset set (Customer Support + VIP + Repeat Complaint), deduplicated by SHA-256
--   report_state     exactly one row (id = 1): which import is the "latest report" + the shared settings/fills
--   report_snapshots history ("Riwayat"): a saved report = an import + the settings at that moment
-- The browser never talks to these tables directly; /api/report on Vercel uses the service_role key.

-- ---------- tables ----------
create table if not exists public.report_imports (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  hash        text        not null unique,             -- sha256 of the datasets JSON (dedupe)
  datasets_gz text        not null,                    -- datasets JSON, gzip + base64
  size_bytes  integer     not null default 0,          -- uncompressed JSON size
  summary     jsonb       not null default '{}'::jsonb -- { cs:{name,rows,cols}, vip:{…}, rc:{…} }
);

create table if not exists public.report_state (
  id         smallint    primary key default 1 check (id = 1),
  import_id  bigint      references public.report_imports(id) on delete set null,
  revision   bigint      not null default 0,
  settings   jsonb       not null default '{}'::jsonb,   -- period, Repeat Complaint fills, edits, slide order …
  updated_at timestamptz not null default now()
);

create table if not exists public.report_snapshots (
  id         bigint      generated always as identity primary key,
  created_at timestamptz not null default now(),
  title      text        not null default 'Report',
  auto       boolean     not null default false,
  import_id  bigint      not null references public.report_imports(id) on delete cascade,
  settings   jsonb       not null default '{}'::jsonb
);

create index if not exists report_snapshots_created_at_idx on public.report_snapshots (created_at desc);
create index if not exists report_snapshots_import_id_idx  on public.report_snapshots (import_id);
create index if not exists report_state_import_id_idx      on public.report_state (import_id);

-- ---------- helpers ----------
-- upsert an import by hash and return its id
create or replace function public.gx_upsert_import(p_hash text, p_datasets_gz text, p_size integer, p_summary jsonb)
returns bigint
language plpgsql
set search_path = ''
as $$
declare v_id bigint;
begin
  select i.id into v_id from public.report_imports i where i.hash = p_hash;
  if v_id is null then
    insert into public.report_imports (hash, datasets_gz, size_bytes, summary)
    values (p_hash, p_datasets_gz, coalesce(p_size, 0), coalesce(p_summary, '{}'::jsonb))
    on conflict (hash) do nothing
    returning id into v_id;
    if v_id is null then -- concurrent insert of the same hash
      select i.id into v_id from public.report_imports i where i.hash = p_hash;
    end if;
  end if;
  return v_id;
end $$;

-- delete imports nobody uses any more (not latest, not in history), keep the 5 newest as backup
create or replace function public.gx_cleanup_imports()
returns void
language sql
set search_path = ''
as $$
  delete from public.report_imports i
  where not exists (select 1 from public.report_state s where s.import_id = i.id)
    and not exists (select 1 from public.report_snapshots n where n.import_id = i.id)
    and i.id not in (select x.id from public.report_imports x order by x.id desc limit 5);
$$;

-- ---------- 1) new import becomes the latest report for everyone (atomic) ----------
create or replace function public.gx_publish_import(p_hash text, p_datasets_gz text, p_size integer, p_summary jsonb, p_settings jsonb)
returns table (import_id bigint, revision bigint, updated_at timestamptz)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare v_id bigint;
begin
  v_id := public.gx_upsert_import(p_hash, p_datasets_gz, p_size, p_summary);
  insert into public.report_state as s (id, import_id, revision, settings, updated_at)
  values (1, v_id, 1, coalesce(p_settings, '{}'::jsonb), now())
  on conflict (id) do update
    set import_id = excluded.import_id,
        revision  = s.revision + 1,
        settings  = excluded.settings,
        updated_at = now();
  perform public.gx_cleanup_imports();
  return query select s.import_id, s.revision, s.updated_at from public.report_state s where s.id = 1;
end $$;

-- ---------- 2) save fills/settings — only if the latest report is still the same import ----------
-- returns no row when another import has replaced it in the meantime (API answers 409 → browser reloads latest)
create or replace function public.gx_save_state(p_import_id bigint, p_settings jsonb)
returns table (import_id bigint, revision bigint, updated_at timestamptz)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  update public.report_state s
     set settings = coalesce(p_settings, '{}'::jsonb),
         revision = s.revision + 1,
         updated_at = now()
   where s.id = 1 and s.import_id = p_import_id
  returning s.import_id, s.revision, s.updated_at;
end $$;

-- ---------- 3) history snapshot ----------
-- automatic snapshots with the same title in the last 3 hours are replaced (no pile-up); max 80 snapshots,
-- the oldest automatic ones are removed first
create or replace function public.gx_save_snapshot(p_hash text, p_datasets_gz text, p_size integer, p_summary jsonb, p_settings jsonb, p_title text, p_auto boolean)
returns table (id bigint, created_at timestamptz)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare v_imp bigint; v_id bigint; v_at timestamptz;
begin
  v_imp := public.gx_upsert_import(p_hash, p_datasets_gz, p_size, p_summary);
  if coalesce(p_auto, false) then
    delete from public.report_snapshots n
     where n.auto and n.title = coalesce(p_title, 'Report') and n.created_at > now() - interval '3 hours';
  end if;
  insert into public.report_snapshots (title, auto, import_id, settings)
  values (left(coalesce(nullif(p_title, ''), 'Report'), 200), coalesce(p_auto, false), v_imp, coalesce(p_settings, '{}'::jsonb))
  returning report_snapshots.id, report_snapshots.created_at into v_id, v_at;
  delete from public.report_snapshots n
   where n.auto
     and n.id in (select x.id from public.report_snapshots x order by x.created_at desc offset 80);
  perform public.gx_cleanup_imports();
  return query select v_id, v_at;
end $$;

-- ---------- security ----------
-- RLS on, no policies, no grants for anon/authenticated: only the server (service_role) can read/write.
alter table public.report_imports   enable row level security;
alter table public.report_state     enable row level security;
alter table public.report_snapshots enable row level security;

revoke all on public.report_imports, public.report_state, public.report_snapshots from anon, authenticated;
grant select, insert, update, delete on public.report_imports, public.report_state, public.report_snapshots to service_role;

revoke all on function public.gx_upsert_import(text, text, integer, jsonb)                              from public, anon, authenticated;
revoke all on function public.gx_cleanup_imports()                                                     from public, anon, authenticated;
revoke all on function public.gx_publish_import(text, text, integer, jsonb, jsonb)                     from public, anon, authenticated;
revoke all on function public.gx_save_state(bigint, jsonb)                                             from public, anon, authenticated;
revoke all on function public.gx_save_snapshot(text, text, integer, jsonb, jsonb, text, boolean)       from public, anon, authenticated;
grant execute on function public.gx_upsert_import(text, text, integer, jsonb)                          to service_role;
grant execute on function public.gx_cleanup_imports()                                                 to service_role;
grant execute on function public.gx_publish_import(text, text, integer, jsonb, jsonb)                 to service_role;
grant execute on function public.gx_save_state(bigint, jsonb)                                         to service_role;
grant execute on function public.gx_save_snapshot(text, text, integer, jsonb, jsonb, text, boolean)   to service_role;

-- make the API see the new tables/functions immediately
notify pgrst, 'reload schema';
