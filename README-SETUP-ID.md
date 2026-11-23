# Setup GX CS Dashboard (versi tanpa folder)

Halaman:
- `/` → Dashboard (bahasa ID/EN, mode Terang/Gelap)
- `/helpdesk-report` → Helpdesk Report (tag Aftersales)
- `/helpdesk-performance` → Helpdesk Performance Report (tag Best Employee) — slide EN/ID, mode viewer
- `/helpdesk-directory` → Helpdesk Employee Directory (tag Helpdesk) — ulang tahun & reminder kontrak
Helpdesk Management (🔒):
- `/spv#todo` → Personal To-Do List (task pribadi SPV + task yang di-assign ke tim, dipisah)
- `/spv#h1` → Management Report (Reporting to Head) — riwayat: **H2 2026** (otomatis dari to-do Jul–Des) & H1 2026 (arsip, editable)
- `/management-report?r=h2-2026` → link viewer report (tanpa login, read-only; `h1-2026` … `h2-2030`)
- `/quiz` → Quiz Knowledge Base: latihan per kategori + live quiz ala Kahoot (PIN/QR, timer, leaderboard, review)

Team Dashboard (terbuka):
- `/dashboard-helpdesk` → To-Do List Helpdesk Customer Support
- `/dashboard-am` → To-Do List Account Manager VIP
- `/knowledge-base` → Knowledge Base: 50 materi (Info Helpdesk, Administrasi, Teknis, Handling & Kebijakan) + quiz per materi + link referensi (edit hanya SPV yang login)

## Update: Dashboard VIP, INV tgl 25 per group, deck report baru
- `/dashboard-vip` → clone Masterlist VIP & Intracity (semua tab). Terkunci: password tim (`GX_TEAM_PASSWORD`) atau login SPV.
  Isi pertama kali: buka Google Sheet Masterlist → File → Download → Microsoft Excel (.xlsx) → di Dashboard VIP klik **⤓ Import .xlsx** (hanya SPV). Setelah itu tim bisa tambah/edit group langsung di dashboard.
- Personal To-Do List → bulan November → **+ Task INV VIP tgl 25** sekarang membuat 12 task (1 per group) lengkap dengan link Account Data & cara kirim dari Notes Reminder Bill. Task gabungan versi lama otomatis dihapus.
- Management Report: deck baru (English, grafik animasi, key insights). Viewer link tetap sama.

## Kalau halaman bilang "env belum diisi" padahal sudah diisi di Vercel
1. Buka **/api/health** → bagian `env` menunjukkan env mana yang terbaca (true/false) di deployment yang sedang live. Nilai tidak pernah ditampilkan.
2. Env baru **tidak berlaku untuk deployment lama** → Vercel → Deployments → deployment teratas → ⋯ → **Redeploy**.
3. Pastikan env dicentang untuk **Production** dan namanya persis: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GX_DASH_PASSWORD`, `GX_TEAM_PASSWORD` (spasi/huruf kecil sekarang ditoleransi).
4. Pastikan file ZIP di-upload di **root** repo (bukan di dalam folder), termasuk file baru `_env.js`.

## Update: Quiz ala Kahoot, Tools & Access, Report 2026–2030 (Nov 2026 #2)
1. GitHub → upload SEMUA file dari ZIP (file baru: `quiz.html`, `quiz.js`, `qrcode.js`; berubah: `kb.html`, `kb-data.js`, `team.html`, `spv.html`, `mreport.js`, `todo.js`, `login.js`, `_auth.js`, `index.html`, `vercel.json`, `spv-schema.sql`).
2. Supabase → SQL Editor → jalankan ulang **`spv-schema.sql`** (menambah tabel quiz; aman dijalankan ulang).
3. Vercel → Environment Variables → tambah **`GX_TEAM_PASSWORD`** = password untuk tim (beda dengan password dashboard SPV) → Redeploy.
   Dipakai tim untuk membuka password tools di Dashboard Helpdesk / AM. Password tools diisi SPV lewat ✎ Edit tools — tersimpan di Supabase, tidak ada di kode/GitHub.
4. Quiz: buka `/quiz` (login SPV dulu di `/spv`) → pilih set (mis. Administrasi), jumlah soal & timer → **Buat sesi** → tampilkan QR/PIN → tim scan dari HP → leaderboard live → tiap peserta bisa review jawaban.

## Update: To-do Jul–Okt, INV VIP tgl 25, Report H2, Knowledge Base (Nov 2026)
1. GitHub → upload SEMUA file dari ZIP → Commit (file baru: `kb-data.js`, `mreport.js`, `report-view.html`; berubah: `spv.html`, `kb.html`, `team.html`, `todo.js`, `vercel.json`).
2. Tidak perlu SQL baru. Vercel otomatis redeploy setelah commit.
3. Buka `/spv` → **Import Monthly Tracker (Jul, Agu, Sep 2026)** — hanya mengisi bulan yang masih kosong (Oktober yang sudah ada tidak disentuh).
4. Pilih bulan November → **Salin task rutin dari bulan lalu** (bila belum) → **+ Task INV VIP tgl 25** (6 task tim, due tgl 25). Task tim ini ikut tersalin tiap bulan dan due date-nya otomatis geser ke bulan berikutnya.
5. Buka tab **Management Report** sekali → link viewer H2 aktif (tombol *Salin link*). Data report ter-update setiap tab ini dibuka.
6. Knowledge Base tidak menyimpan password. Isi materi ada di `kb-data.js`; SPV bisa edit/sembunyikan/tambah materi langsung dari halaman (tersimpan di Supabase).

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

## AFR & take over (Helpdesk Report)

AFR = menit dari **Created** sampai **first take** (orang & jam pertama yang take case). Take over sesudahnya tidak mengubah AFR dan tidak dibebankan ke yang take over.

- Export GX CS Connect menimpa *Monitor By* dan *Monitoring Date/Time* saat case di-take over. Report memakai **First Response** sebagai jejak first take: bila First Response lebih awal dari Monitoring, case dianggap take over → AFR tim memakai jam First Response, dan AFR perorangan tidak masuk ke Monitor By terakhir.
- Bila export punya kolom `afr_taken_at` / `afr_taken_by`, kolom itu yang dipakai (first take terkunci, termasuk nama).
- Otomatis juga: take over monitoring oleh Account Manager untuk case Customer Support > 3 jam setelah dibuat (case Helpdesk yang diambil alih AM). Jam first take asli tidak ada di export, jadi AFR tiket ini tidak dihitung sampai dikoreksi.
- Slide First Response by Agent menampilkan pop-up notes bila ada jam Monitoring yang janggal dibanding Created (tombol Lihat tiket / Sembunyikan; status sembunyi per browser, muncul lagi bila data berubah).
- Klik nama agent di slide First Response by Agent untuk melihat AFR per tiket.
- Take over yang tidak meninggalkan jejak di export: **Import data → Customer Support → Koreksi AFR take over**, isi satu baris per tiket `Ticket ID, nama first take, jam` (mis. `GX-CSC-20261017114927, Nilma, 11:55`). Koreksi tersimpan bersama report sehingga berlaku untuk semua viewer. Daftar "Perlu dicek" menampilkan tiket dengan AFR > 3 jam sebagai bahan cek.

## Quiz — approval peserta & review jawaban

- Peserta scan QR / masukkan PIN → isi nama → **Daftar** → layar "Menunggu approval SPV". Soal baru dikirim server setelah SPV meng-approve; jawaban dari peserta yang belum di-approve ditolak server.
- Layar host (SPV): panel **Peserta & approval** → Approve / Tolak / Approve semua. Status: Menunggu approval · Sedang mengerjakan · Selesai · Ditolak.
- Klik nama di leaderboard (atau tombol **Review**) untuk melihat jawaban tiap peserta: pilihan peserta, kunci, poin & waktu per soal.
- **Izinkan ulang**: menghapus hasil peserta itu supaya bisa mengulang (perlu daftar & di-approve lagi).
- Peserta melihat skor, leaderboard (update otomatis), dan review jawabannya sendiri setelah selesai.
- Data approval disimpan di tabel `gx_docs` (key `quiz-join-<pin>`) — **tidak perlu menjalankan SQL baru**.

## Repeat Complaint — pengecualian

Di pengaturan Repeat Complaint (Import data → kartu Repeat Complaint): **Problem dikeluarkan — CS & VIP** (default `Working Result, Billing Issue`) dan **Branch dikeluarkan** (default `Malang`). Tiket dengan problem/branch tersebut tidak dihitung sebagai repeat complaint.

## Dashboard VIP — 4 sub dashboard
- **Masterlist Data VIP**, **Masterlist Data Intracity**, **Monthly Billing Reminder – 25th**, **DIA Outstanding – Monthly Reminder**. Pilih kartu di atas (bisa juga lewat link `/dashboard-vip#intracity`, `#billing25`, `#dia`).
- Tombol **⟳ Sync dari Google Sheet** mengambil data langsung dari sheet sumber (server yang ambil, bukan browser). Syarat: sheet di-share **Anyone with the link — Viewer**. Kalau aksesnya diubah jadi private, pakai **Import .xlsx** (File → Download → .xlsx lalu upload).
- ⚙ untuk ganti sumber sheet (paste link/ID baru).
- Editan sel, kolom tambahan, baris manual, dan baris yang dihapus **tetap tersimpan** walau di-sync ulang (dicocokkan pakai nama group/UID asli dari sheet).
- Billing 25: kolom **PIC (tgl 25)** otomatis sesuai pembagian (Bagas/Desi/Sita/Sevia/Oka/Rani) + filter PIC. Tab yang punya kolom Status menampilkan Unpaid / Paid / total Outstanding.
- Data disimpan di Supabase (`gx_docs`: vip-masterlist, vip-intracity, vip-billing25, vip-dia). Tidak ada data customer di dalam ZIP. Butuh login tim/SPV.

## Dashboard Helpdesk / AM — kirim ke SPV & Desk per orang
- **Task / catatan ke SPV:** saat bikin task pilih *Assign to → ⭐ SPV — send for review*, atau di Notes pilih *For: ⭐ SPV*. Semua masuk ke **Helpdesk Management → Personal To-Do List** di kotak **📥 Dari tim** (badge merah = belum dilihat). SPV bisa set *Sedang direview / Selesai*, kirim balasan, dan tandai catatan dilihat — balasannya muncul di dashboard tim.
- Hanya SPV yang login yang bisa menulis sebagai SPV (tim tidak bisa memalsukan balasan SPV).
- **Desk:** tiap anggota punya desk sendiri (kartu foto di atas dashboard, atau tombol 🪑 My desk): foto (upload, otomatis di-crop kecil), tagline + emoji + warna, **template message** (judul, kategori, isi) dengan tombol Copy. Variabel: `{nama}` (isi nama customer di kolom atas), `{agent}`, `{tanggal}`. Template orang lain bisa disalin ke desk sendiri (+ My desk).
- Baca & copy template terbuka untuk tim; ubah desk (foto/template) perlu password tim. Data disimpan di Supabase `gx_docs` (team-desk-hd / team-desk-am). Jangan simpan nomor HP / email customer di template.

## Update — traffic per jam & desk animasi
- **Helpdesk Report:** slide "After Sales Traffic by Hour" dan "Traffic per Minute" dipecah jadi **Customer Support Traffic by Hour** (tiket CS saja) dan **VIP Traffic by Hour** (tiket VIP Group saja). Snapshot di **History** (dulu "Riwayat") yang dibuka ulang otomatis memakai 2 slide ini. Tool History sekarang berbahasa Inggris.
- VIP Traffic by Hour butuh file VIP yang punya jam Created (export tiket). Kalau file VIP hanya berisi tanggal, slide menampilkan "Jam Created tidak tersedia".
- **Desk animasi:** tiap anggota punya ilustrasi meja kantor beranimasi (foto di kursi, layar mengetik, kopi berasap, tanaman bergoyang, jam berjalan, jendela siang/sore/malam sesuai jam). Item meja dipilih di **✎ Profile → Desk items** (window, clock, shelf, lamp, coffee, plant, headset, cat, photo frame, sticky notes). Badge oranye di monitor = jumlah task terbuka. Animasi otomatis mati kalau perangkat memakai setting "reduce motion".
- **Virtual Office (isometrik):** satu kantor 3D untuk Helpdesk, Account Manager, dan **SPV Room (Putri Izza)**. Avatar full-body (wajah = foto desk) duduk di mejanya, sesekali jalan ke pantry, printer, lounge, meeting room, atau mampir ke meja teman. Ada kucing kantor juga 🐱.
  - **☕ Break / 📅 Meeting / 💻 Working:** pilih nama di "I am", lalu klik status → avatar jalan ke sofa lounge / kursi meeting dan tetap di sana sampai kembali Working (otomatis kembali setelah 4 jam). Status terlihat oleh semua (disimpan di board tim).
  - **Putri Izza (SPV):** pilih "⭐ Putri Izza (SPV)" di "I am". Status & desk SPV hanya bisa diubah kalau sudah login SPV. Foto SPV di-upload dari desk SPV di Dashboard Helpdesk.
  - Warna garis meja: hijau = clear, oranye = ada task, merah = overdue, emas = SPV. Barang di meja (kopi, tanaman, lampu, kucing, frame, headset) mengikuti Desk items di Profile. ⏸ Pause menghentikan jalan-jalan.

- **Traffic per Minute** juga dipisah: **Customer Support Traffic per Minute** dan **VIP Traffic per Minute**. Tile pertama = **Total case** periode (sama dengan total di Overview), bukan gabungan CS+VIP lagi.


## Halaman Login (Helpdesk Workspace)
- Begitu `GX_MEMBER_DEFAULT_PASSWORD` diisi, membuka **helpdeskreport.vercel.app** (Beranda) atau Dashboard Helpdesk / AM langsung diarahkan ke halaman **/login**.
- Tim: username = **nickname** (mis. Sita, Bagas) + password. Login pertama → langsung diminta ganti password.
- SPV: username **putri** (atau **spv** / **tri.retno**) + password dashboard SPV (`GX_DASH_PASSWORD`).
- Tombol **Logout** ada di kanan atas Beranda dan Dashboard tim. Knowledge Base & link viewer report tetap bisa dibuka tanpa login.

## Login per orang (Dashboard Helpdesk / AM & Virtual Office)
- Tiap anggota login pakai **nickname** (sesuai daftar 👥 Team, mis. Sita / Bagas; nama lengkap juga bisa) + password. Kalau ada nickname kembar, pakai nama lengkap. Password awal diisi SPV di **Vercel → Settings → Environment Variables → `GX_MEMBER_DEFAULT_PASSWORD`** (isi dengan password awal yang sudah kamu tentukan), lalu **Redeploy**. Password ini tidak ditulis di kode/ZIP.
- Login pertama kali → muncul "Ganti password awal". Ganti kapan saja lewat tombol **🔑 Password**. Password baru disimpan sebagai hash (scrypt) di Supabase `gx_docs` `member-auth`.
- Lupa password → SPV (login SPV) buka **👥 Team → Reset password** → kembali ke password awal.
- Setelah login: task/notes tercatat atas nama orang itu, status ☕ Break / 📅 Meeting hanya bisa diubah pemiliknya, dan **desk hanya bisa dikustom pemiliknya** (SPV & password tim tetap bisa semua).
- Virtual Office: avatarmu bisa dijalankan — klik lantai untuk jalan ke sana, atau klik peta lalu pakai tombol panah keyboard (↑ ↓ ← →). Tombol **🪑 Ke meja** untuk kembali. Kontrol peta (panah + zoom) ada di pojok kanan bawah.
- Desk → **🎨 Customize**: warna meja (oak/walnut/white/black/pink), warna kursi, layar (2 monitor / 1 monitor / laptop), dan barang di meja (kopi, tanaman, buku, piala, bebek karet, dll).
- Kalau `GX_MEMBER_DEFAULT_PASSWORD` belum diisi, dashboard tetap jalan seperti sebelumnya (pilih nama di "I am").

## Knowledge Base ⟳ Sinkronkan (dari halaman Notion publik — tanpa token)
- Sumber: halaman Notion yang sudah **Publish to web** — https://melon-lime-e28.notion.site/Customer-Service-Division-Information-GlobalXtreme-47b6a98d6f6347c5893df56334d34b25 (bisa diganti dengan env opsional `NOTION_PUBLIC_URL`). **Tidak perlu NOTION_TOKEN / integration.**
- Server membaca halaman publik + semua sub-halaman (judul, poin, checklist, toggle, callout, tabel, database, kolom, gambar, video, embed seperti Figma Site / Google Docs, dan semua link), lalu menyimpannya sebagai cache di Supabase `gx_docs` `kb-notion`.
- **Cache & refresh:** KB otomatis mengambil update saat dibuka (maks. 3 jam sekali). Tombol **⟳ Sinkronkan** untuk refresh manual (login SPV / password tim). Hanya halaman yang berubah yang diambil ulang. Halaman yang dihapus / tidak dipublikasikan lagi ikut hilang dari KB.
- **Pencarian:** kotak cari di KB mencari judul **dan isi lengkap** semua halaman (`/api/todo?kb=search&q=…`).
- Halaman baru di Notion otomatis jadi materi baru. SPV tetap bisa ubah judul, kategori, ringkasan & soal quiz per materi (✎ Edit); isi materi diubah di Notion.
- Catatan: pembacaan memakai endpoint yang sama dengan website notion.site (bukan API resmi). Kalau suatu saat Notion mengubahnya dan sinkron gagal, KB tetap menampilkan cache terakhir.

## Virtual Office 3D
- Default tampil **3D 360°**: drag untuk memutar, Ctrl + scroll / pinch untuk zoom, tombol ⟲ ⟳ untuk putar 45°, panah untuk geser, **🌀 Vibe mode** untuk auto-rotate, **📍 Me** untuk fokus ke avatarmu. Tombol **🗺 2D** untuk kembali ke tampilan isometrik (pilihan tersimpan per browser). Kalau perangkat tidak mendukung 3D (WebGL), otomatis 2D.
- 3D memakai three.js dari CDN (cdnjs / jsdelivr).

## Helpdesk Report — History Weekly & Monthly
- Jenis report **otomatis terbaca dari periode data yang di-import**: periode ≤ 10 hari = **📅 Weekly report**, lebih dari itu = **🗓 Monthly report** (masih bisa diganti manual sebelum Save now). Tidak ada kategori "Other" — snapshot lama ikut diklasifikasi dari tanggal di judulnya. Daftar dipisah per tab Weekly / Monthly / All.
- **⟳ Update** di daftar = ganti isi snapshot itu dengan report saat ini. **ID & link viewer tetap sama**, jadi orang yang membuka link langsung melihat versi terbaru.
- Saat membuka snapshot (bar kuning) lalu mengubah sesuatu → **⟳ Save changes to this snapshot**.
- Save dengan judul (jenis + periode) yang sudah ada → ditawarkan untuk memperbarui, bukan membuat duplikat. Selesai Present juga otomatis memperbarui snapshot periode yang sama.

## Helpdesk Report — History lebih cepat
- Link snapshot (`?view=1&snap=…`) langsung membuka snapshot tanpa mengunduh data terbaru dulu. Snapshot di-cache di browser (12 terakhir) dan di CDN Vercel, jadi dibuka kedua kalinya hampir instan.

## Quiz — Bank soal & refresh
- Quiz → (login SPV) **📝 Bank soal**: pilih set, cari, **✎ edit**, **🗑 hapus**, **+ Soal baru** (bisa untuk halaman Notion baru yang belum punya soal). Tersimpan di Knowledge Base, langsung dipakai latihan & sesi live baru.
- **↻ Refresh soal** di Bank soal = muat ulang soal terbaru. Di halaman sesi live, **↻ Refresh soal** mengganti soal sesi itu dengan soal terbaru (selama belum ada peserta yang mengerjakan).

## Update — History restore, status, templates board, transfer
- **Bug History hilang sudah diperbaiki.** Update snapshot otomatis dulu membuat salinan sementara yang ikut terhapus oleh pembersihan auto-save. Sekarang salinan sementara disimpan sebagai non-auto lalu dihapus setelah update. Snapshot yang hilang sudah dipulihkan dari cache browser (#33 Weekly 09–15 Nov 2026, #34 Oktober 2026 versi 7 Nov).
- **Nama Monthly Report**: kalau rentangnya tanggal 1 sampai akhir bulan, judulnya otomatis "Oktober 2026", "September 2026", dst.
- **Loading lebih cepat**: halaman cek `?meta=1` dulu; data hanya diunduh kalau ada import baru. Snapshot & data terbaru di-cache CDN per versi.
- **Status**: Locked in, On break, In a meeting, Excused (izin), Sick, On leave (cuti). SPV bisa klik desk siapa pun untuk ganti status/profil. Excused/Sick/On leave berlaku sampai akhir hari itu (avatar tidak tampil di office).
- **Templates board**: semua template tampil sebagai sticky note (seperti Quick Notes) — filter per orang, search, Copy, edit.
- **Transfer subdivisi** (SPV): buka desk → "🔁 Pindah ke …". Orangnya pindah roster, desk/template/foto ikut, task & catatan lama tetap ada di board asal dan tetap terlihat di desk-nya.
- **No. tiket di Repeat Complaint** sekarang tampil sebagai Ticket ID GX-CSC (mis. GX-CSC-20261119224804). Export RC hanya punya TCK-…, jadi dicocokkan ke data CS/VIP lewat kolom *CRM Ticket Number* (cadangan: CID + tanggal yang sama). Kalau tiketnya tidak ada di data CS/VIP yang di-import, tetap tampil TCK-….
- **Urutan Top 3 Repeat Complaint**: Weekly (≤10 hari) → tiket terbaru dulu lalu terbanyak; Monthly → repeat terbanyak. Pilihan manual Top 3 tetap diprioritaskan.
