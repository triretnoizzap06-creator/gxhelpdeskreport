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
  const COL = { d: '#16A34A', p: '#F59E0B', l: '#A1A1AA', n: '#EF4444' };
  const LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
  const ymName = ym => { const [y, m] = ym.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
  const short = n => String(n || '').replace(/ \d{4}$/, '');
  const mon3 = n => short(n).slice(0, 3);

  const CSS = `
.mr{--bg:#FFFFFF;--card:#F7F7F8;--ink:#18181B;--mut:#71717A;--line:#E4E4E7;--y:#E0A800;--yb:#FFF6D1;--trk:#EEEEF1;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink)}
.mr *{box-sizing:border-box}
.mr-stage{position:relative;background:var(--bg);border:1px solid var(--line);border-radius:18px;overflow:hidden;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.07);outline:none}
.mr-slide{position:relative;padding:44px 54px 58px;display:none;flex-direction:column;min-height:min(74vh,56.25vw)}
.mr-slide.on{display:flex}
.mr-slide.on .mr-in{animation:mrUp .5s cubic-bezier(.2,.7,.2,1) both}
.mr-slide.on .mr-in:nth-child(2){animation-delay:.06s}.mr-slide.on .mr-in:nth-child(3){animation-delay:.12s}.mr-slide.on .mr-in:nth-child(4){animation-delay:.18s}.mr-slide.on .mr-in:nth-child(5){animation-delay:.24s}
@keyframes mrUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.mr-kick{font-size:11.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--y)}
.mr-h{font-size:clamp(22px,2.5vw,34px);font-weight:800;letter-spacing:-.015em;margin:6px 0 4px;line-height:1.15}
.mr-sub{color:var(--mut);font-size:clamp(12.5px,1.05vw,15px);margin:0 0 22px;line-height:1.5}
.mr-cover{justify-content:space-between;background:radial-gradient(circle at 88% 16%,rgba(245,197,24,.28),transparent 40%),radial-gradient(circle at 6% 96%,rgba(245,197,24,.12),transparent 36%),var(--bg)}
.mr-cover .t1{font-family:Montserrat,Inter,sans-serif;font-size:clamp(32px,5.2vw,70px);font-weight:900;line-height:1;letter-spacing:-.02em;margin-top:16px}
.mr-cover .t2{font-family:Montserrat,Inter,sans-serif;font-size:clamp(32px,5.2vw,70px);font-weight:900;line-height:1.06;color:var(--y)}
.mr-cover .per{margin-top:16px;font-size:clamp(13px,1.3vw,17px);color:var(--mut);font-weight:600;letter-spacing:.02em}
.mr-by{border-left:3px solid var(--y);padding-left:16px}.mr-by small{display:block;font-size:10.5px;letter-spacing:.16em;color:var(--mut);font-weight:800}.mr-by b{display:block;font-size:clamp(15px,1.5vw,20px);margin-top:4px}.mr-by span{color:var(--mut);font-size:13px}
.mr-grid2{display:grid;grid-template-columns:1.05fr .95fr;gap:22px;align-items:start}
.mr-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.mr-kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}.mr-kpi span{display:block;font-size:11px;color:var(--mut);font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.mr-kpi b{display:block;font-size:clamp(24px,2.6vw,36px);margin-top:4px;font-variant-numeric:tabular-nums}.mr-kpi i{font-style:normal;font-size:12px;color:var(--mut)}
.mr-ins{display:flex;flex-direction:column;gap:10px}
.mr-insi{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45}
.mr-insi b.n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--yb);color:#7A5B00;font-size:12.5px}
.mr-insi.good b.n{background:#DCFCE7;color:#166534}.mr-insi.warn b.n{background:#FEE2E2;color:#991B1B}
.mr-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.mr-card h4{margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;gap:8px;color:var(--ink)}.mr-card h4 span{color:var(--mut);font-weight:700}
/* column chart */
.mr-cols3{display:flex;align-items:flex-end;gap:clamp(10px,2vw,28px);height:clamp(180px,26vw,300px);padding:6px 4px 0;border-bottom:1px solid var(--line);position:relative}
.mr-colw{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.mr-colv{font-weight:800;font-size:13px;margin-bottom:6px;font-variant-numeric:tabular-nums}
.mr-col{width:min(64px,100%);display:flex;flex-direction:column-reverse;border-radius:8px 8px 3px 3px;overflow:hidden;height:0;transition:height 1s cubic-bezier(.2,.8,.2,1)}
.mr-col i{display:block;flex:none;width:100%}
.mr-colx{display:flex;gap:clamp(10px,2vw,28px);padding:8px 4px 0}.mr-colx span{flex:1;text-align:center;font-size:12px;color:var(--mut);font-weight:700}
.mr-slide.play .mr-col{height:var(--h)}
.mr-line{position:absolute;left:4px;top:6px;width:calc(100% - 8px);height:calc(100% - 6px);pointer-events:none;overflow:visible}
.mr-line path{fill:none;stroke:var(--ink);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:var(--len);stroke-dashoffset:var(--len);transition:stroke-dashoffset 1.4s .5s ease}
.mr-slide.play .mr-line path{stroke-dashoffset:0}.mr-line circle{fill:#fff;stroke:var(--ink);stroke-width:2.5;opacity:0;transition:opacity .3s 1.6s}.mr-slide.play .mr-line circle{opacity:1}
/* horizontal bars */
.mr-hb{display:grid;grid-template-columns:minmax(90px,150px) 1fr 52px;gap:12px;align-items:center;font-size:13px;margin:9px 0}
.mr-hb .t{height:12px;border-radius:999px;background:var(--trk);overflow:hidden;display:flex}.mr-hb .t i{display:block;height:100%;width:0;transition:width 1.1s cubic-bezier(.2,.8,.2,1)}
.mr-slide.play .mr-hb .t i{width:var(--w)}.mr-hb .v{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}.mr-hb .lb{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* donut / ring */
.mr-donut{display:flex;align-items:center;gap:18px}.mr-donut svg{flex:none;transform:rotate(-90deg)}
.mr-donut circle.s{fill:none;stroke-width:14;stroke-dasharray:0 999;transition:stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)}
.mr-slide.play .mr-donut circle.s{stroke-dasharray:var(--a) 999}
.mr-donut .ctr{position:relative}.mr-donut .ctr b{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:900}
.mr-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:12px}.mr-leg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.mr-legv{display:flex;flex-direction:column;gap:7px;font-size:13px}.mr-legv span{display:flex;align-items:center;gap:8px}.mr-legv i{width:10px;height:10px;border-radius:3px;display:inline-block}.mr-legv b{margin-left:auto;padding-left:12px;font-variant-numeric:tabular-nums}
/* month */
.mr-mh{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:18px}
.mr-ms{display:flex;gap:20px;margin-left:auto;flex-wrap:wrap}.mr-ms div{text-align:center}.mr-ms b{display:block;font-size:clamp(18px,1.8vw,24px);font-variant-numeric:tabular-nums}.mr-ms span{font-size:11px;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.mr-tasks{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;align-items:start}
.mr-tk{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.4}.mr-tk:first-of-type{border-top:0}
.mr-dot{flex:none;width:9px;height:9px;border-radius:50%;margin-top:5px}
.mr-dot.d{background:#16A34A}.mr-dot.p{background:#F59E0B}.mr-dot.l{background:#A1A1AA}.mr-dot.n{background:#EF4444}
.mr-tk .tt{flex:1}.mr-tk .cat{font-size:10px;font-weight:800;color:var(--mut);margin-left:5px;letter-spacing:.04em}
.mr-tk a{color:var(--y);display:inline-flex;vertical-align:-2px;margin-left:5px}.mr-tk a svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2}
.mr-empty{color:var(--mut);font-size:13.5px;padding:6px 0}
.mr-ctl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
.mr-ctl button,.mr-ctl a{font:600 13px Inter,sans-serif;border:1px solid var(--line,#E5E5EA);background:var(--card,#fff);color:var(--ink,#1D1D1F);border-radius:9px;padding:7px 12px;cursor:pointer;text-decoration:none}
.mr .mr-ctl button{background:#fff;border-color:#E4E4E7;color:#18181B}.mr .mr-ctl button[aria-pressed="true"]{background:#18181B;color:#fff;border-color:#18181B}
.mr-ctl .pg{font-size:12.5px;color:#71717A;margin:0 4px}.mr-ctl .sp{flex:1}.mr-dots{display:flex;gap:5px;flex-wrap:wrap}
.mr-prog{position:absolute;left:0;top:0;height:3px;background:var(--y);transition:width .35s ease}
.mr-stage:fullscreen{border-radius:0;width:100vw;height:100vh;overflow:auto}.mr-stage:fullscreen .mr-slide{min-height:100vh;justify-content:center}
.mr-foot{position:absolute;left:54px;right:54px;bottom:18px;display:flex;justify-content:space-between;font-size:11px;color:var(--mut);pointer-events:none}
@media (prefers-reduced-motion:reduce){.mr *{transition:none!important;animation:none!important}}
@media (max-width:760px){.mr-slide{padding:24px 18px 46px;min-height:0}.mr-grid2{grid-template-columns:1fr}.mr-kpis{grid-template-columns:1fr 1fr}.mr-hb{grid-template-columns:86px 1fr 44px;font-size:12px}.mr-ms{margin-left:0}.mr-foot{bottom:14px;left:18px;right:18px}.mr-cols3{height:200px}}
`;
  function injectCss() { if (document.getElementById('mr-css2')) return; const s = document.createElement('style'); s.id = 'mr-css2'; s.textContent = CSS; document.head.appendChild(s); }

  const stats = tasks => { const c = k => tasks.filter(t => t.status === k).length, n = tasks.length, d = c('DONE');
    return { n, d, p: c('IN PROGRESS'), l: c('PLAN'), ns: c('NOT STARTED'), pct: n ? Math.round(d / n * 100) : 0 }; };
  const allTasks = m => m.sections.flatMap(s => s.tasks);
  const pctTxt = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

  function tk(t, suffix) {
    const k = (ST[t.status] || ST['NOT STARTED'])[1], links = (t.links || []).map(l => safeUrl(l.url)).filter(Boolean).slice(0, 2);
    return `<div class="mr-tk"><i class="mr-dot ${k}" title="${esc((ST[t.status] || ST['NOT STARTED'])[0])}"></i><div class="tt">${esc(t.title)}${suffix ? ` <span class="cat">${esc(suffix)}</span>` : t.cat && t.cat !== 'General' ? `<span class="cat">${esc(String(t.cat).toUpperCase())}</span>` : ''}${links.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" title="Open link">${LINK}</a>`).join('')}</div></div>`;
  }
  const LEG = `<div class="mr-leg"><span><i style="background:${COL.d}"></i>Done</span><span><i style="background:${COL.p}"></i>In progress</span><span><i style="background:${COL.l}"></i>Planned</span><span><i style="background:${COL.n}"></i>Not started</span></div>`;
  function donut(parts, size, center) {
    const r = (size - 16) / 2, C = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0;
    const segs = parts.filter(p => p.v).map(p => { const a = p.v / tot * C, s = `<circle class="s" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${p.c}" style="--a:${a.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"></circle>`; off += a; return s; }).join('');
    return `<div class="ctr"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#EEEEF1" stroke-width="14"></circle>${segs}</svg><b>${center}</b></div>`;
  }
  const hb = (label, s, extra) => `<div class="mr-hb"><span class="lb" title="${esc(label)}">${esc(label)}</span><div class="t">${s.n ? ['d', 'p', 'l', 'ns'].map(k => `<i style="--w:${(s[k] / s.n * 100).toFixed(2)}%;background:${COL[k === 'ns' ? 'n' : k]}"></i>`).join('') : ''}</div><span class="v">${extra != null ? extra : s.n ? s.pct + '%' : '—'}</span></div>`;

  /* ---------- key insights (facts only, computed from the data) ---------- */
  function insights(S, withTasks, months) {
    const now = new Date(), curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const out = [], ms = withTasks.map(m => ({ m, s: stats(allTasks(m)) }));
    if (!ms.length) return [['', 'No tasks recorded for this period yet — the report fills in automatically as tasks are added to the to-do list.']];
    const tot = stats(ms.flatMap(x => allTasks(x.m)));
    out.push(['', `<b>${tot.d} of ${tot.n}</b> tasks completed across ${ms.length} month${ms.length > 1 ? 's' : ''} — an overall completion rate of <b>${tot.pct}%</b>.`]);
    const closed = ms.filter(x => x.m.ym < curYm), cmp = closed.length > 1 ? closed : ms;   // running month is excluded from comparisons
    if (cmp.length > 1) {
      const ms = cmp; const best = ms.reduce((a, b) => b.s.pct > a.s.pct ? b : a), worst = ms.reduce((a, b) => b.s.pct < a.s.pct ? b : a);
      out.push(['good', `<b>${esc(short(best.m.name))}</b> was the strongest month at <b>${best.s.pct}%</b> completion (${best.s.d}/${best.s.n} tasks).`]);
      if (worst !== best) out.push(['warn', `<b>${esc(short(worst.m.name))}</b> had the lowest completion at <b>${worst.s.pct}%</b> — ${worst.s.n - worst.s.d} task${worst.s.n - worst.s.d === 1 ? '' : 's'} left open.`]);
      const a = ms[ms.length - 2], b = ms[ms.length - 1], dlt = b.s.pct - a.s.pct;
      if (dlt) out.push([dlt > 0 ? 'good' : 'warn', `Completion ${dlt > 0 ? 'improved' : 'dropped'} by <b>${Math.abs(dlt)} pts</b> from ${esc(short(a.m.name))} to ${esc(short(b.m.name))}.`]);
      const running = withTasks.filter(m => m.ym >= curYm);
      if (closed.length > 1 && running.length) out.push(['', `${running.map(m => esc(short(m.name))).join(', ')} ${running.length > 1 ? 'are' : 'is'} still running — excluded from the month-to-month comparison.`]);
    }
    const flat = ms.flatMap(x => allTasks(x.m)), hi = flat.filter(t => t.priority === 'High');
    if (hi.length) out.push([hi.filter(t => t.status === 'DONE').length / hi.length >= .8 ? 'good' : '', `High-priority work: <b>${hi.filter(t => t.status === 'DONE').length}/${hi.length}</b> completed (${pctTxt(hi.filter(t => t.status === 'DONE').length, hi.length)}).`]);
    const vip = flat.filter(t => String(t.cat).toUpperCase() === 'VIP');
    if (vip.length) out.push(['', `VIP account tasks: <b>${vip.filter(t => t.status === 'DONE').length}/${vip.length}</b> completed (${pctTxt(vip.filter(t => t.status === 'DONE').length, vip.length)}).`]);
    const last = ms[ms.length - 1], open = last.s.n - last.s.d;
    if (open) out.push(['warn', `<b>${open}</b> task${open === 1 ? '' : 's'} still open in ${esc(short(last.m.name))} (${last.s.p} in progress) — carried into the next period.`]);
    const T = S.team || {}, tn = (T.HD ? T.HD.n : 0) + (T.AM ? T.AM.n : 0), td = (T.HD ? T.HD.done : 0) + (T.AM ? T.AM.done : 0);
    if (tn) out.push(['', `<b>${tn}</b> task${tn === 1 ? '' : 's'} delegated to the Helpdesk & AM teams — <b>${td}</b> done (${pctTxt(td, tn)}).`]);
    return out.slice(0, 6);
  }

  function slides(S) {
    const out = [], now = new Date(), curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = S.months || [], withTasks = months.filter(m => allTasks(m).length);
    const flat = withTasks.flatMap(allTasks), tot = stats(flat), ins = insights(S, withTasks, months);
    const avg = withTasks.length ? Math.round(withTasks.reduce((a, m) => a + stats(allTasks(m)).pct, 0) / withTasks.length) : 0;
    /* 1 cover */
    out.push(['Cover', `<div class="mr-slide mr-cover"><div><div class="mr-kick mr-in">${esc(S.kicker || 'Management Report')}</div>
      <div class="t1 mr-in">${esc(S.title1 || 'Management')}</div><div class="t2 mr-in">${esc(S.title2 || S.title || '')}</div><div class="per mr-in">${esc(S.period || '')}${S.division ? ' · ' + esc(S.division) : ''}</div></div>
      <div class="mr-by mr-in"><small>PREPARED BY</small><b>${esc(S.by || '')}</b><span>${esc(S.role || '')}</span></div></div>`]);
    /* 2 executive summary */
    out.push(['Summary', `<div class="mr-slide"><div class="mr-kick mr-in">Executive summary</div><div class="mr-h mr-in">${esc(S.period || '')}</div><p class="mr-sub mr-in">Key results and insights${S.auto ? ', generated from the personal to-do list' : ''}.</p>
      <div class="mr-grid2 mr-in"><div><div class="mr-kpis">
        <div class="mr-kpi"><span>Total tasks</span><b data-count="${tot.n}">0</b><i>${withTasks.length} active month${withTasks.length === 1 ? '' : 's'}</i></div>
        <div class="mr-kpi"><span>Completed</span><b style="color:${COL.d}" data-count="${tot.d}">0</b><i>${tot.p} in progress</i></div>
        <div class="mr-kpi"><span>Completion rate</span><b style="color:var(--y)" data-count="${tot.pct}" data-suffix="%">0%</b><i>overall</i></div>
        <div class="mr-kpi"><span>Monthly average</span><b data-count="${avg}" data-suffix="%">0%</b><i>per active month</i></div></div>
        <div class="mr-card" style="margin-top:12px"><h4>Status mix<span>${tot.n} tasks</span></h4><div class="mr-donut">${donut([{ v: tot.d, c: COL.d }, { v: tot.p, c: COL.p }, { v: tot.l, c: COL.l }, { v: tot.ns, c: COL.n }], 128, tot.pct + '%')}
          <div class="mr-legv" style="flex:1"><span><i style="background:${COL.d}"></i>Done<b>${tot.d}</b></span><span><i style="background:${COL.p}"></i>In progress<b>${tot.p}</b></span><span><i style="background:${COL.l}"></i>Planned<b>${tot.l}</b></span><span><i style="background:${COL.n}"></i>Not started<b>${tot.ns}</b></span></div></div></div></div>
        <div><div class="mr-card" style="background:#fff"><h4>Key insights<span>${ins.length}</span></h4><div class="mr-ins">${ins.map(([k, t], i) => `<div class="mr-insi ${k}"><b class="n">${i + 1}</b><div>${t}</div></div>`).join('')}</div></div></div></div></div>`]);
    /* 3 monthly trend */
    if (months.length) {
      const maxN = Math.max(1, ...months.map(m => allTasks(m).length));
      const pts = months.map((m, i) => { const s = stats(allTasks(m)); return { x: (i + .5) / months.length * 100, y: s.n ? 100 - s.pct : null }; });
      const valid = pts.filter(p => p.y != null);
      const path = valid.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      out.push(['Trend', `<div class="mr-slide"><div class="mr-kick mr-in">Monthly trend</div><div class="mr-h mr-in">Workload & completion by month</div><p class="mr-sub mr-in">Bar height = number of tasks, colours = status; the figure on top is the completion rate.</p>
        <div class="mr-card mr-in" style="background:#fff"><div class="mr-cols3">${months.map(m => { const s = stats(allTasks(m)), fut = m.ym > curYm;
          return `<div class="mr-colw"><span class="mr-colv">${s.n ? s.pct + '%' : fut ? '' : '—'}</span><div class="mr-col" style="--h:${(s.n / maxN * 86).toFixed(2)}%">${['d', 'p', 'l', 'ns'].map(k => s[k] ? `<i style="height:${(s[k] / (s.n || 1) * 100).toFixed(2)}%;background:${COL[k === 'ns' ? 'n' : k]}"></i>` : '').join('')}</div></div>`; }).join('')}
</div>
          <div class="mr-colx">${months.map(m => `<span>${esc(mon3(m.name))}${allTasks(m).length ? ` · ${allTasks(m).length}` : ''}</span>`).join('')}</div>${LEG}</div></div>`]);
    }
    /* 4 focus areas */
    if (flat.length) {
      const bySec = ORDER.map(k => ({ k, tasks: withTasks.flatMap(m => (m.sections.find(s => s.key === k) || { tasks: [] }).tasks) })).filter(x => x.tasks.length);
      const other = withTasks.flatMap(m => m.sections.filter(s => !ORDER.includes(s.key)).map(s => ({ k: s.name, tasks: s.tasks })));
      const secRows = (bySec.length ? bySec.map(x => ({ name: SEC[x.k] || x.k, tasks: x.tasks })) : Object.values(other.reduce((a, x) => { (a[x.k] = a[x.k] || { name: x.k, tasks: [] }).tasks.push(...x.tasks); return a; }, {})));
      const cats = Object.entries(flat.reduce((a, t) => { const c = t.cat || 'General'; a[c] = (a[c] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
      const pal = ['#18181B', '#E0A800', '#0E7490', '#7C3AED', '#DB2777', '#16A34A'];
      const pri = ['High', 'Medium', 'Low'].map(p => ({ p, t: flat.filter(t => t.priority === p) })).filter(x => x.t.length);
      out.push(['Focus', `<div class="mr-slide"><div class="mr-kick mr-in">Focus areas</div><div class="mr-h mr-in">Where the work went</div><p class="mr-sub mr-in">Completion by task type and priority, plus the category mix.</p>
        <div class="mr-grid2 mr-in"><div class="mr-card" style="background:#fff"><h4>By task type<span>completion</span></h4>${secRows.map(x => hb(x.name, stats(x.tasks))).join('')}
          ${pri.length ? `<h4 style="margin-top:18px">By priority<span>completion</span></h4>${pri.map(x => hb(x.p + ' priority', stats(x.t))).join('')}` : ''}${LEG}</div>
          <div class="mr-card" style="background:#fff"><h4>Category mix<span>${flat.length} tasks</span></h4><div class="mr-donut">${donut(cats.map(([c, v], i) => ({ v, c: pal[i % pal.length] })), 150, flat.length)}
            <div class="mr-legv" style="flex:1">${cats.map(([c, v], i) => `<span><i style="background:${pal[i % pal.length]}"></i>${esc(c)}<b>${v} · ${pctTxt(v, flat.length)}</b></span>`).join('')}</div></div></div></div></div>`]);
    }
    /* 5 month slides */
    withTasks.forEach(m => {
      const s = stats(allTasks(m)), no = months.indexOf(m) + 1;
      const secs = ORDER.map(k => m.sections.find(x => x.key === k)).filter(Boolean).concat(m.sections.filter(x => !ORDER.includes(x.key))).filter(x => x.tasks.length);
      out.push([mon3(m.name), `<div class="mr-slide"><div class="mr-mh mr-in"><div class="mr-donut">${donut([{ v: s.d, c: COL.d }, { v: s.p, c: COL.p }, { v: s.l, c: COL.l }, { v: s.ns, c: COL.n }], 96, s.pct + '%')}</div>
          <div><div class="mr-kick">Month ${String(no).padStart(2, '0')}</div><div class="mr-h" style="margin:2px 0 0">${esc(m.name)}</div></div>
          <div class="mr-ms"><div><b>${s.n}</b><span>Tasks</span></div><div><b style="color:${COL.d}">${s.d}</b><span>Done</span></div><div><b style="color:${COL.p}">${s.p}</b><span>In progress</span></div><div><b style="color:${COL.l}">${s.l}</b><span>Planned</span></div><div><b style="color:${COL.n}">${s.ns}</b><span>Not started</span></div></div></div>
        <div class="mr-tasks mr-in">${secs.map(sec => `<div class="mr-card" style="background:#fff"><h4>${esc(SEC[sec.key] || sec.name || sec.key)}<span>${sec.tasks.filter(t => t.status === 'DONE').length}/${sec.tasks.length}</span></h4>${sec.tasks.map(t => tk(t)).join('')}</div>`).join('')}</div></div>`]);
    });
    /* 6 highlights */
    if (withTasks.length) {
      const seen = new Set(), hiDone = withTasks.flatMap(m => allTasks(m).filter(t => t.status === 'DONE' && t.priority === 'High').map(t => ({ ...t, m: mon3(m.name) }))).filter(t => !seen.has(t.title) && seen.add(t.title));
      const last = withTasks[withTasks.length - 1], open = allTasks(last).filter(t => t.status !== 'DONE').sort((a, b) => ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(a.status) - ['IN PROGRESS', 'PLAN', 'NOT STARTED'].indexOf(b.status));
      out.push(['Highlights', `<div class="mr-slide"><div class="mr-kick mr-in">Highlights</div><div class="mr-h mr-in">Wins & carry-over</div><p class="mr-sub mr-in">High-priority work delivered, and what is still open in ${esc(short(last.name))}.</p>
        <div class="mr-grid2 mr-in"><div class="mr-card" style="background:#fff"><h4>High-priority — delivered<span>${hiDone.length}</span></h4>${hiDone.slice(0, 12).map(t => tk(t, t.m.toUpperCase())).join('') || '<div class="mr-empty">—</div>'}</div>
        <div class="mr-card" style="background:#fff"><h4>Carry-over<span>${open.length}</span></h4>${open.slice(0, 12).map(t => tk(t)).join('') || '<div class="mr-empty">All tasks for this month are done.</div>'}</div></div></div>`]);
    }
    /* 7 team */
    if (S.team && (S.team.HD || S.team.AM)) {
      const blk = (k, name) => { const t = S.team[k] || { n: 0, done: 0, prog: 0, people: {} }, P = Object.entries(t.people || {}).sort((a, b) => b[1].n - a[1].n);
        return `<div class="mr-card" style="background:#fff"><h4>${name}<span>${t.done}/${t.n} done</span></h4>${t.n ? `<div class="mr-donut" style="margin-bottom:10px">${donut([{ v: t.done, c: COL.d }, { v: t.prog || 0, c: COL.p }, { v: t.n - t.done - (t.prog || 0), c: COL.n }], 96, pctTxt(t.done, t.n))}<div class="mr-legv" style="flex:1"><span><i style="background:${COL.d}"></i>Done<b>${t.done}</b></span><span><i style="background:${COL.p}"></i>In progress<b>${t.prog || 0}</b></span><span><i style="background:${COL.n}"></i>Open<b>${t.n - t.done - (t.prog || 0)}</b></span></div></div>
          ${P.map(([nm, v]) => hb(nm.split(' ').slice(0, 2).join(' '), { n: v.n, d: v.done, p: 0, l: 0, ns: v.n - v.done, pct: Math.round(v.done / v.n * 100) }, `${v.done}/${v.n}`)).join('')}` : '<div class="mr-empty">No team tasks in this period.</div>'}</div>`; };
      out.push(['Team', `<div class="mr-slide"><div class="mr-kick mr-in">Team delegation</div><div class="mr-h mr-in">Tasks assigned to the teams</div><p class="mr-sub mr-in">Helpdesk Customer Support & Account Manager VIP · ${esc(S.period || '')}</p>
        <div class="mr-grid2 mr-in">${blk('HD', 'Helpdesk Customer Support')}${blk('AM', 'Account Manager VIP')}</div></div>`]);
    }
    /* 8 closing */
    out.push(['Takeaways', `<div class="mr-slide"><div class="mr-kick mr-in">Takeaways</div><div class="mr-h mr-in">${esc(S.title || '')}</div><p class="mr-sub mr-in">${tot.n} tasks · ${tot.d} done · ${tot.pct}% overall completion.</p>
      <div class="mr-grid2 mr-in"><div class="mr-card" style="background:#fff"><h4>Month by month<span>completion</span></h4>${withTasks.map(m => hb(short(m.name), stats(allTasks(m)))).join('') || '<div class="mr-empty">No data yet.</div>'}${LEG}</div>
      <div class="mr-card" style="background:#fff"><h4>Key insights<span>recap</span></h4><div class="mr-ins">${ins.slice(0, 4).map(([k, t], i) => `<div class="mr-insi ${k}"><b class="n">${i + 1}</b><div>${t}</div></div>`).join('')}</div></div></div>
      ${S.generatedAt ? `<p class="mr-sub" style="margin-top:16px">Data as of ${esc(new Date(S.generatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }))}</p>` : ''}</div>`]);
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

  function render(el, S, opt = {}) {
    injectCss();
    const sl = slides(S); let i = Math.min(opt.start || 0, sl.length - 1);
    el.innerHTML = `<div class="mr"><div class="mr-stage" tabindex="0"><div class="mr-prog"></div>${sl.map(s => s[1]).join('')}<div class="mr-foot"><span>GlobalXtreme · Customer Service</span><span class="mr-pgn"></span></div></div>
      <div class="mr-ctl"><button data-mr="prev" aria-label="Previous">←</button><div class="mr-dots">${sl.map((s, k) => `<button data-mr-go="${k}">${esc(s[0])}</button>`).join('')}</div><button data-mr="next" aria-label="Next">→</button><span class="pg"></span><span class="sp"></span>${opt.extra || ''}<button data-mr="fs">⛶ Present</button></div></div>`;
    const stage = el.querySelector('.mr-stage'), S2 = [...el.querySelectorAll('.mr-slide')];
    const go = k => {
      i = Math.max(0, Math.min(sl.length - 1, k));
      S2.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.remove('play'); });
      const cur = S2[i]; void cur.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => { cur.classList.add('play'); countUp(cur); }));
      el.querySelectorAll('[data-mr-go]').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
      el.querySelector('.pg').textContent = `${i + 1} / ${sl.length}`; el.querySelector('.mr-pgn').textContent = `${i + 1} / ${sl.length}`;
      el.querySelector('.mr-prog').style.width = ((i + 1) / sl.length * 100) + '%';
      if (opt.onPage) opt.onPage(i);
    };
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
  window.MReport = { render, fromTasks, fromH1, stats, ymName };
})();
