# Setup GX Helpdesk Report (versi tanpa folder)

Semua file ada di satu tempat (tanpa folder), jadi upload ke GitHub tidak bisa salah.

1. GitHub → Add file → Upload files → seret SEMUA file dari ZIP → Commit changes.
   File lama yang sudah ada otomatis tertimpa. File lama lain (store.js, check.mjs, README-SUPABASE.md, folder api) boleh dibiarkan.
2. Supabase → SQL Editor → paste isi `schema.sql` → Run (sudah dilakukan? tidak perlu lagi).
3. Vercel → Settings → Environment Variables:
   - SUPABASE_URL = Project URL Supabase
   - SUPABASE_SERVICE_ROLE_KEY = service_role / secret key
4. Tunggu deploy otomatis selesai (atau Deployments → ⋯ → Redeploy).
5. Buka https://gxhelpdeskreport.vercel.app/api/health → harus "database": "ok". Lalu import data sekali.

Endpoint /api/report dan /api/health dibuat lewat vercel.json (bukan folder api/).
Kunci service_role hanya di Vercel — jangan taruh di GitHub atau config.js.
