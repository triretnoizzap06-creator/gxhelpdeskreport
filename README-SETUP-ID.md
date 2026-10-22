# Setup GX CS Dashboard (versi tanpa folder)

Halaman:
- `/` → Dashboard (bahasa ID/EN, mode Terang/Gelap)
- `/helpdesk-report` → Helpdesk Report (tag Aftersales)
- `/helpdesk-performance` → Helpdesk Performance Report (tag Best Employee) — slide EN/ID, mode viewer
- `/helpdesk-directory` → Helpdesk Employee Directory (tag Helpdesk) — ulang tahun & reminder kontrak

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
