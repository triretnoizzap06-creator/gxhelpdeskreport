/* Management Report deck — used by spv.html (Management Report) and report-view.html (public viewer link).
   Input snapshot: { key, title, kicker, title1, title2, period, by, role, division, generatedAt, auto,
     months:[{ ym, name, sections:[{ key, name, tasks:[{ title, cat, status, priority, links }] }] }],
     team:{ HD:{ n, done, prog, people:{ name:{ n, done } } }, AM:{…} } }
   Status: DONE / IN PROGRESS / PLAN / NOT STARTED. No remarks in snapshots (safe for the viewer link).
   Charts are plain SVG/CSS and animate when a slide becomes active. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
  const SEC = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', FERRE: "Pak Ferre's tasks", ONEOFF: 'One-off' };
  const ORDER = ['DAILY', 'WEEKLY', 'MONTHLY', 'FERRE', 'ONEOFF'];
  const ST = { 'DONE': ['Done', 'd'], 'IN PROGRESS': ['In progress', 'p'], 'PLAN': ['Planned', 'l'], 'NOT STARTED': ['Not started', 'n'] };
  const COL = { d: '#16A34A', p: '#F59E0B', l: '#94A3B8', n: '#CBD5E1', x: '#E5484D' };
  const LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
  const ymName = ym => { const [y, m] = ym.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
  const short = n => String(n || '').replace(/ \d{4}$/, '');
  const mon3 = n => short(n).slice(0, 3);

  const CSS = `
.mr{--bg:#FFFFFF;--card:#F8FAFC;--ink:#0F172A;--mut:#64748B;--line:#E2E8F0;--y:#D99A00;--yb:#FFF4D6;--trk:#EEF2F6;--navy:#0B1B33;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.mr *{box-sizing:border-box}
.mr-stage{position:relative;background:var(--bg);border-radius:20px;overflow:hidden;width:100%;aspect-ratio:16/9;box-shadow:0 1px 2px rgba(15,23,42,.06),0 24px 60px rgba(15,23,42,.12);outline:none;container-type:inline-size}
.mr-slide{position:absolute;inset:0;padding:4.4cqw 5cqw 5.2cqw;display:none;flex-direction:column;overflow:hidden}
.mr-slide.on{display:flex}
.mr-slide.on .mr-in{animation:mrUp .55s cubic-bezier(.2,.7,.2,1) both}
.mr-slide.on .mr-in:nth-child(2){animation-delay:.05s}.mr-slide.on .mr-in:nth-child(3){animation-delay:.1s}.mr-slide.on .mr-in:nth-child(4){animation-delay:.15s}.mr-slide.on .mr-in:nth-child(5){animation-delay:.2s}
@keyframes mrUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.mr-head{display:flex;align-items:flex-end;gap:2cqw;margin-bottom:2.2cqw}.mr-head>div{flex:1;min-width:0}
.mr-kick{font-size:max(9px,.9cqw);font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--y)}
.mr-h{font-size:max(18px,2.55cqw);font-weight:750;letter-spacing:-.022em;margin:.5cqw 0 0;line-height:1.12;color:var(--ink)}
.mr-sub{color:var(--mut);font-size:max(11px,1.12cqw);margin:.6cqw 0 0;line-height:1.45}
.mr-tag{font-size:max(9px,.85cqw);color:var(--mut);font-weight:600;white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:.3cqw .9cqw}
/* cover */
.mr-cover{background:radial-gradient(60% 80% at 85% 10%,rgba(217,154,0,.28),transparent 60%),radial-gradient(50% 60% at 0% 100%,rgba(56,97,160,.35),transparent 60%),var(--navy);color:#fff;justify-content:space-between}
.mr-cover .mr-kick{color:#F5C44E}.mr-cover .logo{height:max(16px,1.9cqw);opacity:.95}
.mr-cover .t1{font-size:max(30px,5.6cqw);font-weight:800;line-height:1;letter-spacing:-.035em;margin-top:1.6cqw}
.mr-cover .t2{font-size:max(30px,5.6cqw);font-weight:800;line-height:1.04;letter-spacing:-.035em;color:#F5C44E}
.mr-cover .per{margin-top:1.6cqw;font-size:max(12px,1.35cqw);color:rgba(255,255,255,.72);font-weight:500}
.mr-cover .rule{width:6cqw;height:3px;background:#F5C44E;border-radius:2px;margin-top:2cqw}
.mr-by{display:flex;gap:3cqw;align-items:flex-end}.mr-by small{display:block;font-size:max(8.5px,.8cqw);letter-spacing:.16em;color:rgba(255,255,255,.55);font-weight:700}.mr-by b{display:block;font-size:max(13px,1.45cqw);margin-top:.4cqw;font-weight:650}.mr-by span{color:rgba(255,255,255,.65);font-size:max(10.5px,1cqw)}
/* layout */
.mr-grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:1.8cqw;min-height:0;align-items:start}
.mr-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4cqw}
.mr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2cqw;margin-bottom:1.6cqw}
.mr-kpi{background:var(--card);border:1px solid var(--line);border-radius:1.2cqw;padding:1.3cqw 1.4cqw}.mr-kpi span{display:block;font-size:max(9px,.82cqw);color:var(--mut);font-weight:650;letter-spacing:.06em;text-transform:uppercase}
.mr-kpi b{display:block;font-size:max(20px,2.9cqw);font-weight:750;letter-spacing:-.03em;margin-top:.3cqw;font-variant-numeric:tabular-nums;line-height:1.05}.mr-kpi i{font-style:normal;font-size:max(9.5px,.9cqw);color:var(--mut)}
.mr-kpi.hero{background:var(--navy);border-color:var(--navy);color:#fff}.mr-kpi.hero span,.mr-kpi.hero i{color:rgba(255,255,255,.7)}.mr-kpi.hero b{color:#F5C44E}
.mr-lead{font-size:max(14px,1.75cqw);font-weight:600;letter-spacing:-.01em;line-height:1.35;margin:0 0 1.6cqw;color:var(--ink)}.mr-lead em{font-style:normal;color:var(--y)}
.mr-ins{display:flex;flex-direction:column;gap:.8cqw}
.mr-insi{display:flex;gap:1cqw;align-items:flex-start;font-size:max(11px,1.12cqw);line-height:1.45;padding:.9cqw 0;border-top:1px solid var(--line)}.mr-insi:first-child{border-top:0;padding-top:0}
.mr-insi b.n{flex:none;width:max(18px,1.9cqw);height:max(18px,1.9cqw);border-radius:50%;display:grid;place-items:center;background:var(--trk);color:var(--ink);font-size:max(9.5px,.9cqw)}
.mr-insi.good b.n{background:#DCFCE7;color:#166534}.mr-insi.warn b.n{background:#FFE4E6;color:#9F1239}
.mr-card{background:var(--bg);border:1px solid var(--line);border-radius:1.3cqw;padding:1.5cqw 1.6cqw;min-height:0;overflow:hidden}
.mr-card h4{margin:0 0 1.1cqw;font-size:max(9.5px,.88cqw);letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;gap:8px;color:var(--ink);font-weight:700}.mr-card h4 span{color:var(--mut);font-weight:600}
/* column chart */
.mr-cols3{display:flex;align-items:flex-end;gap:2.2cqw;height:20cqw;padding:.5cqw .4cqw 0;border-bottom:1px solid var(--line);position:relative}
.mr-colw{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.mr-colv{font-weight:700;font-size:max(10.5px,1.05cqw);margin-bottom:.5cqw;font-variant-numeric:tabular-nums}.mr-colv small{display:block;font-size:max(8px,.72cqw);color:var(--mut);font-weight:600;text-align:center;letter-spacing:.06em}
.mr-col{width:min(5cqw,100%);display:flex;flex-direction:column-reverse;border-radius:.7cqw .7cqw .25cqw .25cqw;overflow:hidden;height:0;transition:height 1s cubic-bezier(.2,.8,.2,1)}
.mr-col i{display:block;flex:none;width:100%}.mr-col.mtd{outline:2px dashed var(--y);outline-offset:2px}
.mr-colx{display:flex;gap:2.2cqw;padding:.7cqw .4cqw 0}.mr-colx span{flex:1;text-align:center;font-size:max(9.5px,.95cqw);color:var(--mut);font-weight:600}
.mr-slide.play .mr-col{height:var(--h)}
/* horizontal bars */
.mr-hb{display:grid;grid-template-columns:minmax(70px,13cqw) 1fr 4.5cqw;gap:1cqw;align-items:center;font-size:max(10.5px,1.02cqw);margin:.75cqw 0}
.mr-hb .t{height:max(7px,.85cqw);border-radius:999px;background:var(--trk);overflow:hidden;display:flex}.mr-hb .t i{display:block;height:100%;width:0;transition:width 1.1s cubic-bezier(.2,.8,.2,1)}
.mr-slide.play .mr-hb .t i{width:var(--w)}.mr-hb .v{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}.mr-hb .lb{color:var(--ink);font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* donut */
.mr-donut{display:flex;align-items:center;gap:1.6cqw}.mr-donut svg{flex:none;transform:rotate(-90deg);width:var(--sz);height:var(--sz)}
.mr-donut circle.s{fill:none;stroke-width:14;stroke-dasharray:0 999;transition:stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)}
.mr-slide.play .mr-donut circle.s{stroke-dasharray:var(--a) 999}
.mr-donut .ctr{position:relative;flex:none}.mr-donut .ctr b{position:absolute;inset:0;display:grid;place-items:center;font-size:max(13px,1.55cqw);font-weight:750;letter-spacing:-.02em}
.mr-leg{display:flex;gap:1.4cqw;flex-wrap:wrap;font-size:max(9.5px,.9cqw);color:var(--mut);margin-top:1cqw}.mr-leg i{display:inline-block;width:max(7px,.7cqw);height:max(7px,.7cqw);border-radius:2px;margin-right:.5cqw;vertical-align:0}
.mr-legv{display:flex;flex-direction:column;gap:.6cqw;font-size:max(10.5px,1cqw)}.mr-legv span{display:flex;align-items:center;gap:.7cqw}.mr-legv i{width:max(8px,.8cqw);height:max(8px,.8cqw);border-radius:2px;display:inline-block}.mr-legv b{margin-left:auto;padding-left:1cqw;font-variant-numeric:tabular-nums}
/* month */
.mr-mgrid{display:grid;grid-template-columns:.95fr 1.05fr;gap:1.6cqw;min-height:0;align-items:start}
.mr-ms{display:grid;grid-template-columns:repeat(4,1fr);gap:.8cqw;margin-top:1.2cqw}.mr-ms div{background:var(--card);border:1px solid var(--line);border-radius:1cqw;padding:.8cqw;text-align:center}.mr-ms b{display:block;font-size:max(15px,1.8cqw);font-weight:750;font-variant-numeric:tabular-nums}.mr-ms span{font-size:max(8px,.75cqw);color:var(--mut);font-weight:650;text-transform:uppercase;letter-spacing:.05em}
.mr-lists{display:grid;grid-template-columns:1fr 1fr;gap:1.4cqw;margin-top:1.4cqw}
.mr-tk{display:flex;gap:.8cqw;align-items:flex-start;padding:.55cqw 0;border-top:1px solid var(--line);font-size:max(10px,.98cqw);line-height:1.35}.mr-tk:first-of-type{border-top:0}
.mr-dot{flex:none;width:max(7px,.7cqw);height:max(7px,.7cqw);border-radius:50%;margin-top:.45cqw}
.mr-dot.d{background:#16A34A}.mr-dot.p{background:#F59E0B}.mr-dot.l{background:#94A3B8}.mr-dot.n{background:#CBD5E1}.mr-dot.x{background:#E5484D}
.mr-tk .tt{flex:1;min-width:0}.mr-tk .cat{font-size:max(8px,.72cqw);font-weight:700;color:var(--mut);margin-left:.5cqw;letter-spacing:.05em}
.mr-tk a.ic{color:#2563EB;display:inline-flex;vertical-align:-2px;margin-left:.4cqw}.mr-tk a.ic svg{width:max(10px,1cqw);height:max(10px,1cqw);stroke:currentColor;fill:none;stroke-width:2.2}
.mr-more{font:600 max(9.5px,.9cqw) inherit;color:#2563EB;padding:.5cqw 0 0;background:none;border:0;cursor:pointer}.mr-more:hover{text-decoration:underline}
.mr-rest{display:none}.mr-card.all .mr-rest{display:block}.mr-card.all{max-height:34cqw;overflow:auto}.mr-card.all .mr-more{display:none}
.mr-tk a.ttl{color:var(--ink);text-decoration:none;border-bottom:1px solid rgba(37,99,235,.35)}.mr-tk a.ttl:hover{color:#2563EB;border-bottom-color:#2563EB}
.mr-empty{color:var(--mut);font-size:max(10.5px,1cqw);padding:.4cqw 0}
/* controls */
.mr-ctl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}
.mr-ctl button,.mr-ctl a{font:600 13px Inter,-apple-system,sans-serif;border:1px solid var(--line,#E2E8F0);background:var(--card,#fff);color:var(--ink,#0F172A);border-radius:999px;padding:7px 13px;cursor:pointer;text-decoration:none}
.mr .mr-ctl button{background:#fff;border-color:#E2E8F0;color:#0F172A}.mr .mr-ctl button[aria-pressed="true"]{background:#0B1B33;color:#fff;border-color:#0B1B33}
.mr-ctl .pg{font-size:12.5px;color:#64748B;margin:0 4px;font-variant-numeric:tabular-nums}.mr-ctl .sp{flex:1}.mr-dots{display:flex;gap:5px;flex-wrap:nowrap;overflow-x:auto;max-width:100%;scrollbar-width:none}.mr-dots::-webkit-scrollbar{display:none}.mr-dots button{white-space:nowrap}
.mr-prog{position:absolute;left:0;top:0;height:3px;background:var(--y);transition:width .35s ease;z-index:2}
.mr-stage:fullscreen{border-radius:0;width:100vw;height:100vh;aspect-ratio:auto;background:#000;display:flex;align-items:center;justify-content:center}
.mr-stage:fullscreen .mr-slide{inset:auto;position:relative;width:min(100vw,177.78vh);height:min(100vh,56.25vw);container-type:inline-size;background:var(--bg)}.mr-stage:fullscreen .mr-slide:not(.on){display:none}.mr-stage:fullscreen .mr-cover{background:radial-gradient(60% 80% at 85% 10%,rgba(217,154,0,.28),transparent 60%),radial-gradient(50% 60% at 0% 100%,rgba(56,97,160,.35),transparent 60%),var(--navy)}
.mr-foot{position:absolute;left:5cqw;right:5cqw;bottom:1.8cqw;display:flex;justify-content:space-between;align-items:center;font-size:max(9px,.8cqw);color:var(--mut);pointer-events:none;z-index:1}.mr-foot.inv{color:rgba(255,255,255,.55)}
@media (prefers-reduced-motion:reduce){.mr *{transition:none!important;animation:none!important}}
@media (max-width:760px){.mr-stage{aspect-ratio:auto}.mr-slide{position:relative;padding:24px 18px 46px}.mr-slide:not(.on){display:none}.mr-grid2,.mr-mgrid,.mr-lists{grid-template-columns:1fr}.mr-kpis{grid-template-columns:1fr 1fr}.mr-hb{grid-template-columns:86px 1fr 40px}.mr-cols3{height:200px}.mr-foot{left:18px;right:18px;bottom:14px}}

/* cover variants */
.mr-cover .cv-main{position:relative;z-index:1}.mr-cover .mr-by{position:relative;z-index:1}.mr-cover .cv-art{position:absolute;pointer-events:none}
.mr .mr-cover.cv-clean,.mr-stage:fullscreen .mr-cover.cv-clean{background:#fff!important;color:var(--ink);box-shadow:inset 1.1cqw 0 0 #F5C518}
.mr-cover.cv-clean .mr-kick{color:#B07D00}.mr-cover.cv-clean .t2{color:#B07D00}.mr-cover.cv-clean .per{color:var(--mut)}.mr-cover.cv-clean .rule{background:#F5C518}
.mr-cover.cv-clean .cv-art{right:-1cqw;bottom:-5cqw;font-size:26cqw;font-weight:900;letter-spacing:-.06em;line-height:1;color:#F1F5F9}
.mr-cover:not(.cv-navy):not(.cv-mono) .mr-by small{color:var(--mut)}.mr-cover:not(.cv-navy):not(.cv-mono) .mr-by span{color:var(--mut)}.mr-cover:not(.cv-navy):not(.cv-mono) .mr-by b{color:var(--ink)}
.mr .mr-cover.cv-split,.mr-stage:fullscreen .mr-cover.cv-split{background:linear-gradient(90deg,#fff 0 58%,#F5C518 58%)!important;color:var(--ink)}
.mr-cover.cv-split .cv-main,.mr-cover.cv-split .mr-by{max-width:50%}.mr-cover.cv-split .mr-kick{color:#B07D00}.mr-cover.cv-split .t2{color:var(--ink)}.mr-cover.cv-split .per{color:var(--mut)}.mr-cover.cv-split .rule{background:var(--ink)}
.mr-cover.cv-split .cv-art{left:58%;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;padding:0 4cqw;color:var(--navy)}
.mr-cover.cv-split .a1{font-size:15cqw;font-weight:900;letter-spacing:-.05em;line-height:.9}.mr-cover.cv-split .a2{font-size:5cqw;font-weight:800;letter-spacing:-.03em;opacity:.85}.mr-cover.cv-split .a3{margin-top:2cqw;font-size:max(9px,1cqw);font-weight:700;letter-spacing:.18em;text-transform:uppercase;opacity:.7}
.mr .mr-cover.cv-gold,.mr-stage:fullscreen .mr-cover.cv-gold{background:linear-gradient(135deg,#FFE066 0%,#F5C518 45%,#E8A200 100%)!important;color:var(--navy)}
.mr-cover.cv-gold .mr-kick{color:var(--navy);opacity:.75}.mr-cover.cv-gold .t2{color:#fff;text-shadow:0 .2cqw .8cqw rgba(120,70,0,.25)}.mr-cover.cv-gold .per{color:rgba(11,27,51,.7)}.mr-cover.cv-gold .rule{background:var(--navy)}
.mr-cover.cv-gold .mr-by small,.mr-cover.cv-gold .mr-by span{color:rgba(11,27,51,.6)!important}
.mr-cover.cv-gold .cv-art{inset:0}.mr-cover.cv-gold .cv-art i{position:absolute;border-radius:50%;border:.25cqw solid rgba(255,255,255,.45)}.mr-cover.cv-gold .cv-art i:nth-child(1){width:38cqw;height:38cqw;right:-8cqw;top:-10cqw}.mr-cover.cv-gold .cv-art i:nth-child(2){width:24cqw;height:24cqw;right:6cqw;top:4cqw;border-color:rgba(11,27,51,.12)}.mr-cover.cv-gold .cv-art i:nth-child(3){width:14cqw;height:14cqw;right:24cqw;bottom:-4cqw;background:rgba(255,255,255,.22);border:0}
.mr .mr-cover.cv-mono,.mr-stage:fullscreen .mr-cover.cv-mono{background:#0A0A0B!important;color:#fff}
.mr-cover.cv-mono .mr-kick{color:#F5C518}.mr-cover.cv-mono .t2{color:#F5C518}.mr-cover.cv-mono .rule{background:#F5C518}
.mr-cover.cv-mono .cv-art{right:3cqw;top:50%;transform:translateY(-50%);font-size:24cqw;font-weight:900;letter-spacing:-.05em;line-height:1;color:transparent;-webkit-text-stroke:.18cqw rgba(245,197,24,.55)}
.mr-cvp{display:flex;gap:12px;align-items:flex-end;overflow-x:auto;padding:4px 2px 10px;margin-bottom:10px}.mr-cvl{font-size:12px;font-weight:700;color:var(--mut);align-self:center;white-space:nowrap}
.mr-cvb{flex:0 0 auto;width:168px;border:2px solid transparent;background:none;border-radius:12px;padding:3px;cursor:pointer;font:inherit;color:var(--ink);text-align:center}.mr-cvb[aria-pressed="true"]{border-color:#0A84FF}.mr-cvb:hover{border-color:var(--line)}.mr-cvb[aria-pressed="true"]:hover{border-color:#0A84FF}
.mr-cvb span{display:block;font-size:12px;font-weight:600;margin-top:5px}.mini-w{width:160px;height:90px;overflow:hidden;border-radius:8px;box-shadow:0 1px 4px rgba(15,23,42,.15)}.mr-stage.mini{text-align:left;width:1280px;aspect-ratio:16/9!important;transform:scale(.125);transform-origin:0 0;border-radius:0;box-shadow:none;pointer-events:none}.mr-stage.mini .mr-slide{position:absolute!important;padding:4.4cqw 5cqw 5.2cqw!important}.mr-stage.mini .mr-in{animation:none!important}
@media (max-width:760px){.mr-cover.cv-split .cv-main,.mr-cover.cv-split .mr-by{max-width:56%}}
`;
  function injectCss() { if (document.getElementById('mr-css2')) return; const s = document.createElement('style'); s.id = 'mr-css2'; s.textContent = CSS; document.head.appendChild(s); }

  const stats = tasks => { const c = k => tasks.filter(t => t.status === k).length, n = tasks.length, d = c('DONE');
    return { n, d, p: c('IN PROGRESS'), l: c('PLAN'), ns: c('NOT STARTED'), pct: n ? Math.round(d / n * 100) : 0 }; };
  const allTasks = m => m.sections.flatMap(s => s.tasks);
  const pctTxt = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

  function tk(t, suffix, missed) {
    const k0 = (ST[t.status] || ST['NOT STARTED'])[1], k = missed && t.status !== 'DONE' && t.status !== 'IN PROGRESS' ? 'x' : k0, links = (t.links || []).map(l => safeUrl(l.url)).filter(Boolean);
    /* judul task = link ke hasil kerjanya (link pertama); link lain tetap sebagai ikon */
    const ttl = links.length ? `<a class="ttl" href="${esc(links[0])}" target="_blank" rel="noopener" title="Buka: ${esc(links[0])}">${esc(t.title)}</a>` : esc(t.title);
    return `<div class="mr-tk"><i class="mr-dot ${k}" title="${esc((ST[t.status] || ST['NOT STARTED'])[0])}"></i><div class="tt">${ttl}${suffix ? ` <span class="cat">${esc(suffix)}</span>` : t.cat && t.cat !== 'General' ? `<span class="cat">${esc(String(t.cat).toUpperCase())}</span>` : ''}${links.map((u, i) => `<a class="ic" href="${esc(u)}" target="_blank" rel="noopener" title="${i ? 'Link ' + (i + 1) : 'Open link'}">${LINK}</a>`).join('')}</div></div>`;
  }
  const list = (arr, max, fn, empty) => arr.length ? arr.slice(0, max).map(fn).join('') + (arr.length > max ? `<div class="mr-rest">${arr.slice(max).map(fn).join('')}</div><button type="button" class="mr-more" data-mr-more>+${arr.length - max} more</button>` : '') : `<div class="mr-empty">${empty}</div>`;
  const LEG = (missed) => `<div class="mr-leg"><span><i style="background:${COL.d}"></i>Done</span><span><i style="background:${COL.p}"></i>In progress</span><span><i style="background:${COL.l}"></i>Planned</span><span><i style="background:${COL.n}"></i>Open</span>${missed ? `<span><i style="background:${COL.x}"></i>Not completed (closed month)</span>` : ''}</div>`;
  function donut(parts, sz, center) {
    const size = 120, r = (size - 16) / 2, C = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0;
    const segs = parts.filter(p => p.v).map(p => { const a = p.v / tot * C, x = `<circle class="s" cx="60" cy="60" r="${r}" stroke="${p.c}" style="--a:${a.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"></circle>`; off += a; return x; }).join('');
    return `<div class="ctr" style="--sz:max(${Math.round(sz * .55)}px,${(sz / 12).toFixed(1)}cqw)"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#EEF2F6" stroke-width="14"></circle>${segs}</svg><b>${center}</b></div>`;
  }
  const hb = (label, s, extra, missed) => `<div class="mr-hb"><span class="lb" title="${esc(label)}">${esc(label)}</span><div class="t">${s.n ? ['d', 'p', 'l', 'ns'].map(k => `<i style="--w:${(s[k] / s.n * 100).toFixed(2)}%;background:${k === 'ns' ? (missed ? COL.x : COL.n) : COL[k]}"></i>`).join('') : ''}</div><span class="v">${extra != null ? extra : s.n ? s.pct + '%' : '—'}</span></div>`;
  const head = (kick, title, sub, tag) => `<div class="mr-head mr-in"><div><div class="mr-kick">${esc(kick)}</div><div class="mr-h">${title}</div>${sub ? `<p class="mr-sub">${sub}</p>` : ''}</div>${tag ? `<span class="mr-tag">${esc(tag)}</span>` : ''}</div>`;

  /* ---------- key insights (facts only, computed from the data) ---------- */
  function insights(S, withTasks, months) {
    const now = new Date(), curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const out = [], ms = withTasks.map(m => ({ m, s: stats(allTasks(m)) }));
    if (!ms.length) return [['', 'No tasks recorded for this period yet — the report fills in automatically as tasks are added to the to-do list.']];
    const closed = ms.filter(x => x.m.ym < curYm), cmp = closed.length ? closed : ms, ct = stats(cmp.flatMap(x => allTasks(x.m)));
    out.push(['', `<b>${ct.pct}%</b> of planned work delivered in ${closed.length ? 'closed months' : 'the period'} (${ct.d} of ${ct.n} tasks).`]);
    if (cmp.length > 1) {
      const best = cmp.reduce((a, b) => b.s.pct > a.s.pct ? b : a), worst = cmp.reduce((a, b) => b.s.pct < a.s.pct ? b : a);
      out.push(['good', `<b>${esc(short(best.m.name))}</b> was the strongest month — <b>${best.s.pct}%</b> completion.`]);
      if (worst !== best) out.push(['warn', `<b>${esc(short(worst.m.name))}</b> was the lowest at <b>${worst.s.pct}%</b> (${worst.s.n - worst.s.d} open).`]);
      const a = cmp[cmp.length - 2], b = cmp[cmp.length - 1], dlt = b.s.pct - a.s.pct;
      if (dlt) out.push([dlt > 0 ? 'good' : 'warn', `Completion ${dlt > 0 ? 'up' : 'down'} <b>${Math.abs(dlt)} pts</b> from ${esc(short(a.m.name))} to ${esc(short(b.m.name))}.`]);
    }
    const flat = ms.flatMap(x => allTasks(x.m)), hi = flat.filter(t => t.priority === 'High'), hd = hi.filter(t => t.status === 'DONE').length;
    if (hi.length) out.push([hd / hi.length >= .8 ? 'good' : '', `High-priority work: <b>${hd}/${hi.length}</b> delivered (${pctTxt(hd, hi.length)}).`]);
    const vip = flat.filter(t => String(t.cat).toUpperCase() === 'VIP'), vd = vip.filter(t => t.status === 'DONE').length;
    if (vip.length) out.push(['', `VIP account work: <b>${vd}/${vip.length}</b> delivered (${pctTxt(vd, vip.length)}).`]);
    const running = ms.filter(x => x.m.ym >= curYm);
    if (running.length) { const r = running[running.length - 1]; out.push(['', `<b>${esc(short(r.m.name))}</b> is in progress — ${r.s.d}/${r.s.n} done so far (month to date).`]); }
    const T = S.team || {}, tn = (T.HD ? T.HD.n : 0) + (T.AM ? T.AM.n : 0), td = (T.HD ? T.HD.done : 0) + (T.AM ? T.AM.done : 0);
    if (tn) out.push(['', `<b>${tn}</b> tasks delegated to Helpdesk & AM — <b>${td}</b> done (${pctTxt(td, tn)}).`]);
    return out.slice(0, 6);
  }

  function slides(S) {
    const out = [], now = new Date(), curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = S.months || [], withTasks = months.filter(m => allTasks(m).length);
    const flat = withTasks.flatMap(allTasks), tot = stats(flat), ins = insights(S, withTasks, months);
    const closed = withTasks.filter(m => m.ym < curYm), cs = stats(closed.flatMap(allTasks)), hiAll = flat.filter(t => t.priority === 'High'), hiDone = hiAll.filter(t => t.status === 'DONE').length;
    const tag = `${S.title || 'Management Report'} · ${S.division || 'Customer Service'}`;
    const best = closed.length ? closed.reduce((a, b) => stats(allTasks(b)).pct > stats(allTasks(a)).pct ? b : a) : null;
    /* 1 cover */
    out.push(['Cover', coverHtml(S)]);
    /* 2 executive summary */
    const leadPct = closed.length ? cs.pct : tot.pct;
    out.push(['Summary', `<div class="mr-slide">${head('Executive summary', esc(S.period || ''), '', tag)}
      <p class="mr-lead mr-in">The team delivered <em>${leadPct}%</em> of planned work${closed.length ? ` across ${closed.length} closed month${closed.length > 1 ? 's' : ''}` : ''}${best ? `, peaking in ${esc(short(best.name))} at ${stats(allTasks(best)).pct}%` : ''}${hiAll.length ? ` — high-priority delivery at ${pctTxt(hiDone, hiAll.length)}` : ''}.</p>
      <div class="mr-kpis mr-in"><div class="mr-kpi hero"><span>Completion rate</span><b data-count="${leadPct}" data-suffix="%">0%</b><i>${closed.length ? 'closed months' : 'overall'}</i></div>
        <div class="mr-kpi"><span>Tasks delivered</span><b data-count="${tot.d}">0</b><i>of ${tot.n} planned</i></div>
        <div class="mr-kpi"><span>High priority</span><b data-count="${hiAll.length ? Math.round(hiDone / hiAll.length * 100) : 0}" data-suffix="%">0%</b><i>${hiDone}/${hiAll.length} delivered</i></div>
        <div class="mr-kpi"><span>In progress</span><b data-count="${tot.p}">0</b><i>${withTasks.length} active month${withTasks.length === 1 ? '' : 's'}</i></div></div>
      <div class="mr-grid2 mr-in"><div class="mr-card"><h4>Completion by month<span>%</span></h4>${withTasks.map(m => hb(short(m.name) + (m.ym >= curYm ? ' (MTD)' : ''), stats(allTasks(m)), null, m.ym < curYm)).join('')}${LEG(closed.length)}</div>
        <div class="mr-card"><h4>Key insights<span>${ins.length}</span></h4><div class="mr-ins">${ins.slice(0, 5).map(([k, t], i) => `<div class="mr-insi ${k}"><b class="n">${i + 1}</b><div>${t}</div></div>`).join('')}</div></div></div></div>`]);
    /* 3 monthly trend */
    if (months.length) {
      const maxN = Math.max(1, ...months.map(m => allTasks(m).length));
      out.push(['Trend', `<div class="mr-slide">${head('Monthly trend', 'Workload & completion by month', 'Bar height = number of tasks · colours = status · figure on top = completion rate. Dashed outline = month in progress.', tag)}
        <div class="mr-card mr-in" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div class="mr-cols3">${months.map(m => { const s = stats(allTasks(m)), fut = m.ym > curYm, run = m.ym === curYm, miss = m.ym < curYm;
          return `<div class="mr-colw"><span class="mr-colv">${s.n ? s.pct + '%' : ''}${run && s.n ? '<small>MTD</small>' : fut ? '<small>UPCOMING</small>' : ''}</span><div class="mr-col${run ? ' mtd' : ''}" style="--h:${(s.n / maxN * 84).toFixed(2)}%">${['d', 'p', 'l', 'ns'].map(k => s[k] ? `<i style="height:${(s[k] / (s.n || 1) * 100).toFixed(2)}%;background:${k === 'ns' ? (miss ? COL.x : COL.n) : COL[k]}"></i>` : '').join('')}</div></div>`; }).join('')}</div>
          <div class="mr-colx">${months.map(m => `<span>${esc(mon3(m.name))}${allTasks(m).length ? ` · ${allTasks(m).length}` : ''}</span>`).join('')}</div>${LEG(closed.length)}</div></div>`]);
    }
    /* 4 focus areas */
    if (flat.length) {
      const bySec = ORDER.map(k => ({ k, tasks: withTasks.flatMap(m => (m.sections.find(s => s.key === k) || { tasks: [] }).tasks) })).filter(x => x.tasks.length);
      const other = withTasks.flatMap(m => m.sections.filter(s => !ORDER.includes(s.key)).map(s => ({ k: s.name, tasks: s.tasks })));
      const secRows = (bySec.length ? bySec.map(x => ({ name: SEC[x.k] || x.k, tasks: x.tasks })) : Object.values(other.reduce((a, x) => { (a[x.k] = a[x.k] || { name: x.k, tasks: [] }).tasks.push(...x.tasks); return a; }, {})));
      const cats = Object.entries(flat.reduce((a, t) => { const c = t.cat || 'General'; a[c] = (a[c] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
      const pal = ['#0B1B33', '#D99A00', '#2563EB', '#7C3AED', '#DB2777', '#16A34A'];
      const pri = ['High', 'Medium', 'Low'].map(p => ({ p, t: flat.filter(t => t.priority === p) })).filter(x => x.t.length);
      out.push(['Focus', `<div class="mr-slide">${head('Focus areas', 'Where the work went', 'Completion by task type and priority, and the split between general and VIP work.', tag)}
        <div class="mr-grid2 mr-in"><div class="mr-card"><h4>By task type<span>completion</span></h4>${secRows.map(x => hb(x.name, stats(x.tasks))).join('')}
          ${pri.length ? `<h4 style="margin-top:1.6cqw">By priority<span>completion</span></h4>${pri.map(x => hb(x.p + ' priority', stats(x.t))).join('')}` : ''}${LEG()}</div>
          <div class="mr-card"><h4>Category mix<span>${flat.length} tasks</span></h4><div class="mr-donut">${donut(cats.map(([c, v], i) => ({ v, c: pal[i % pal.length] })), 150, flat.length)}
            <div class="mr-legv" style="flex:1">${cats.map(([c, v], i) => `<span><i style="background:${pal[i % pal.length]}"></i>${esc(c)}<b>${v} · ${pctTxt(v, flat.length)}</b></span>`).join('')}</div></div>
            <h4 style="margin-top:1.8cqw">Category completion<span>%</span></h4>${cats.slice(0, 4).map(([c]) => hb(c, stats(flat.filter(t => (t.cat || 'General') === c)))).join('')}</div></div></div>`]);
    }
    /* 5 month slides — summary that always fits one slide */
    withTasks.forEach(m => {
      const T = allTasks(m), s = stats(T), no = months.indexOf(m) + 1, run = m.ym >= curYm, miss = m.ym < curYm;
      const secs = ORDER.map(k => m.sections.find(x => x.key === k)).filter(Boolean).concat(m.sections.filter(x => !ORDER.includes(x.key))).filter(x => x.tasks.length);
      const rank = t => (t.priority === 'High' ? 0 : t.priority === 'Medium' ? 1 : 2) + (String(t.cat).toUpperCase() === 'VIP' ? -.5 : 0);
      const wins = T.filter(t => t.status === 'DONE').sort((a, b) => rank(a) - rank(b)), open = T.filter(t => t.status !== 'DONE').sort((a, b) => ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(a.status) - ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(b.status) || rank(a) - rank(b));
      out.push([mon3(m.name), `<div class="mr-slide">${head(`Month ${String(no).padStart(2, '0')}${run ? ' · in progress' : ''}`, esc(m.name), run ? 'Month to date — open items are still within the month.' : '', tag)}
        <div class="mr-mgrid mr-in"><div class="mr-card"><div class="mr-donut">${donut([{ v: s.d, c: COL.d }, { v: s.p, c: COL.p }, { v: s.l, c: COL.l }, { v: s.ns, c: miss ? COL.x : COL.n }], 130, s.pct + '%')}
            <div style="flex:1">${secs.map(sec => hb(SEC[sec.key] || sec.name || sec.key, stats(sec.tasks), `${sec.tasks.filter(t => t.status === 'DONE').length}/${sec.tasks.length}`, miss)).join('')}</div></div>
          <div class="mr-ms"><div><b>${s.n}</b><span>Tasks</span></div><div><b style="color:${COL.d}">${s.d}</b><span>Done</span></div><div><b style="color:${COL.p}">${s.p}</b><span>In progress</span></div><div><b style="color:${miss && s.ns + s.l ? COL.x : 'var(--mut)'}">${s.ns + s.l}</b><span>${miss ? 'Not done' : 'Open'}</span></div></div>
          ${(() => { const P = ['High', 'Medium', 'Low'].map(p => ({ p, t: T.filter(t => t.priority === p) })).filter(x => x.t.length), V = T.filter(t => String(t.cat).toUpperCase() === 'VIP');
            return P.length || V.length ? `<h4 style="margin-top:1.4cqw">By priority<span>done</span></h4>${P.map(x => hb(x.p, stats(x.t), `${x.t.filter(t => t.status === 'DONE').length}/${x.t.length}`, miss)).join('')}${V.length ? hb('VIP accounts', stats(V), `${V.filter(t => t.status === 'DONE').length}/${V.length}`, miss) : ''}` : ''; })()}</div>
          <div class="mr-lists" style="margin-top:0"><div class="mr-card"><h4>Delivered<span>${wins.length}</span></h4>${list(wins, 7, t => tk(t), 'Nothing completed yet.')}</div>
            <div class="mr-card"><h4>${miss ? 'Not completed' : 'Open'}<span>${open.length}</span></h4>${list(open, 7, t => tk(t, null, miss), 'All tasks done 🎉')}</div></div></div></div>`]);
    });
    /* 6 highlights */
    if (withTasks.length) {
      const seen = new Set(), hiD = withTasks.flatMap(m => allTasks(m).filter(t => t.status === 'DONE' && t.priority === 'High').map(t => ({ ...t, m: mon3(m.name) }))).filter(t => !seen.has(t.title) && seen.add(t.title));
      const last = withTasks[withTasks.length - 1], open = allTasks(last).filter(t => t.status !== 'DONE').sort((a, b) => ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(a.status) - ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(b.status));
      out.push(['Highlights', `<div class="mr-slide">${head('Highlights', 'Wins & carry-over', `High-priority work delivered, and what is still open in ${esc(short(last.name))}.`, tag)}
        <div class="mr-grid2 mr-in" style="grid-template-columns:1fr 1fr"><div class="mr-card"><h4>High priority — delivered<span>${hiD.length}</span></h4>${list(hiD, 10, t => tk(t, t.m.toUpperCase()), '—')}</div>
        <div class="mr-card"><h4>Carry-over · ${esc(short(last.name))}<span>${open.length}</span></h4>${list(open, 10, t => tk(t), 'All tasks for this month are done.')}</div></div></div>`]);
    }
    /* 7 team */
    if (S.team && (S.team.HD || S.team.AM)) {
      const blk = (k, name) => { const t = S.team[k] || { n: 0, done: 0, prog: 0, people: {} }, P = Object.entries(t.people || {}).sort((a, b) => b[1].n - a[1].n);
        return `<div class="mr-card"><h4>${name}<span>${t.done}/${t.n} done</span></h4>${t.n ? `<div class="mr-donut" style="margin-bottom:1cqw">${donut([{ v: t.done, c: COL.d }, { v: t.prog || 0, c: COL.p }, { v: t.n - t.done - (t.prog || 0), c: COL.n }], 100, pctTxt(t.done, t.n))}<div class="mr-legv" style="flex:1"><span><i style="background:${COL.d}"></i>Done<b>${t.done}</b></span><span><i style="background:${COL.p}"></i>In progress<b>${t.prog || 0}</b></span><span><i style="background:${COL.n}"></i>Open<b>${t.n - t.done - (t.prog || 0)}</b></span></div></div>
          ${P.slice(0, 7).map(([nm, v]) => hb(nm.split(' ').slice(0, 2).join(' '), { n: v.n, d: v.done, p: 0, l: 0, ns: v.n - v.done, pct: Math.round(v.done / v.n * 100) }, `${v.done}/${v.n}`)).join('')}` : '<div class="mr-empty">No team tasks in this period.</div>'}</div>`; };
      out.push(['Team', `<div class="mr-slide">${head('Team delegation', 'Tasks assigned to the teams', `Helpdesk Customer Support & Account Manager VIP · ${esc(S.period || '')}`, tag)}
        <div class="mr-grid2 mr-in" style="grid-template-columns:1fr 1fr">${blk('HD', 'Helpdesk Customer Support')}${blk('AM', 'Account Manager VIP')}</div></div>`]);
    }
    /* 8 closing */
    out.push(['Takeaways', `<div class="mr-slide">${head('Takeaways', 'Key results & next steps', `${tot.n} tasks · ${tot.d} delivered · ${closed.length ? cs.pct + '% completion in closed months' : tot.pct + '% overall completion'}`, tag)}
      <div class="mr-grid2 mr-in"><div class="mr-card"><h4>Key insights<span>recap</span></h4><div class="mr-ins">${ins.map(([k, t], i) => `<div class="mr-insi ${k}"><b class="n">${i + 1}</b><div>${t}</div></div>`).join('')}</div></div>
      <div class="mr-card"><h4>Month by month<span>completion</span></h4>${withTasks.map(m => hb(short(m.name) + (m.ym >= curYm ? ' (MTD)' : ''), stats(allTasks(m)), null, m.ym < curYm)).join('') || '<div class="mr-empty">No data yet.</div>'}${LEG(closed.length)}
        ${(() => { const last = withTasks[withTasks.length - 1]; if (!last) return ''; const F = allTasks(last).filter(t => t.status !== 'DONE').sort((a, b) => (a.priority === 'High' ? 0 : 1) - (b.priority === 'High' ? 0 : 1) || (String(b.cat).toUpperCase() === 'VIP') - (String(a.cat).toUpperCase() === 'VIP'));
          return F.length ? `<h4 style="margin-top:1.6cqw">Next focus · carry-over from ${esc(short(last.name))}<span>${F.length}</span></h4>${list(F, 4, t => tk(t), '')}` : ''; })()}
        ${S.generatedAt ? `<p class="mr-sub" style="margin-top:1.4cqw">Data as of ${esc(new Date(S.generatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }))}</p>` : ''}</div></div></div>`]);
    return out;
  }

  function countUp(slide) {
    slide.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), D = 900;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to + suf; return; }
      const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- cover styles (Putri picks one; stored in the snapshot so the viewer link shows the same cover) ---------- */
  const COVERS = [['clean', 'Clean white'], ['navy', 'Navy'], ['split', 'Split yellow'], ['gold', 'Gold'], ['mono', 'Black']];
  const DARK = { navy: 1, mono: 1 };
  function coverHtml(S, cv) {
    cv = (COVERS.find(c => c[0] === (cv || S.cover)) || COVERS[0])[0]; const dark = !!DARK[cv];
    const yr = (String(S.period || '').match(/20\d\d/) || String(S.title2 || S.title || '').match(/20\d\d/) || [new Date(S.generatedAt || Date.now()).getFullYear()])[0];
    const big = (String(S.title2 || S.title || '').match(/\b(H[12]|Q[1-4])\b/i) || [''])[0].toUpperCase();
    const asOf = S.generatedAt ? `<div><small>DATA AS OF</small><b>${esc(new Date(S.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}</b></div>` : '';
    const art = cv === 'split' ? `<div class="cv-art"><span class="a1">${esc(big || yr)}</span>${big ? `<span class="a2">${esc(yr)}</span>` : ''}<span class="a3">${esc(S.division || 'Customer Service')}</span></div>`
      : cv === 'clean' ? `<div class="cv-art"><span>${esc(yr)}</span></div>` : cv === 'mono' ? `<div class="cv-art"><span>${esc(big || yr)}</span></div>` : cv === 'gold' ? '<div class="cv-art"><i></i><i></i><i></i></div>' : '';
    return `<div class="mr-slide mr-cover cv-${cv}"${dark ? ' data-inv' : ''}>${art}<div class="cv-main"><img class="logo mr-in" src="${dark ? 'wordmark-white.png' : 'wordmark.png'}" alt="GlobalXtreme" onerror="this.remove()"><div class="mr-kick mr-in" style="margin-top:3cqw">${esc(S.kicker || 'Management Report')}</div>
      <div class="t1 mr-in">${esc(S.title1 || 'Management')}</div><div class="t2 mr-in">${esc(S.title2 || S.title || '')}</div><div class="per mr-in">${esc(S.period || '')}${S.division ? ' · ' + esc(S.division) : ''}</div><div class="rule mr-in"></div></div>
      <div class="mr-by mr-in"><div><small>PREPARED BY</small><b>${esc(S.by || '')}</b><span>${esc(S.role || '')}</span></div>${asOf}</div></div>`;
  }
  function coverPicker(el, S, cur, onPick) {
    injectCss(); cur = (COVERS.find(c => c[0] === cur) || COVERS[0])[0];
    el.innerHTML = `<div class="mr mr-cvp"><span class="mr-cvl">Cover style</span>${COVERS.map(([k, n]) => `<button type="button" class="mr-cvb" data-cv="${k}" aria-pressed="${k === cur}" title="${esc(n)}"><div class="mini-w"><div class="mr-stage mini">${coverHtml(S, k).replace('mr-slide mr-cover', 'mr-slide mr-cover on')}</div></div><span>${esc(n)}${k === cur ? ' ✓' : ''}</span></button>`).join('')}</div>`;
    el.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => onPick && onPick(b.dataset.cv));
  }
  function render(el, S, opt = {}) {
    injectCss();
    const sl = slides(S); let i = Math.min(opt.start || 0, sl.length - 1);
    el.innerHTML = `<div class="mr"><div class="mr-stage" tabindex="0"><div class="mr-prog"></div>${sl.map(s => s[1]).join('')}<div class="mr-foot"><span>GlobalXtreme · Customer Service</span><span class="mr-pgn"></span></div></div>
      <div class="mr-ctl"><button data-mr="prev" aria-label="Previous">←</button><div class="mr-dots">${sl.map((s, k) => `<button data-mr-go="${k}">${esc(s[0])}</button>`).join('')}</div><button data-mr="next" aria-label="Next">→</button><span class="pg"></span><span class="sp"></span>${opt.extra || ''}<button data-mr="fs">⛶ Present</button></div></div>`;
    const stage = el.querySelector('.mr-stage'), S2 = [...el.querySelectorAll('.mr-slide')];
    const go = k => {
      i = Math.max(0, Math.min(sl.length - 1, k));
      S2.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.remove('play'); }); el.querySelector('.mr-foot').classList.toggle('inv', S2[i].hasAttribute('data-inv'));
      const cur = S2[i]; void cur.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => { cur.classList.add('play'); countUp(cur); }));
      el.querySelectorAll('[data-mr-go]').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
      el.querySelector('.pg').textContent = `${i + 1} / ${sl.length}`; el.querySelector('.mr-pgn').textContent = `${i + 1} / ${sl.length}`;
      el.querySelector('.mr-prog').style.width = ((i + 1) / sl.length * 100) + '%';
      if (opt.onPage) opt.onPage(i);
    };
    el.querySelector('.mr-stage').addEventListener('click', e => { const m = e.target.closest('[data-mr-more]'); if (m) { e.stopPropagation(); m.closest('.mr-card').classList.add('all'); } });
    el.querySelector('.mr-ctl').addEventListener('click', e => {
      const b = e.target.closest('[data-mr],[data-mr-go]'); if (!b) return;
      if (b.dataset.mrGo != null) return go(+b.dataset.mrGo);
      if (b.dataset.mr === 'prev') go(i - 1); else if (b.dataset.mr === 'next') go(i + 1);
      else if (b.dataset.mr === 'fs') { try { stage.requestFullscreen ? stage.requestFullscreen() : null; } catch (er) {} stage.focus(); }
    });
    const key = e => { if (!el.isConnected || el.offsetParent === null && !document.fullscreenElement) return; if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(i + 1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(i - 1); } else if (e.key === 'Home') go(0); else if (e.key === 'End') go(sl.length - 1); };
    if (el._mrKey) document.removeEventListener('keydown', el._mrKey);
    el._mrKey = key; document.addEventListener('keydown', key);
    let tx = null; stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); tx = null; });
    go(i);
  }

  /* ---------- builders ---------- */
  function fromTasks(tasks, o) {
    const months = [];
    for (let ym = o.from; ym <= o.to;) {
      const mt = tasks.filter(t => t.month === ym && !t.team && t.category !== 'Pribadi');
      const sections = ORDER.map(k => ({ key: k, name: SEC[k], tasks: mt.filter(t => t.section === k).sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(t => ({ title: t.title, cat: t.category, status: t.status, priority: t.priority, links: (t.links || []).filter(l => safeUrl(l.url)).map(l => ({ label: l.label, url: l.url })) })) })).filter(s => s.tasks.length);
      months.push({ ym, name: ymName(ym), sections });
      let [y, m] = ym.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } ym = `${y}-${String(m).padStart(2, '0')}`;
    }
    const team = {};
    tasks.filter(t => t.team && t.month >= o.from && t.month <= o.to).forEach(t => {
      const T = team[t.team] = team[t.team] || { n: 0, done: 0, prog: 0, people: {} };
      T.n++; if (t.status === 'DONE') T.done++; if (t.status === 'IN PROGRESS') T.prog++;
      const who = t.assignee || 'Whole team', P = T.people[who] = T.people[who] || { n: 0, done: 0 }; P.n++; if (t.status === 'DONE') P.done++;
    });
    return { auto: true, team, months, generatedAt: new Date().toISOString(), ...o.meta };
  }
  function fromH1(D, meta) {
    const map = { 'Done': 'DONE', 'Solved': 'DONE', 'In Progress': 'IN PROGRESS', 'Plan': 'PLAN', 'Not Started': 'NOT STARTED' };
    const months = (D.months || []).map((m, k) => ({ ym: `2026-${String(k + 1).padStart(2, '0')}`, name: ymName(`2026-${String(k + 1).padStart(2, '0')}`), sections: (m.sections || []).map((s, j) => ({ key: 'S' + j, name: s.name, tasks: (s.tasks || []).map(t => ({ title: t.title, status: map[t.status] || 'PLAN', priority: '', links: safeUrl(t.link) ? [{ label: 'Link', url: t.link }] : [] })) })) }));
    return { months, generatedAt: new Date().toISOString(), ...meta };
  }
  window.MReport = { render, coverPicker, covers: COVERS.map(c => c[0]), fromTasks, fromH1, stats, ymName };
})();
