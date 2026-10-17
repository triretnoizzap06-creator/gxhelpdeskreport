# GX CS Report — Helpdesk CSO & VIP presentation

A static, single-file presentation website (`index.html`) for the GlobalXtreme Customer Service After Sales meeting. It turns ticket exports into an executive deck titled **Helpdesk Report**. Every content slide shows a section tab (Customer Support Report / VIP Report) at the top, so there are no separate divider slides.

- **Customer Support Report**: No Response Analysis & Resolution Rate Impact (before/after KPI rows, before-vs-after H+1 rings, no response before → after) · Handling Team Distribution (every Sub Division + detail table) · Case Composition & Top Complaints (issue type, sub area and service incident as pies) · Best Performance (handling + monitoring) · Top 3 Repeat Complaints (Ticket, Work Order, Kendala, Action) · Other Repeat Complaints.
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
