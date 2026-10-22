# Panduan Setup — GX Helpdesk Report (Supabase + Vercel)

Tujuan: semua orang yang membuka website melihat **report terbaru yang sama**. Data import & isian (status, Work Order, Kendala, Action, Notes, periode, urutan slide, edit teks) disimpan di **Supabase**; browser hanya menyimpan cache.

Kamu tidak perlu mengedit kode apa pun. Cukup 4 langkah di bawah.

---

## Langkah 1 — Upload ke GitHub (JANGAN sampai folder hilang)

Penyebab `/api/health` = **404** sebelumnya: file `report.js`, `health.js` ter-upload **tanpa folder `api/`**. Vercel hanya membuat endpoint dari file di dalam folder **`api/`**.

1. Extract ZIP ini di komputer. Isinya:
   ```
   api/            ← WAJIB folder (report.js, health.js, _store.js)
   supabase/       ← schema.sql
   scripts/        ← check.mjs
   assets/
   index.html
   config.js
   package.json
   package-lock.json
   vercel.json
   README-SETUP-ID.md, README.md, .env.example, .gitignore
   ```
2. Buka repo GitHub → **hapus file lama yang tercecer di root**: `report.js`, `health.js`, `store.js`, `schema.sql`, `check.mjs`, `README-SUPABASE.md` (klik file → ⋯ → Delete file → Commit).
3. Repo → **Add file → Upload files** → **seret (drag) SEMUA isi folder hasil extract sekaligus — termasuk folder `api`, `supabase`, `scripts`, `assets`** ke kotak upload (gunakan Chrome/Edge). Jangan pilih file satu per satu lewat "choose your files", karena itu menghilangkan folder.
4. **Commit changes**.
5. Cek di halaman repo: harus terlihat folder **`api`**. Klik → harus ada `report.js`, `health.js`, `_store.js`.
   (File `.env.example` dan `.gitignore` boleh tidak ikut — tidak berpengaruh.)

> Alternatif paling aman: pakai **GitHub Desktop** (copy isi ZIP ke folder repo → Commit → Push).

---

## Langkah 2 — Buat tabel di Supabase (sekali saja)

1. Supabase → project kamu → **SQL Editor** → **New query**.
2. Buka file **`supabase/schema.sql`** dari ZIP → copy **seluruh isinya** → paste → **Run**.
3. Harus muncul **"Success. No rows returned"**.
4. Cek **Table Editor**: ada tabel `report_imports`, `report_state`, `report_snapshots`, `report_config`.

SQL ini aman dijalankan ulang kapan saja (tidak menghapus data).

---

## Langkah 3 — Environment Variables di Vercel

Vercel → project website → **Settings → Environment Variables** → tambahkan (centang **Production** dan **Preview**):

| Name | Value | Wajib |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** (mis. `https://abcd1234.supabase.co`) | ya |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key (atau *Secret key* `sb_secret_…`) | ya |
| `PUBLISH_KEY` | password buatan sendiri — bila diisi, hanya orang yang memasukkan password ini yang bisa import/edit; orang lain tetap bisa melihat | tidak |

Lalu **Deployments → deployment teratas → ⋯ → Redeploy**. (Environment variable baru terbaca setelah redeploy.)

Kunci `service_role` hanya disimpan di Vercel (server). Jangan taruh di GitHub, `config.js`, atau `index.html`.

Pengaturan build Vercel (Settings → Build and Deployment): **Framework Preset = Other**, Build Command & Output Directory **kosong**, Root Directory **kosong**.

---

## Langkah 4 — Tes

1. Buka **`https://<domain-kamu>/api/health`**
   - `"database": "ok"` → siap. ✅
   - Halaman **404** → folder `api/` belum ada di GitHub (ulangi Langkah 1).
   - `"database": "not-configured"` → env Vercel belum diisi / belum Redeploy (Langkah 3).
   - `"database": "error"` + `schema-missing` → jalankan `schema.sql` (Langkah 2).
   - `"database": "error"` + `supabase-auth` → `SUPABASE_SERVICE_ROLE_KEY` salah (pakai service_role / secret, bukan anon).
2. Buka website → **Import data** sekali (bila `PUBLISH_KEY` diisi: klik status di bar atas → isi password).
3. Status di bar atas berubah jadi **"Data terbaru · tgl jam"**.
4. Buka website dari browser / HP lain → report yang sama langsung tampil tanpa import. Edit Kendala/Action/Notes/Status di satu browser → muncul di browser lain dalam ±20 detik (atau saat tab dibuka lagi).

Klik status di bar atas kapan saja untuk melihat penyebab bila belum tersambung.

---

## Catatan
- Siapa pun yang punya link bisa **melihat** report. `PUBLISH_KEY` hanya membatasi siapa yang bisa **mengubah**.
- Kolom pribadi yang tidak dipakai slide (telepon, email, alamat, NIK) tidak ikut disimpan online.
- Import terbaru selalu menggantikan report untuk semua orang; import file yang sama tidak membuat duplikat. Riwayat lama tetap bisa dibuka lewat tombol **Riwayat**.
- `config.js` dibiarkan kosong (opsi lain: koneksi langsung dengan kunci anon, tidak diperlukan bila Langkah 3 sudah dilakukan).
