# GX Helpdesk Report — Panduan update Supabase

## Isi ZIP ini
Struktur API Vercel sudah dirapikan: `api/report.js`, `api/health.js`, `lib/store.js`, dan `supabase/schema.sql`. Fitur report utama tetap berada di `index.html`.

## 1. Upload ke GitHub
1. Buka repository `triretnoizzap06-creator/gxhelpdeskreport`.
2. Extract ZIP ini di komputer.
3. Upload isi folder `gxhelpdeskreport-main` ke root repository (bukan folder ZIP di dalam folder lain), lalu pilih replace file yang sama.
4. Pastikan folder `api`, `lib`, `supabase`, dan `scripts` terlihat di root GitHub.

## 2. Siapkan database (sekali saja)
1. Buka Supabase project yang sudah dibuat → **SQL Editor** → **New query**.
2. Buka `supabase/schema.sql` dari repository ini, copy seluruh isi, lalu paste di SQL Editor.
3. Klik **Run**.

## 3. Environment Variables di Vercel
Vercel → project `gxhelpdeskreport` → **Settings → Environment Variables**. Tambahkan:

- `SUPABASE_URL` = Project URL dari Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` = secret/service-role key Supabase. Hanya di Vercel, jangan taruh di GitHub atau `config.js`.
- `PUBLISH_KEY` = password buatan sendiri untuk membatasi siapa yang boleh menyimpan/mengubah report.

Set variable untuk Production (dan Preview bila diperlukan), Save, lalu **Redeploy** deployment terbaru.

## 4. Tes
Buka `https://gxhelpdeskreport.vercel.app/api/health`.
- `"database": "ok"` = koneksi dan tabel terdeteksi.
- `"database": "not-configured"` = environment variables belum terpasang dengan benar atau belum redeploy.
- `"database": "error"` = baca `detail`; bila schema missing, jalankan SQL pada langkah 2.

## 5. Publish report pertama kali
1. Buka website dari browser yang masih memiliki report/data lama.
2. Pastikan koneksi online sudah aktif, masukkan `PUBLISH_KEY` saat diminta.
3. Import report terbaru dan tunggu sampai tersimpan online.
4. Buka website dari browser/perangkat lain. Data terbaru seharusnya otomatis dimuat dari server; perangkat lain tidak perlu import ulang.

## Catatan keamanan
- `PUBLISH_KEY` hanya membatasi operasi tulis. Orang yang punya URL website masih dapat membaca report yang dipublikasikan.
- Jangan memasukkan service-role/secret key ke `config.js`, `index.html`, atau file GitHub.
- Jangan bagikan nilai secret di chat.
