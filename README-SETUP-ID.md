# Setup GX CS Dashboard (versi tanpa folder)

Halaman:
- `/` → Dashboard (bahasa ID/EN, mode Terang/Gelap)
- `/helpdesk-report` → Helpdesk Report (tag Aftersales)
- `/helpdesk-performance` → Helpdesk Performance Report (tag Best Employee) — slide EN/ID, mode viewer
- `/helpdesk-directory` → Helpdesk Employee Directory (tag Helpdesk) — ulang tahun & reminder kontrak
Helpdesk Management (🔒):
- `/spv#todo` → Personal To-Do List (task pribadi SPV + task yang di-assign ke tim, dipisah)
- `/spv#h1` → Management Report (Reporting to Head) — Report H1 2026, editable

Team Dashboard (terbuka):
- `/dashboard-helpdesk` → To-Do List Helpdesk Customer Support
- `/dashboard-am` → To-Do List Account Manager VIP
- `/knowledge-base` → Knowledge Base Helpdesk & Account Manager (bisa dicari; edit hanya SPV yang login)

## Update: Dashboard SPV + password (wajib sekali)
1. GitHub → upload SEMUA file dari ZIP → Commit (file baru: `_auth.js`, `gate.js`, `login.js`, `todo.js`, `spv.html`, `team.html`, `kb.html`, `spv-schema.sql`, `vercel.json` berubah).
2. Supabase → SQL Editor → jalankan `spv-schema.sql` (tabel to-do & dokumen; aman dijalankan ulang).
3. Vercel → Settings → Environment Variables → tambah **`GX_DASH_PASSWORD`** = password dashboard → Save → Redeploy.
   Password TIDAK ada di kode/GitHub. Tanpa env ini, 4 halaman terkunci menampilkan pesan "password belum diatur".
4. Buka `/spv` → login → klik **Import Monthly Tracker (Oct 2026)** sekali untuk mengisi to-do dari tracker.

Halaman terkunci (Helpdesk Report, Performance, Directory, Personal To-Do List & Management Report) memakai 1 password yang sama; login berlaku 30 hari
(cookie HttpOnly). Ganti password = ubah `GX_DASH_PASSWORD` di Vercel + Redeploy (semua sesi lama otomatis keluar).
Link viewer deck (`?view=1`) Helpdesk Report & Performance tetap bisa dibuka tanpa password (read-only).

## Update dari versi sebelumnya
1. GitHub → Add file → Upload files → seret SEMUA file dari ZIP → Commit changes.
2. Supabase → SQL Editor → jalankan `directory-schema.sql` (tabel karyawan + data 7 karyawan; aman dijalankan ulang, hanya mengisi kolom kosong). Bila belum: `perf-schema.sql` juga.
3. Vercel → Environment Variables → tambah `PUBLISH_KEY` (password admin) → Redeploy.
   Tanpa PUBLISH_KEY, siapa pun yang punya link bisa mengubah data & melihat data karyawan.
4. Cek https://gxhelpdeskreport.vercel.app/api/health → "performanceTable" & "directoryTable" = ok.

## Mode viewer / admin
- PUBLISH_KEY diisi → orang lain hanya bisa melihat; tombol edit muncul setelah klik 🔒 Admin + password.
- Helpdesk Performance: tombol 🔗 Link viewer menyalin link `?view=1` (tanpa tombol edit sama sekali).
- Employee Directory: dengan PUBLISH_KEY, isi directory hanya bisa dibuka dengan password (data pribadi).

## Setup baru dari nol
1. Upload semua file ke GitHub.
2. Supabase → SQL Editor → jalankan `schema.sql` (sudah termasuk semua tabel).
3. Vercel → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLISH_KEY → Redeploy.

Menambah menu dashboard: edit daftar `MENUS` di index.html.
Kunci service_role hanya di Vercel — jangan taruh di GitHub atau config.js.
