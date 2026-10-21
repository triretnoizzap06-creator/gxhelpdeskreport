# GX Helpdesk Report — setup Supabase (shared report)

## Struktur wajib di GitHub
Di root repository harus terlihat:
- `api/report.js`
- `api/health.js`
- `lib/store.js`
- `supabase/schema.sql`
- `scripts/check.mjs`
- `index.html`, `config.js`, `package.json`

File API tidak boleh diletakkan di root; Vercel hanya mendaftarkannya sebagai route ketika berada di folder `api/`.

## 1. Buat tabel Supabase
1. Buka Supabase project yang digunakan untuk GX Helpdesk Report.
2. Masuk ke **SQL Editor → New query**.
3. Buka file `supabase/schema.sql` dari ZIP ini, salin seluruh isinya, lalu jalankan sekali.
4. Pastikan query selesai tanpa error.

## 2. Isi environment variables di Vercel
Vercel → project `gxhelpdeskreport` → **Settings → Environment Variables**:
- `SUPABASE_URL` = Project URL dari Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` = secret/service-role key dari project yang sama.
- `PUBLISH_KEY` = password yang kamu tentukan untuk membatasi siapa yang boleh mengubah data online.

Jangan masukkan `SUPABASE_SERVICE_ROLE_KEY` ke `config.js`, `index.html`, atau GitHub. Jangan kirim secret key ke chat. `PUBLISH_KEY` harus diingat untuk dimasukkan ke fitur Simpan data online di website.

## 3. Deploy dan tes
1. Commit perubahan repository, tunggu Vercel selesai deploy.
2. Buka `https://gxhelpdeskreport.vercel.app/api/health`.
3. Pastikan respons menunjukkan `database: "ok"`. Jika bukan `ok`, baca `hint` dan `detail` pada respons sebelum menguji import.
4. Buka website, masukkan password `PUBLISH_KEY` melalui panel **Simpan data online** jika diminta.
5. Dari browser yang memiliki data terbaru, import report lalu tunggu status penyimpanan online berhasil.
6. Buka website di browser/perangkat lain. Report terbaru seharusnya dimuat dari Supabase.

## Catatan
- Data yang hanya tersimpan di localStorage/IndexedDB browser lama tidak otomatis menjadi data bersama. Setelah database tersambung, lakukan import dari browser yang memiliki file sumber atau data terbaru.
- `PUBLISH_KEY` membatasi operasi tulis, bukan membaca report. Siapa pun yang memiliki URL website dapat membaca report bersama kecuali akses website juga dibatasi.
