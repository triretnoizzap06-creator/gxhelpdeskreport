# Setup GX CS Dashboard (versi tanpa folder)

Halaman:
- `/` → Dashboard (menu report, pilihan bahasa ID/EN)
- `/helpdesk-report` → Helpdesk Report (tag Aftersales)
- `/helpdesk-performance` → Helpdesk Performance Report (tag Best Employee), periode 2026 Q2, Q3, Q4, 2027…

## Update dari versi sebelumnya
1. GitHub → Add file → Upload files → seret SEMUA file dari ZIP → Commit changes.
2. Supabase → SQL Editor → paste isi `perf-schema.sql` → Run (tabel baru untuk Helpdesk Performance Report).
3. Tunggu deploy Vercel selesai, lalu cek https://gxhelpdeskreport.vercel.app/api/health → "performanceTable": "ok …".

## Setup baru dari nol
1. Upload semua file ke GitHub.
2. Supabase → SQL Editor → jalankan `schema.sql` (sudah termasuk tabel performance).
3. Vercel → Settings → Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (opsional PUBLISH_KEY) → Redeploy.

Menambah menu dashboard: edit daftar `MENUS` di index.html (1 baris per menu).
Kunci service_role hanya di Vercel — jangan taruh di GitHub atau config.js.
