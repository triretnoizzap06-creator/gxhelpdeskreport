# GX CS Report — Helpdesk CSO & VIP presentation

A static, single-file presentation website (`index.html`) for the GlobalXtreme Customer Service After Sales meeting. It turns ticket exports into an executive deck titled **Helpdesk Report**. Every content slide shows a section tab (Customer Support Report / VIP Report) at the top, so there are no separate divider slides.

- **Customer Support Report** (7 slides): Overview · Handling Team Distribution (share + team detail) · Resolution & No Response · Case Composition & Top Complaints · Agent Performance (handling + monitoring) · Best Performance (handling + monitoring) · Repeat Complaints (Ticket & Work Order).
- **VIP Report** (5 slides): VIP Overview · VIP Handling Team Distribution · VIP Top Issues & Top Groups · VIP Best Performance · VIP Repeat Complaints.
- Optional, off by default: Handling/Monitoring Agents — Ranked tables, VIP Agent Performance, VIP Handling Agents — Ranked.

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

## Calculation rules

- Eligible case: has a created date, Category and Problem. Canceled tickets are removed and duplicate ticket numbers are counted once. In a combined file, VIP = Yes rows go to VIP and are excluded from Customer Support.
- Official solved = status Solved/Closed/Resolved (and a first response, if that column is mapped).
- No response: status containing "No Response". BC 2 → *No Resp BC2*, otherwise → *No Resp After Connected*.
- H+1 reclassification: no-response case whose investigation outcome is Solved / Solved by Our Side / traffic normal. Unresolved stays unresolved.
- Adjusted resolution rate = (official solved + reclassified) ÷ total cases.
- Weeks: 7-day blocks from the first day. A tail of fewer than 4 days that ends on the last day of a month is merged into the previous week.
- Team: taken from the agent prefix (HD → Helpdesk, or Account Manager for VIP; CC → Contact Center; CSO → CSO Lobby; Disp → Dispatcher; CTSO; AI). Falls back to the Sub Division column.
- Daily chart colours: peak ≥ 1.5 × daily average, above average, below average.
- Repeat complaint (same rules as repeatcomplainthd.vercel.app): filter by Via Origin (CS = Sales Representative, VIP = VIP WhatsApp Group), exclude Activation for CS, Type = Complaint only, skip Canceled, exclude administrative categories, dedupe tickets, then rank CIDs with 2+ tickets by count → number of different problems → latest ticket. Rules are editable under Import data → Repeat Complaint → Filter rules.

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
