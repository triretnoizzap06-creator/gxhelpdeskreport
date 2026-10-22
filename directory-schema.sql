-- Helpdesk Employee Directory — data karyawan (ulang tahun & kontrak). Aman dijalankan ulang.
-- Jalankan di Supabase → SQL Editor → Run.
create table if not exists public.hd_employees (
  id               bigserial primary key,
  full_name        text not null unique,
  employee_id      text,
  birthday         date,
  start_contract   date,
  end_contract     date,
  photo            text,
  active           boolean not null default true,
  contract_history jsonb not null default '[]'::jsonb,
  sort_order       integer not null default 100,
  updated_at       timestamptz not null default now()
);
alter table public.hd_employees enable row level security;
revoke all on table public.hd_employees from public, anon, authenticated;
grant select, insert, update, delete on table public.hd_employees to service_role;
grant usage, select on sequence public.hd_employees_id_seq to service_role;

-- kontrak diperpanjang → kontrak lama disimpan di contract_history, reminder memakai tanggal terbaru
create or replace function public.gx_emp_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and (old.end_contract is distinct from new.end_contract or old.start_contract is distinct from new.start_contract)
     and old.end_contract is not null then
    new.contract_history := coalesce(old.contract_history, '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object('start', old.start_contract, 'end', old.end_contract, 'replaced_at', now()));
  end if;
  return new;
end $$;
drop trigger if exists gx_emp_touch on public.hd_employees;
create trigger gx_emp_touch before insert or update on public.hd_employees for each row execute function public.gx_emp_touch();

-- 7 karyawan Helpdesk + foto existing. Tanggal & Employee ID yang belum diketahui dibiarkan kosong (diisi lewat halaman directory).
insert into public.hd_employees (full_name, employee_id, photo, sort_order) values
  ('Devin Bagaskara',                       '260100006', 'photo-devin-bagaskara.jpg', 1),
  ('Ni Kadek Desi Mirayani',                null, 'photo-ni-kadek-desi-mirayani.jpg', 2),
  ('Aulia Sevi Diana',                      null, 'photo-aulia-sevi-diana.jpg', 3),
  ('Kadek Arisita Dhyana Putri',            null, 'photo-kadek-arisita-dhyana-putri.jpg', 4),
  ('A.A Ngurah Kiyana Adhisa Oka Pertama',  null, 'photo-aa-ngurah-kiyana-adhisa-oka-pertama.jpg', 5),
  ('Nilma Syahrani',                        null, 'photo-nilma-syahrani.jpg', 6),
  ('Gede Dimas Pery Narendra',              null, 'photo-gede-dimas-pery-narendra.jpg', 7)
on conflict (full_name) do nothing;

notify pgrst, 'reload schema';
