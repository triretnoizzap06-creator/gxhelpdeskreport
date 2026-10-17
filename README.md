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
