# GX CS Report — Helpdesk CSO & VIP presentation

A static, single-file presentation website (`index.html`) for the GlobalXtreme Customer Service After Sales meeting. It turns ticket exports into slides: one chart or key insight per slide, with an opening cover and a closing "Thank you" slide.

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
- **Manage Sections**: show or hide individual slides or whole groups. Hidden slides are skipped in the slide list, Present and Print/PDF. Settings persist in the browser; Export/Import Settings moves them to another device.
- **Chart toggle**: Bar/Line or Bar/Pie on chart slides (hidden while presenting).
- **Edit text**: edit slide takeaways, Top 3 notes and VIP group descriptions in place.
- **Top 3 repeat**: choose the three CIDs from the dropdowns below the slide, or Auto.
- **Present**: full screen; ← → / Space / PageUp/PageDown, click, or swipe on mobile. Esc exits.
- **Print / PDF**: one 16:9 page per visible slide.

## Deploy to Vercel

Framework preset **Other**, no build command, output directory `.`. Upload the contents of this folder (index.html, vercel.json, README.md, assets/).

## Notes

- SheetJS 0.18.5 is loaded from jsDelivr, so importing needs an internet connection.
- Data and edits live in each viewer's browser and are not shared between users. Each viewer imports the files themselves.
- Validate figures against GX CS Connect before using them as an official report.
