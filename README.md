# GX CS Report — Helpdesk CSO & VIP presentation

A static, single-file presentation website (`index.html`) for the GlobalXtreme Customer Service After Sales meeting. It turns ticket exports into an executive deck titled **Helpdesk Report**. Every content slide shows a section tab (Customer Support Report / VIP Report) at the top, so there are no separate divider slides.

- **Customer Support Report**: No Response Analysis & Resolution Rate Impact (before/after KPI rows, before-vs-after H+1 rings, no response before → after) · Handling Team Distribution (every Sub Division + detail table) · Case Composition & Top Complaints (issue type, sub area and service incident as pies) · Best Performance (handling + monitoring) · Top 3 Repeat Complaints (User ID, status dropdown, Work Order, Kendala & Action yang bisa diisi, plus grafik status) · Other Repeat Complaints.
- **VIP Report**: VIP Overview · VIP Handling Team Distribution · VIP Top Issues & Top 5 Corporate Groups · VIP Best Performance · VIP Top 3 Repeat Complaints · VIP Other Repeat Complaints.
- Optional, off by default: Customer Support Snapshot, Handling / Monitoring Agents — Ranked, VIP Handling Agents — Ranked.

Column detection also reads cell values: a column containing "Solved by Our Side" / "Unresolved" is used as the H+1 Investigation outcome even when its header is named differently, and any header containing "Sub Div" is used as the Handle By Sub Division.

Titles and charts are in English; every content slide has a **Key highlights** strip in Bahasa Indonesia, generated from the data and editable.

Everything runs in the browser. Imported files are not uploaded anywhere.

## Data imports (Import data)

| Card | File | Used by |
|---|---|---|
| Customer Support data | Helpdesk CSO monitoring export (.xlsx/.csv) | Customer Support slides |
| VIP Group data | VIP Group monitoring export. Optional when the CS file has a VIP flag column | VIP slides |
| Repeat Complaint data | Trouble Ticket Summary export (one file for CS and VIP) | Repeat complaint slides |

Columns are detected automatically and can be changed under **Column mapping**. Required for CS/VIP: Created date, Category, Problem, Status. Optional: Investigation outcome (H+1), Service Incident, Monitored By, Handled By, Sub Area, Company / VIP Group, AFR minutes, VIP flag.

Imported rows are kept in the browser (IndexedDB), so a reload keeps the report. **Delete all data & edits** clears it.

## Calculation rules (GX CS Connect · Analytics Formulas)

- **Eligible ticket**: Category and Problem Type both filled, created in the selected period, duplicates counted once. Tickets whose Monitor By / Handle By / Reporter is an excluded user (default `DotAI, AI` — editable in Import data → Customer Support → Analytics rules) are not counted.
- **Split by VIP flag**: VIP = No (or empty) → Customer Support Report; VIP = Yes → VIP Report. The same combined file can be imported in both slots — the VIP slot only keeps VIP = Yes. A *Data check* under each import shows how many rows went to each report, Solved / first response counts and the investigation outcomes found.
- Values such as `-`, `null`, `N/A` in First Response / Investigation columns are treated as empty.
- **Solved resmi** = status Solved **and** a first response exists (when the First Response column is mapped).
- **Official rate** = Solved resmi ÷ Total Cases (kotak "Tanpa Investigasi H+1").
- **Identified Resolved / Cases Solved** = Solved resmi + No Response BC2 / After Connected whose Investigation outcome is Solved or Solved by Our Side. **Adj. / Overall Resolution Rate** = that ÷ Total Cases (target ≥90%).
- **No Response (after H+1)** = BC2 + After Connected not concluded Solved / Solved by Our Side (Unresolved stays Genuine No Response). Reclassified = before − after.
- **Non Investigated Rate** = status Solved ÷ CS tickets without an Investigation note.
- **Resolved per group** (team, agent, sub area, week, VIP): with Investigation → outcome Solved or Solved by Our Side; without Investigation → status Solved.
- **Week Performance**: After Investigation % = (Solved + Solved by Our Side) ÷ investigated tickets that week; Overall % = resolved ÷ total.
- **Handling Team** = Sub Division of the Handle By agent (column "Handle By Sub Division"); no handler or no Sub Division → Unassigned. If the column is absent, the agent prefix (HD/CC/CSO/Disp/CTSO) is used as a fallback. No Resp in team/agent tables = raw status BC2 + After Connected.
- **AFR** = minutes from ticket created to first take Monitor By (AFR Taken At / AFR minutes). Per agent = AFR Taken By (first-take agent), not Handle By; first takes by DotAI/AI are excluded; agents without a first take show "—".
- **VIP**: Total Solved by the investigation rule; Hold / No Resp = Total − Solved; one Resolution Rate (target ≥95%).
- **Top 5 Corporate Groups** = tickets with a company name, VIP flag ignored (CS + VIP).
- **Repeat complaints** (own import, Trouble Ticket Summary): CIDs with 2+ tickets, severity ≥6 HIGH, ≥5 MONITOR, ≥3 MEDIUM, otherwise LOW; "Resolved" only when every ticket of the CID is solved/closed.

## Using it

- **Period**: All imported dates, Last 7 days of data, Latest month in data, or a custom range. It applies to all three data sets.
- **Customize Present**: choose which slides appear in Present and Print/PDF (switch per slide, or the eye icon in the slide list), change their order with ↑↓, and turn individual parts of a slide on or off (for example KPI tiles, daily volume, week table). The chips under the preview do the same for the current slide. Animation can be set to *Halus* (subtle fade, charts grow once) or *Tanpa animasi*. Settings persist in the browser; Export/Import Settings moves them to another device. Hidden slides stay viewable in the editor.
- **Chart toggle**: Bar/Line or Bar/Pie on chart slides (hidden while presenting).
- **Edit text**: edit slide takeaways, Top 3 notes and VIP group descriptions in place.
- **Top 3 repeat**: choose the three CIDs from the dropdowns below the slide, or Auto. Each ticket card shows the date, ticket number, problem and, when present, the Work Order.
- **Work Order links**: click a WO chip (`+ link`) to paste its GXOne link; it then opens in a new tab from the slide and in Present. Or set a **WO link template** (for example `https://<gxone>/work-order/{wo}`) under Import data → Repeat Complaint → Filter rules so every WO gets a link automatically. A link saved on a single WO overrides the template.
- **Present**: full screen; ← → / Space / PageUp/PageDown, click, or swipe on mobile. Esc exits.
- **Print / PDF**: one 16:9 page per visible slide.

## Deploy to Vercel

Framework preset **Other**, no build command, output directory `.`. Upload the contents of this folder (index.html, vercel.json, README.md, assets/).

## Notes

- SheetJS 0.18.5 is loaded from jsDelivr, so importing needs an internet connection.
- Data and edits live in each viewer's browser and are not shared between users. Each viewer imports the files themselves.
- Validate figures against GX CS Connect before using them as an official report.


## Slide order
- Drag a slide in the sidebar list (⋮⋮ grip) to move it, or use ↑↓ in **Customize Present**. The order is saved in the browser and included in Export settings.

## H+1 investigation outcome
- The outcome column is detected by name (invest / H+1 / outcome) **or by its values** ("Solved", "Solved by Our Side", "Solved By Our-Side", "Unresolved", "Belum selesai"…).
- If the outcome lives on another sheet of the same workbook, it is joined to the main sheet by ticket number automatically.
- Free-text columns such as "Investigation Notes" are never used as the outcome; "Investigation Status" (Solved / Solved by our side / Unresolved) is preferred.
- **Data check** shows "Kolom H+1 dipakai: <column>". If it warns that none was found, set it manually in Column mapping → *Investigation outcome (H+1)*.

## Split date/time columns & AFR
- Exports that split "X Date" + "X Time" (e.g. Created Date/Time, First Response Date/Time) are merged into "X At" columns on import.
- AFR = minutes from Created to the **first take by Monitor By** (AFR Taken At / afr_taken_at). If the export has no AFR lock column, "Monitoring Date + Time" is used. First Response is never used for AFR; Handle By never counts; DotAI/AI first takes are excluded. Snapshot shows average and median.

## Corporate groups
- Top 5 corporate groups use the **VIP Group** column (most cases in the period, CS + VIP). Falls back to Company Name only when no group column exists.

## AFR (diperbaiki)
- Sumber utama = kolom **AFR taken at** (`afr_taken_at`) dikurangi Created; agen = **AFR taken by** (`afr_taken_by`). Kolom AFR menit hanya fallback bila kolom lock tidak ada (sebelumnya kolom menit mengalahkan kolom lock).
- Waktu ber-timezone (`Z`, `+07:00`) dibaca absolut; angka menit toleran format `1.234,5`.
- Baris dengan first take lebih awal dari Created, waktu tak terbaca, atau agen first take kosong dibuang dan **dihitung di Data check** beserta rata-rata & median.
- Data check memperingatkan bila kolom yang dipakai bukan kolom lock (mis. Monitoring Date/Time) atau kolom AFR taken by tidak ada.
- Tile AFR menampilkan **rata-rata** (angka utama, sama dengan GX Connect), **median**, dan **% first take ≤ 5 menit** (`AFR_SLA` di index.html). Median dan % ≤ 5 menit lebih tahan terhadap tiket ekstrem, berguna selama ekspor belum punya kolom lock.


## Repeat complaint — redesign (User ID, status, Kendala & Action)
- Slide memakai **User ID** sebagai identitas utama; CID tampil kecil di bawahnya. Kolom User ID dideteksi otomatis (`User ID`, `UserID`, `username`, `PPPoE`…) dan bisa diubah di Column mapping → *User ID*. Pengelompokan repeat tetap per CID; bila tidak ada kolom User ID, CID dipakai sebagai gantinya.
- Tiap tiket di Top 3 punya **dropdown status**: Open, WO In Progress, Closed, Cancelled. Nilai awal dibaca dari kolom Status export (Solved/Closed → Closed, Cancel → Cancelled, In Progress/WO → WO In Progress, sisanya Open).
- **Kendala** dan **Action** adalah kolom isian langsung di slide (tanpa perlu Edit text). Jika export sudah punya kolom Kendala/Action, nilainya jadi isian awal. Isian tersimpan di browser dan ikut Export settings; tombol **Reset isian** di bawah preview menghapusnya.
- Top 3 tampil sebagai tiga kolom (satu per user): strip ringkasan + bar status keseluruhan di atas, bar status per user, lalu kartu tiap tiket dengan dropdown status serta kolom Kendala & Action. Level (HIGH/MEDIUM/LOW) tidak ditampilkan lagi. Slide Other Repeat Complaints: donut/bar status (toggle Pie/Bar), bar user teratas, dan kolom status per user.
- Keterbacaan: ukuran font minimum di seluruh deck dinaikkan ke ±11px (pada lebar 1280px).
- Saat Present / Print, dropdown dan kolom isian tampil sebagai teks statis.
- Header kolom Top 3: **User ID** besar, lalu satu baris kecil `CID · Product`. Kolom User ID juga dicari lewat isi kolom (alfanumerik, mis. `kregeugenG342A`) bila namanya tidak standar; bila masih salah, pilih manual di Column mapping → *User ID*.
- Tiap tanggal punya baris `Kendala :` dan `Action :` selebar kartu; tingginya menyesuaikan panjang teks (auto-fit).

## Best Performance & AFR
- Kartu Best handling / Best monitoring (CS dan VIP) bisa digulir: semua agent tampil (peringkat 4 dst), judul kartu tetap menempel di atas.
- AFR handling = rata-rata New → first take dari tiket yang **ditangani** agent tsb (Handled By); first take AI tidak dihitung.
- AFR monitoring = rata-rata New → first take dari tiket yang **di-first-take** agent tsb (kolom AFR taken by). Arahkan kursor ke baris untuk melihat jumlah tiket yang dipakai.

## User ID tidak terbaca?
Di bawah preview semua slide Repeat Complaint ada pilihan **Kolom User ID**. Bila User ID belum terdeteksi, labelnya merah ("User ID belum terdeteksi — pilih kolom"); pilih kolom yang berisi User ID dan seluruh slide (Top 3 dan Other, CS dan VIP) langsung memakainya. Pilihan tersimpan di browser.

## Ganti user di Top 3
Klik User ID di kartu Top 3 (ada tanda ▾) untuk memilih user lain dari seluruh repeat users, termasuk yang ada di Other Repeat Complaints. Bila user yang dipilih sudah ada di rank lain, posisinya ditukar. User yang tergeser otomatis pindah ke Other Repeat Complaints. Tombol Auto di bawah preview mengembalikan urutan otomatis.

Kolom yang berisi email (header mengandung "mail" atau isinya memuat "@") tidak pernah dipakai sebagai User ID. Bila mapping lama menyimpan kolom email, otomatis diperbaiki saat halaman dibuka.

## Deteksi User ID, CID, dan nama paket
- Tampilan: **User ID** sebagai judul, di bawahnya `CID · nama paket` (mis. `250 128 505 · Lite+`) — di Top 3 maupun Other Repeat Complaints.
- User ID dicari dari isi kolom: harus mirip ID (mis. `gustisukG47DC`), bukan email, dan tiap CID punya satu User ID. Kolom berisi nilai berulang seperti `Lite`, `Lite+`, `Signature 100` dianggap nama paket (kolom Package).
- Bila deteksi masih keliru, pilih manual lewat **Kolom User ID** di bawah preview; pilihan manual tidak ditimpa deteksi otomatis. Pemetaan Package bisa diubah di Import data → Column mapping → Package.

## Package di Top 3 / Other
Baris kecil di bawah User ID: `CID · nama paket` (mis. `260 063 009 · Signature 100`). Paket dibaca dari kolom Package/Paket/Plan/Layanan/Service/Tier, atau kolom berisi teks pendek berulang bila headernya mengandung kata paket/package/plan. Bila belum terbaca, pilih lewat dropdown **Kolom Package** di bawah preview (label merah). Bila satu user punya beberapa paket, yang tampil yang paling sering muncul. Tanda ▾ di samping User ID hanya muncul saat kursor diarahkan.

Nama paket lengkap: bila file punya lebih dari satu kolom paket (mis. `Product` = Lite dan `Product Variant` = 300), keduanya digabung menjadi `Lite 300`. Bila satu user memakai beberapa paket, semuanya tampil dipisah ` / ` (maks. 3). Kolom gabungan bisa diatur lewat dropdown **+ Gabung kolom** di bawah preview.

## Cover & Thank You — Executive Dark
Slide 1 (cover) dan Thank You memakai tema gelap: judul putih + kuning, garis serat optik tipis, panel 4 angka utama (kasus & resolution rate CS/VIP dengan bar progress dan penanda target ≥90% / ≥95%). Semua angka dibaca dari data; teks tag "After Sales Meeting", judul, subjudul, dan "Disiapkan oleh" bisa diedit lewat Edit text.


## AFR = Created → First Response
- AFR = menit dari **Created (tanggal + jam)** sampai **First Response (tanggal + jam)**. "First Response Date" + "First Response Time" otomatis digabung jadi "First Response At". CS hanya VIP = No, VIP hanya VIP = Yes; tiket tanpa First Response dan user dikecualikan (DotAI) tidak dihitung.
- First response **> 3 jam** (batas interval update handling) tidak masuk rata-rata; jumlahnya ditampilkan di tile, subtitle, dan Data check. Batas diatur lewat `AFR_MAX` di index.html.
- Bila file tidak punya kolom First Response berisi jam, AFR fallback ke AFR taken at / Monitoring Date+Time.
- AFR per agent = **Monitor By** (export tidak punya kolom First Response By). AFR selalu bagian dari **Total Cases**: tiket yang dikecualikan (Handle By / Monitor By / Reporter DotAI) tidak dihitung. Selisih tiket AFR vs Total Cases = tiket tanpa First Response + tiket > 3 jam.
- Slide baru **Customer Support First Response by Agent** dan **VIP First Response by Agent**: bar AFR semua agent (per Monitor By), urut dari tercepat, garis kuning = rata-rata tim, plus ringkasan rata-rata, median, % ≤ 5 menit.

## VIP Hold Cases — Detail
- Slide baru di VIP Report: semua kasus VIP yang belum solved (Hold, In Progress, No Response yang H+1-nya Unresolved) — akun/group, customer & user ID, ticket, status, problem, alasan hold, handler.
- Alasan hold diambil dari **Investigation Notes**, atau **Description** bila notes kosong; bisa diedit lewat Edit text.

## Perbaikan CSS
- Blok `@container` tampilan mobile sebelumnya tidak tertutup sehingga aturan print ikut terbungkus; sekarang sudah ditutup.

- AFR dan **Median tampil bersebelahan** di tile First Response (Snapshot & VIP Overview) dan di kartu ringkasan slide AFR by Agent, plus selisih AFR − median.
- Key highlights slide AFR by Agent menjelaskan per poin: arti AFR (rata-rata, berapa tiket > 30 menit yang mengangkatnya), arti Median (separuh customer dibalas ≤ median), dan arti selisihnya (tercepat / perlu perhatian).


## Repeat Complaint — semua bisa diedit
- Tiap tiket (Top 3 dan Other) bisa diedit langsung: **tanggal, no. tiket, problem, WO, status, Kendala, Action**. Tombol **+ Notes** menambah kolom Notes di bawah Action.
- **+ Tambah tiket** di tiap user. Ikon **tempat sampah** di tiap tiket → pilih **Cancel / Double / Hapus** untuk mengeluarkan tiket dari slide (data export tidak berubah). Tiket yang dihapus muncul di bar "n tiket dihapus" di atas slide dan bisa **dipulihkan** satu per satu atau sekaligus, dan **+ Tambah repeat user** di slide Other Repeat Complaints (User ID bisa diganti).
- Di Other Repeat Complaints, tombol **Edit** membuka semua tiket user tsb untuk diedit.
- Saat Present / Print semua kolom tampil sebagai teks; tombol edit disembunyikan. Semua isian tersimpan di browser dan ikut Export settings; **Reset isian** menghapus isian Top 3.
- Baris dobel **tidak** digabung otomatis (supaya repeat user tidak hilang); hapus sendiri lewat ikon tempat sampah → **Double**. User tetap ada di Top 3 / Other walaupun tiketnya tinggal 1 setelah dihapus, dengan keterangan "n dihapus".
- User yang sudah punya isian (status, kendala, action, notes, dll.) diprioritaskan tetap di Top 3.
- Isian Kendala / Action / Notes tidak hilang lagi saat menyimpan link WO atau pindah slide.
- **Ctrl+Z** (Cmd+Z di Mac) membatalkan perubahan terakhir: hapus / tambah tiket, isian, status, link WO, pilihan Top 3. **Ctrl+Shift+Z** atau **Ctrl+Y** untuk redo. Saat kursor di dalam kolom isian, Ctrl+Z memakai undo bawaan kolom tsb; klik di luar kolom untuk undo per langkah. Riwayat undo berlaku selama halaman terbuka (hilang saat reload).


## Data online — link selalu up to date (Vercel Blob)
Tidak ada tombol Publish. Setiap import data, isian, atau pengaturan langsung tersimpan online (±1 detik), dan semua yang membuka link otomatis mendapat data terbaru (cek update tiap ±20 detik dan saat tab dibuka lagi).

### Setup sekali di Vercel
1. Upload/push isi zip ini ke GitHub seperti biasa (sekarang ada folder `api/` dan `package.json`).
2. Vercel → project **helpdeskreport** → tab **Storage** → **Create** → **Blob** → beri nama (mis. `gx-cs-report`) → **Connect** ke project. Vercel otomatis menambah env `BLOB_READ_WRITE_TOKEN`.
   - Akses **Private** atau **Public** sama-sama bisa. Di store Public, file disimpan di folder acak (diturunkan dari token rahasia store) sehingga alamatnya tidak bisa ditebak. Bila mau memaksa, isi env `BLOB_ACCESS` = `private` / `public`.
3. **Redeploy** project.

Selesai — import data di web, data langsung online.

### Opsional: batasi siapa yang bisa mengubah data
Tambah env **`PUBLISH_KEY`** (password) lalu redeploy. Setelah itu hanya browser yang sudah memasukkan password (klik status di bar atas → isi sekali) yang perubahannya tersimpan online; yang lain hanya melihat. Tanpa `PUBLISH_KEY`, siapa pun yang import / mengedit lewat link ikut mengubah data online.

### Catatan
- **Riwayat import** (waktu, jenis data, nama file, jumlah baris, periode data) ada di Import data dan ikut tersimpan online, jadi semua orang bisa melihat import terakhir.
- Status di bar atas: *Menyimpan…* → *Data terbaru · tgl jam*. *Hanya di browser ini* = perubahan belum bisa tersimpan online (storage belum aktif atau butuh password). Klik status untuk memuat ulang data online.
- Browser yang belum punya data tidak pernah menimpa data online; perubahan terbaru (waktu) yang dipakai bila dua orang mengedit.
- Kolom pribadi yang tidak dipakai slide (telepon, email, alamat, NIK, contact name) tidak ikut disimpan online. Siapa pun yang punya link bisa melihat data; bila perlu dibatasi aktifkan Vercel Deployment Protection.
- Endpoint: `GET /api/report`, `GET /api/report?meta=1`, `POST /api/report`.


## Riwayat report
- Tombol **Riwayat** di bar atas. Setiap **selesai Present**, kondisi report (data, periode, isian Repeat Complaint, edit teks, urutan slide) otomatis disimpan sebagai riwayat, mis. *Helpdesk Report · October 13 – 18, 2026*. Riwayat otomatis dengan judul sama dalam 3 jam diganti (tidak menumpuk). Bisa juga **Simpan sekarang** dengan nama sendiri.
- **Buka** → report tampil persis seperti saat disimpan (banner kuning di atas). Data terbaru tidak berubah; klik **Kembali ke data terbaru**. **Jadikan data utama** memulihkan riwayat itu sebagai data utama (data sebelumnya otomatis disimpan dulu ke riwayat).
- Riwayat tersimpan online (bisa dilihat semua yang membuka link) bila penyimpanan online aktif; kalau belum, disimpan di browser ini. Maks. 80 riwayat online (riwayat otomatis terlama dihapus lebih dulu).


## Cek status data online
Paling mudah: buka **`https://helpdeskreport.vercel.app/api/health`** — menampilkan `storage: "ok"` bila semua siap, atau petunjuk apa yang belum (tanpa menampilkan token).

Atau buka `https://helpdeskreport.vercel.app/api/report?meta=1` di browser:
- `{"error":"empty","open":true}` atau `{"at":…}` → server & Blob **sudah jalan**.
- Halaman **404 NOT_FOUND** dari Vercel → folder `api/` / `package.json` belum ter-deploy. Upload lagi lalu Redeploy.
- `{"error":"storage-not-configured"}` → Blob store belum terhubung ke project, atau belum Redeploy setelah connect.
Klik status di bar atas web untuk melihat penjelasan yang sama. Jendela password hanya muncul bila env `PUBLISH_KEY` dipasang.
