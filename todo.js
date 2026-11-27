// /api/todo — To-do list SPV Helpdesk + dokumen (Report H1) di Supabase.
// SPV (login dashboard):
//   GET    /api/todo?month=2026-11          → { tasks, months }
//   GET    /api/todo?from=2026-07&to=2026-12 → { tasks } (Management Report H2)
//   POST   /api/todo        { task }        → simpan / tambah task          → { task }
//   POST   /api/todo        { copy:{from,to} } → salin task rutin ke bulan baru
//   POST   /api/todo        { import:[tasks] } → import awal (Monthly Tracker)
//   DELETE /api/todo?id=…
//   GET    /api/todo?doc=spv-h1-2026        → { data, revision }   ·   POST { doc, data, revision }
//   GET    /api/todo?doc=knowledge-base     → dibaca tim tanpa login (Knowledge Base, team-tools); POST tetap wajib login
//   GET/POST /api/todo?vip=1&s=vip|intracity|billing25|dia → Dashboard VIP (tim / SPV) · GET &sync=<sheetId> → .xlsx terbaru dari Google Sheets
//   GET    /api/todo?secrets=HD             → password tools tim (SPV / cookie tim GX_TEAM_PASSWORD)
//   GET    /api/todo?board=HD|AM           → { board:{ roster, tasks, notes }, revision } — dashboard tim (publik)
//   POST   /api/todo?board=HD|AM  { op, … } → task/notes tim (publik) · roster.add/roster.del (password tim / SPV)
//          assignee / to = 'SPV' → task review / catatan untuk SPV · reply & note.seen hanya SPV
//   GET/POST /api/todo?desk=HD|AM  → desk per orang: foto, tagline, template message (POST: password tim / SPV)
//   GET    /api/todo?kb=notion          → daftar halaman Knowledge Base hasil sinkron Notion (publik)
//   GET    /api/todo?kb=page&id=…       → isi 1 halaman · GET ?kb=search&q=… → cari di judul + isi semua halaman
//   POST   /api/todo?kb=sync[&full=1]   → crawl ulang halaman Notion publik (tanpa token; tim / SPV) · &auto=1 publik, hanya jika cache > 3 jam
// Tim (tanpa login, hanya task yang di-assign ke timnya):
//   GET    /api/todo?team=HD|AM             → { tasks }
//   PATCH  /api/todo?id=…&team=HD  { status, team_note, team_by }
import { randomUUID } from 'node:crypto';
import { AppError, configured, db, dbError } from './_store.js';
import { authed, teamAuthed } from './_auth.js';
import { memberOf, DEF as MDEF, DEF_NICK } from './_members.js';
import { syncStep, searchPages, notionConfigured, ROOT, SOURCE, clean as nclean } from './_notion.js';

const STATUS = ['NOT STARTED', 'PLAN', 'IN PROGRESS', 'DONE'];
const PRIO = ['High', 'Medium', 'Low'];
const SECTIONS = ['DAILY', 'WEEKLY', 'MONTHLY', 'FERRE', 'ONEOFF'];
const RECURRING = ['DAILY', 'WEEKLY', 'MONTHLY', 'FERRE'];
const TEAMS = ['HD', 'AM'];
const PUBLIC_DOCS = ['knowledge-base', 'team-tools'];
/* Snapshot Management Report (mr-h2-2026, mr-h1-2026, …) dibaca lewat link viewer tanpa login */
const isPublicDoc = k => PUBLIC_DOCS.includes(k) || (typeof k === 'string' && /^mr-[a-z0-9-]{3,30}$/.test(k));
/* due date ikut bergeser 1 bulan saat task rutin disalin (tgl 31 → akhir bulan) */
const shiftDue = (d, to) => {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m] = to.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${to}-${String(Math.min(+d.slice(8, 10), last)).padStart(2, '0')}`;
};
const okMonth = m => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const okDoc = k => typeof k === 'string' && /^[a-z0-9-]{3,40}$/.test(k);
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const TEAM_COLS = 'id,month,section,category,title,links,priority,status,remarks,assignee,team,due,team_note,team_by,updated_at';

const json = (res, obj, status = 200) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
};
async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let buf;
  if (req.body != null) buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));
  else { const c = []; for await (const x of req) c.push(Buffer.isBuffer(x) ? x : Buffer.from(x)); buf = Buffer.concat(c); }
  if (buf.length > 2 * 1024 * 1024) throw new AppError('too-large', 413, 'Data terlalu besar.');
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new AppError('bad-payload', 400, 'JSON tidak valid.'); }
}
function cleanLinks(a) {
  return (Array.isArray(a) ? a : []).slice(0, 12).map(l => ({ label: str(l && l.label, 120), url: str(l && l.url, 1000).trim() }))
    .filter(l => /^https?:\/\/[^\s]+$/i.test(l.url));
}
function clean(t) {
  const team = TEAMS.includes(t.team) ? t.team : null;
  const out = {
    month: okMonth(t.month) ? t.month : null,
    section: SECTIONS.includes(t.section) ? t.section : 'ONEOFF',
    sort: Number.isFinite(+t.sort) ? Math.round(+t.sort) : 0,
    category: str(t.category, 40),
    title: str(t.title, 500).trim(),
    links: cleanLinks(t.links),
    priority: PRIO.includes(t.priority) ? t.priority : 'Medium',
    status: STATUS.includes(t.status) ? t.status : 'NOT STARTED',
    remarks: str(t.remarks, 4000),
    assignee: str(t.assignee, 80),
    team,
    due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : null,
  };
  if (!out.month) throw new AppError('bad-month', 400, 'Bulan tidak valid.');
  if (!out.title) throw new AppError('bad-title', 400, 'Judul task wajib diisi.');
  return out;
}
const must = ({ data, error }) => { if (error) throw dbError(error); return data; };

/* ---------- roster: pindah tim / arsip + jadwal (gx_docs team-roster-schedule) ---------- */
const docOf = async k => { const row = must(await db().from('gx_docs').select('data,revision').eq('key', k).maybeSingle()); return { d: (row && row.data) || {}, rev: row ? row.revision : null }; };
const saveDoc = async (k, fn) => { for (let t = 0; t < 6; t++) { const { d, rev } = await docOf(k); const r0 = fn(d); if (r0 === false) return false; const r = must(await db().rpc('gx_doc_save', { p_key: k, p_data: d, p_revision: rev })); if (!r || !r.conflict) return true; } throw new AppError('busy', 503, 'Server sibuk, coba lagi.'); };
const rosterOf = (d, tm) => Array.isArray(d.roster) && d.roster.length ? d.roster : (MDEF[tm] || []).map(n => ({ name: n, nick: DEF_NICK[n] || n.split(' ')[0] }));
const TEAM_L = t => t === 'AM' ? 'Account Manager' : 'Helpdesk';
async function rosterMove(team, name, to, reason, by) {
  const now = new Date().toISOString(); let moved = null; const log = { name, from: team, to: to || 'ARCHIVE', reason: reason || '', at: now, by };
  const ok = await saveDoc('team-board-' + team.toLowerCase(), d => { const R = rosterOf(d, team), x = R.find(y => y.name === name); if (!x) return false; moved = x; d.roster = R.filter(y => y.name !== name);
    (d.transfers = Array.isArray(d.transfers) ? d.transfers : []).unshift(log);
    if (!to) { d.archived = (Array.isArray(d.archived) ? d.archived : []).filter(y => y.name !== name); d.archived.unshift({ name, nick: x.nick || name.split(' ')[0], at: now, reason: reason || '' }); }
    d.notes = Array.isArray(d.notes) ? d.notes : [];
    d.notes.unshift({ id: randomUUID(), by: 'SPV', to: '', text: to ? `🔁 ${x.nick || name} pindah ke ${TEAM_L(to)}. Task & catatan lama tetap tersimpan di sini.` : `🗄 ${x.nick || name} diarsipkan${reason ? ' — ' + reason : ''}. Task, catatan & riwayatnya tetap tersimpan.`, at: now, pinned: false }); });
  if (!ok) return null;
  if (!to) { await saveDoc('team-desk-' + team.toLowerCase(), d => { const x = d.desks && d.desks[name]; if (!x) return false; x.archived = true; x.archivedAt = now; }); return log; }
  await saveDoc('team-board-' + to.toLowerCase(), d => { const R = rosterOf(d, to); if (!R.some(y => y.name === name)) R.push({ name, nick: moved.nick || name.split(' ')[0] }); d.roster = R; (d.transfers = Array.isArray(d.transfers) ? d.transfers : []).unshift(log);
    d.notes = Array.isArray(d.notes) ? d.notes : []; d.notes.unshift({ id: randomUUID(), by: 'SPV', to: '', text: `👋 Welcome ${moved.nick || name}! Pindahan dari ${TEAM_L(team)}.`, at: now, pinned: false }); });
  let desk = null; await saveDoc('team-desk-' + team.toLowerCase(), d => { const x = d.desks && d.desks[name]; if (!x) return false; desk = JSON.parse(JSON.stringify(x)); x.movedTo = to; x.movedAt = now; });
  if (desk) { delete desk.movedTo; await saveDoc('team-desk-' + to.toLowerCase(), d => { d.desks = d.desks || {}; d.desks[name] = { ...desk, ...(d.desks[name] || {}), tpls: [...(desk.tpls || []), ...((d.desks[name] || {}).tpls || [])].filter((t, i, a) => a.findIndex(z => z.id === t.id) === i) }; }); }
  return log;
}
const SCHED = 'team-roster-schedule';
const readSchedule = async () => { const { d } = await docOf(SCHED); return { list: Array.isArray(d.list) ? d.list : [], done: Array.isArray(d.done) ? d.done : [] }; };
const saveSchedule = sc => saveDoc(SCHED, d => { d.list = sc.list; d.done = (sc.done || d.done || []).slice(0, 50); });
const todayWita = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
async function runSchedule() {
  const sc = await readSchedule(), due = sc.list.filter(x => x.at <= todayWita()); if (!due.length) return;
  for (const x of due) { try { await rosterMove(x.team, x.name, x.to === 'ARCHIVE' ? null : x.to, x.reason, 'SPV (jadwal ' + x.at + ')'); } catch (e) { continue; } sc.done.unshift({ ...x, ranAt: new Date().toISOString() }); }
  sc.list = sc.list.filter(x => !due.includes(x)); await saveSchedule(sc);
}

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    if (!configured()) return json(res, { error: 'storage-not-configured', detail: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di Vercel.' }, 501);
    const team = q.get('team');

    /* ---------- akses tim (tanpa login) ---------- */
    if (team) {
      if (!TEAMS.includes(team)) return json(res, { error: 'bad-team' }, 400);
      if (req.method === 'GET') {
        const since = new Date(Date.now() - 62 * 864e5).toISOString();
        const rows = must(await db().from('gx_tasks').select(TEAM_COLS).eq('team', team).or(`status.neq.DONE,updated_at.gte.${since}`).order('due', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false }).limit(300));
        return json(res, { tasks: rows || [] });
      }
      if (req.method === 'PATCH') {
        const id = q.get('id'); if (!id) return json(res, { error: 'bad-id' }, 400);
        const b = await readJson(req);
        const cur = must(await db().from('gx_tasks').select('id,team').eq('id', id).maybeSingle());
        if (!cur || cur.team !== team) return json(res, { error: 'not-found' }, 404);
        const upd = { team_note: str(b.team_note, 2000), team_by: str(b.team_by, 80) };
        if (STATUS.includes(b.status)) upd.status = b.status;
        const row = must(await db().from('gx_tasks').update(upd).eq('id', id).select(TEAM_COLS).single());
        return json(res, { task: row });
      }
      return json(res, { error: 'method' }, 405);
    }

    /* ---------- Board tim (anggota, task & notes buatan tim) — gx_docs team-board-hd / team-board-am ---------- */
    if (q.get('board') != null) {
      const team = String(q.get('board')).toUpperCase(); if (!TEAMS.includes(team)) return json(res, { error: 'bad-team' }, 400);
      const key = 'team-board-' + team.toLowerCase();
      const read = async () => { const row = must(await db().from('gx_docs').select('data,revision').eq('key', key).maybeSingle()); const d = (row && row.data) || {};
        return { data: { roster: Array.isArray(d.roster) ? d.roster : null, tasks: Array.isArray(d.tasks) ? d.tasks : [], notes: Array.isArray(d.notes) ? d.notes : [], presence: d.presence && typeof d.presence === 'object' && !Array.isArray(d.presence) ? d.presence : {}, transfers: Array.isArray(d.transfers) ? d.transfers.slice(0, 100) : [], archived: Array.isArray(d.archived) ? d.archived.slice(0, 100) : [] }, revision: row ? row.revision : null }; };
      if (req.method === 'GET') { await runSchedule(); const r = await read(), sc = await readSchedule(); return json(res, { board: r.data, revision: r.revision, canRoster: authed(req) || teamAuthed(req), schedule: sc.list.filter(x => x.team === team || x.to === team) }); }
      if (req.method !== 'POST') return json(res, { error: 'method' }, 405);
      const b = await readJson(req), op = str(b.op, 20), now = new Date().toISOString();
      const nm = v => str(v, 60).replace(/\s+/g, ' ').trim(), spv = authed(req), mem = memberOf(req);
      if (mem && nm(b.by) !== 'SPV') b.by = mem.name;   // sudah login per orang → tercatat atas nama orang itu (tidak bisa mengaku orang lain)
      const forWho = spv && b.for ? nm(b.for) : '';   // SPV boleh mengatur status siapa saja
      if (op === 'presence' && !forWho && !(mem && nm(b.by) === mem.name) && !(spv && nm(b.by) === 'SPV')) return json(res, { error: 'member-login-required', detail: 'Login pakai nickname-mu dulu untuk set status.' }, 401);
      /* pindah subdivisi (Helpdesk ⇄ AM) atau arsipkan (keluar tim, mis. pindah ke CC) — riwayat task/notes tetap di board lama */
      if (op === 'roster.transfer' || op === 'roster.archive') {
        if (!spv) return json(res, { error: 'spv-login-required', detail: 'Hanya SPV yang bisa memindahkan / mengarsipkan anggota.' }, 401);
        const to = op === 'roster.archive' ? null : String(b.to || '').toUpperCase(), name = nm(b.name);
        if (!name || (to !== null && (!TEAMS.includes(to) || to === team))) return json(res, { error: 'invalid', detail: 'Tujuan tidak valid.' }, 400);
        const log = await rosterMove(team, name, to, str(b.reason, 120), 'SPV');
        if (!log) return json(res, { error: 'not-found', detail: 'Anggota tidak ditemukan di tim ini.' }, 404);
        const cur = await read(); return json(res, { board: cur.data, revision: cur.revision, transferred: log });
      }
      /* jadwalkan pindah / arsip pada tanggal tertentu (berjalan otomatis saat dashboard dibuka pada/ setelah tanggal itu) */
      if (op === 'roster.schedule' || op === 'roster.unschedule') {
        if (!spv) return json(res, { error: 'spv-login-required', detail: 'Hanya SPV yang bisa menjadwalkan.' }, 401);
        const sc = await readSchedule();
        if (op === 'roster.unschedule') sc.list = sc.list.filter(x => x.id !== b.id);
        else { const at = String(b.at || ''), to = b.to === 'ARCHIVE' ? 'ARCHIVE' : String(b.to || '').toUpperCase(), name = nm(b.name);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(at) || !name || !(to === 'ARCHIVE' || (TEAMS.includes(to) && to !== team))) return json(res, { error: 'invalid', detail: 'Tanggal / tujuan tidak valid.' }, 400);
          sc.list = sc.list.filter(x => !(x.name === name && x.team === team)).concat([{ id: randomUUID(), team, name, to, at, reason: str(b.reason, 120), by: 'SPV', created: now }]); }
        await saveSchedule(sc); await runSchedule(); const cur = await read();
        return json(res, { board: cur.data, revision: cur.revision, schedule: (await readSchedule()).list.filter(x => x.team === team || x.to === team) });
      }
      if (nm(b.by) === 'SPV' && !spv) return json(res, { error: 'spv-login-required', detail: 'Hanya SPV yang bisa menulis sebagai SPV.' }, 401);
      if (op === 'note.seen' && !spv) return json(res, { error: 'spv-login-required' }, 401);
      if (/^roster\./.test(op) && !authed(req) && !teamAuthed(req)) return json(res, { error: 'team-login-required', detail: 'Masukkan password tim untuk mengubah anggota.' }, 401);
      for (let t = 0; t < 6; t++) {
        const cur = await read(), D = cur.data;
        /* roster bawaan baru disimpan saat anggota diubah — operasi lain (task, notes, status) tidak boleh mengosongkan roster */
        if (!D.roster && /^roster\./.test(op)) { const dr = Array.isArray(b.defaultRoster) ? b.defaultRoster.slice(0, 40).map(x => ({ name: nm(x && x.name), nick: nm(x && x.nick) })).filter(x => x.name) : [];
          D.roster = dr.length ? dr : (MDEF[team] || []).map(name => ({ name, nick: DEF_NICK[name] || name.split(' ')[0] })); }
        let err = null;
        if (op === 'roster.add') { const name = nm(b.name), nick = nm(b.nick) || name.split(' ')[0]; if (name.length < 2) err = 'Nama minimal 2 huruf.'; else if (D.roster.some(x => x.name.toLowerCase() === name.toLowerCase())) err = 'Nama sudah ada.'; else D.roster.push({ name, nick }); }
        else if (op === 'roster.del') { const name = nm(b.name); D.roster = D.roster.filter(x => x.name !== name); }
        else if (op === 'roster.edit') { const x = D.roster.find(y => y.name === nm(b.name)); if (x) x.nick = nm(b.nick) || x.nick; }
        else if (op === 'task.add') { const title = str(b.title, 300).trim(); if (!title) err = 'Judul task wajib diisi.';
          else D.tasks.unshift({ id: randomUUID(), title, by: nm(b.by), assignee: nm(b.assignee), due: /^\d{4}-\d{2}-\d{2}$/.test(b.due || '') ? b.due : '', note: str(b.note, 2000), status: 'NOT STARTED', at: now, updated_at: now, upd_by: nm(b.by) }); }
        else if (op === 'task.upd') { const x = D.tasks.find(y => y.id === b.id); if (!x) err = 'Task tidak ditemukan.'; else { if (['NOT STARTED', 'IN PROGRESS', 'DONE'].includes(b.status)) { x.status = b.status; x.doneAt = b.status === 'DONE' ? now : null; } if (b.note != null) x.note = str(b.note, 2000); if (b.assignee != null) x.assignee = nm(b.assignee); if (b.due != null) x.due = /^\d{4}-\d{2}-\d{2}$/.test(b.due) ? b.due : ''; if (b.title != null && str(b.title, 300).trim()) x.title = str(b.title, 300).trim();
            if (b.reply != null && spv) { x.spvReply = str(b.reply, 2000); x.spvAt = now; }   // balasan / hasil review SPV
            x.updated_at = now; x.upd_by = nm(b.by); } }
        else if (op === 'task.del') D.tasks = D.tasks.filter(y => y.id !== b.id);
        else if (op === 'note.add') { const text = str(b.text, 3000).trim(); if (!text) err = 'Catatan kosong.'; else D.notes.unshift({ id: randomUUID(), by: nm(b.by), to: nm(b.to), text, at: now, pinned: false }); }
        else if (op === 'note.seen') { const x = D.notes.find(y => y.id === b.id); if (x) { x.seen = true; if (b.reply != null) { x.spvReply = str(b.reply, 2000); x.spvAt = now; } } }
        else if (op === 'note.pin') { const x = D.notes.find(y => y.id === b.id); if (x) x.pinned = !x.pinned; }
        else if (op === 'note.del') D.notes = D.notes.filter(y => y.id !== b.id);
        else if (op === 'presence') { const who = forWho || nm(b.by), st = String(b.status || ''); if (!who) err = 'Nama wajib.'; else if (!/^(work|break|meet|izin|sick|cuti)$/.test(st)) err = 'Status tidak valid.';
          else { D.presence[who] = { s: st, at: now, by: forWho ? 'SPV' : who }; for (const k of Object.keys(D.presence)) if (Date.now() - Date.parse(D.presence[k].at) > 864e5) delete D.presence[k]; } }   // status Virtual Office
        else return json(res, { error: 'bad-op' }, 400);
        if (err) return json(res, { error: 'invalid', detail: err }, 400);
        /* batasi ukuran: task DONE > 90 hari & notes > 300 dibuang */
        const cut = Date.now() - 90 * 864e5; D.tasks = D.tasks.filter(x => x.status !== 'DONE' || !x.doneAt || Date.parse(x.doneAt) > cut).slice(0, 500); D.notes = D.notes.slice(0, 300);
        const r = must(await db().rpc('gx_doc_save', { p_key: key, p_data: D, p_revision: cur.revision }));
        if (!r || !r.conflict) return json(res, { board: D, revision: r.revision, canRoster: authed(req) || teamAuthed(req) });
      }
      return json(res, { error: 'busy', detail: 'Server sibuk, coba lagi.' }, 503);
    }
    /* ---------- Knowledge Base ← Notion ---------- */
    if (q.get('kb') != null) {
      const mode = q.get('kb'), KEY = 'kb-notion';
      const read = async () => { const row = must(await db().from('gx_docs').select('data,revision').eq('key', KEY).maybeSingle()); return { D: (row && row.data) || {}, rev: row ? row.revision : null }; };
      if (mode === 'search') { const { D } = await read(); return json(res, { hits: searchPages(D, String(q.get('q') || '').slice(0, 120)) }); }
      if (mode === 'page') { const { D } = await read(), pg = (D.pages || {})[nclean(q.get('id'))]; return pg ? json(res, { page: pg }) : json(res, { error: 'not-found' }, 404); }
      if (mode === 'notion') { const { D } = await read(), P = D.pages || {};
        return json(res, { configured: notionConfigured(), source: SOURCE(), root: D.root || ROOT(), syncedAt: D.syncedAt || null, remaining: (D.queue || []).length,
          pages: Object.fromEntries(Object.entries(P).map(([id, p]) => [id, { t: p.t, i: p.i, p: p.p, o: p.o || [], e: p.e, u: p.u, x: String(p.x || '').slice(0, 1500), n: (p.b || []).filter(b => b.t !== 'page' && !(b.t === 'p' && !(b.r || []).length)).length }])) }); }
      if (mode === 'sync') {
        if (!notionConfigured()) return json(res, { error: 'not-configured', detail: 'Link Notion (NOTION_PUBLIC_URL) tidak valid.' }, 400);
        const auto = q.get('auto') === '1', can = authed(req) || teamAuthed(req);
        let { D, rev } = await read();
        if (!can) { if (!auto) return json(res, { error: 'team-login-required' }, 401);
          const age = D.syncedAt ? Date.now() - Date.parse(D.syncedAt) : Infinity; if (age < 3 * 3600e3 && !(D.queue || []).length) return json(res, { done: true, skipped: true, syncedAt: D.syncedAt }); }
        try { const st = await syncStep(D, { full: q.get('full') === '1' && can });
          const r = must(await db().rpc('gx_doc_save', { p_key: KEY, p_data: D, p_revision: rev }));
          if (r && r.conflict) return json(res, { done: false, busy: true, remaining: (D.queue || []).length });
          return json(res, { ...st, syncedAt: D.syncedAt || null });
        } catch (e) { return json(res, { error: e.code || 'notion-error', detail: e.message }, e.status === 401 ? 400 : 502); }
      }
      return json(res, { error: 'bad-kb' }, 400);
    }

    /* ---------- Desk per orang (foto, tagline, template message) — gx_docs team-desk-hd / team-desk-am
       GET publik (dibaca tim) · POST butuh password tim / SPV. Jangan simpan data customer di template. */
    if (q.get('desk') != null) {
      const team = String(q.get('desk')).toUpperCase(); if (!TEAMS.includes(team)) return json(res, { error: 'bad-team' }, 400);
      const key = 'team-desk-' + team.toLowerCase(), mem = memberOf(req), can = authed(req) || teamAuthed(req);
      const read = async () => { const row = must(await db().from('gx_docs').select('data,revision').eq('key', key).maybeSingle()); const d = (row && row.data) || {};
        return { data: { desks: d.desks && typeof d.desks === 'object' && !Array.isArray(d.desks) ? d.desks : {} }, revision: row ? row.revision : null }; };
      if (req.method === 'GET') { const r = await read(); return json(res, { desk: r.data, revision: r.revision, canEdit: can, me: mem ? mem.name : null }); }
      if (req.method !== 'POST') return json(res, { error: 'method' }, 405);
      const b = await readJson(req), op = str(b.op, 20), now = new Date().toISOString(), who = str(b.name, 60).replace(/\s+/g, ' ').trim();
      if (!can && !(mem && mem.name === who)) return json(res, { error: 'member-login-required', detail: mem ? 'Kamu hanya bisa mengubah desk milikmu sendiri.' : 'Login pakai nickname-mu untuk mengubah desk.' }, 401);
      if (!who) return json(res, { error: 'invalid', detail: 'Nama wajib.' }, 400);
      if (who === 'SPV' && !authed(req)) return json(res, { error: 'spv-login-required', detail: 'Desk SPV hanya bisa diubah SPV.' }, 401);
      for (let t = 0; t < 6; t++) {
        const cur = await read(), D = cur.data, me = D.desks[who] = D.desks[who] || { tpls: [] }; me.tpls = Array.isArray(me.tpls) ? me.tpls : [];
        let err = null;
        const tplIn = x => ({ title: str(x.title, 120).trim(), cat: str(x.cat, 40).trim(), text: str(x.text, 4000) });
        if (op === 'photo') { const ph = String(b.photo || ''); if (ph && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(ph)) err = 'Format foto tidak valid.'; else if (ph.length > 150000) err = 'Foto terlalu besar.'; else me.photo = ph; }
        else if (op === 'profile') { me.tagline = str(b.tagline, 80); me.emoji = str(b.emoji, 8); me.color = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : (me.color || '');
          if (Array.isArray(b.props)) me.props = [...new Set(b.props.map(String).filter(x => /^(window|clock|shelf|lamp|coffee|plant|headset|cat|frame|sticky|books|trophy|duck)$/.test(x)))];
          const pick = (v, re) => re.test(String(v || '')) ? String(v) : undefined; const st = { dk: pick(b.dk, /^(oak|walnut|white|black|pink)$/), ch: pick(b.ch, /^#[0-9a-f]{6}$/i), sc: pick(b.sc, /^(1|2|laptop)$/), sh: pick(b.sh, /^#[0-9a-f]{6}$/i) };
          for (const k in st) if (st[k] !== undefined) me[k] = st[k]; }
        else if (op === 'tpl.add') { const x = tplIn(b); if (!x.title || !x.text.trim()) err = 'Judul & isi template wajib.'; else if (me.tpls.length >= 200) err = 'Maks. 200 template per orang.'; else me.tpls.unshift({ id: randomUUID(), ...x, at: now, updated_at: now, uses: 0 }); }
        else if (op === 'tpl.upd') { const y = me.tpls.find(z => z.id === b.id); if (!y) err = 'Template tidak ditemukan.'; else { const x = tplIn(b); if (!x.title || !x.text.trim()) err = 'Judul & isi template wajib.'; else Object.assign(y, x, { updated_at: now }); } }
        else if (op === 'tpl.del') me.tpls = me.tpls.filter(z => z.id !== b.id);
        else if (op === 'tpl.use') { const y = me.tpls.find(z => z.id === b.id); if (y) y.uses = (y.uses || 0) + 1; }
        else return json(res, { error: 'bad-op' }, 400);
        if (err) return json(res, { error: 'invalid', detail: err }, 400);
        if (Object.keys(D.desks).length > 60) return json(res, { error: 'invalid', detail: 'Terlalu banyak desk.' }, 400);
        const r = must(await db().rpc('gx_doc_save', { p_key: key, p_data: D, p_revision: cur.revision }));
        if (!r || !r.conflict) return json(res, { desk: D, revision: r.revision, canEdit: can, me: mem ? mem.name : null });
      }
      return json(res, { error: 'busy', detail: 'Server sibuk, coba lagi.' }, 503);
    }

    /* ---------- Dashboard VIP: 4 sub-dashboard (Masterlist VIP, Masterlist Intracity, Billing Reminder 25, DIA Outstanding)
       — tim (GX_TEAM_PASSWORD) atau SPV. Data di gx_docs; sync = server mengambil .xlsx dari Google Sheets ("Anyone with the link"). ---------- */
    if (q.get('vip') != null) {
      if (!authed(req) && !teamAuthed(req) && !memberOf(req)) return json(res, { error: 'team-login-required' }, 401);
      const VIPDOC = { vip: 'vip-masterlist', intracity: 'vip-intracity', billing25: 'vip-billing25', dia: 'vip-dia' };
      const sec = VIPDOC[q.get('s')] ? q.get('s') : 'vip', key = VIPDOC[sec];
      if (req.method === 'GET' && q.get('sync')) {   // ambil file Google Sheets terbaru (hanya ID spreadsheet, URL dibangun di server)
        const id = String(q.get('sync'));
        if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) return json(res, { error: 'bad-id' }, 400);
        const urls = [`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, `https://drive.google.com/uc?export=download&id=${id}`];
        for (const u of urls) {
          try {
            const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'GX-CS-Dashboard' } });
            const ct = r.headers.get('content-type') || '';
            if (!r.ok || /text\/html/i.test(ct)) continue;
            const buf = Buffer.from(await r.arrayBuffer());
            if (buf.length < 100 || buf.slice(0, 2).toString() !== 'PK') continue;   // xlsx = zip
            if (buf.length > 3 * 1024 * 1024) return json(res, { error: 'too-large', detail: 'File spreadsheet terlalu besar untuk sync (> 3 MB) — pakai Import .xlsx.' }, 413);
            return json(res, { b64: buf.toString('base64'), size: buf.length });
          } catch (e) { /* coba URL berikutnya */ }
        }
        return json(res, { error: 'sync-failed', detail: 'Spreadsheet tidak bisa diambil. Pastikan akses share "Anyone with the link — Viewer", atau pakai Import .xlsx.' }, 502);
      }
      if (req.method === 'GET') {
        const row = must(await db().from('gx_docs').select('data,revision,updated_at').eq('key', key).maybeSingle());
        return json(res, row ? { ...row, spv: authed(req) } : { data: null, revision: null, spv: authed(req) });
      }
      if (req.method === 'POST') {
        const b = await readJson(req);
        if (!b.data || typeof b.data !== 'object' || !Array.isArray(b.data.tabs)) return json(res, { error: 'bad-payload' }, 400);
        const r = must(await db().rpc('gx_doc_save', { p_key: key, p_data: b.data, p_revision: b.revision ?? null }));
        if (r && r.conflict) return json(res, { error: 'conflict', revision: r.revision }, 409);
        return json(res, { ok: true, revision: r.revision });
      }
      return json(res, { error: 'method' }, 405);
    }
    /* ---------- Password tools tim: hanya SPV atau tim yang sudah memasukkan password tim ---------- */
    if (req.method === 'GET' && q.get('secrets')) {
      const team = q.get('secrets');
      if (!TEAMS.includes(team)) return json(res, { error: 'bad-team' }, 400);
      if (!authed(req) && !teamAuthed(req) && !memberOf(req)) return json(res, { error: 'team-login-required' }, 401);
      const row = must(await db().from('gx_docs').select('data').eq('key', 'team-secrets').maybeSingle());
      return json(res, { secrets: (row && row.data && row.data[team]) || {} });
    }
    /* ---------- Knowledge Base: boleh dibaca tim tanpa login (edit tetap wajib login SPV) ---------- */
    if (req.method === 'GET' && isPublicDoc(q.get('doc'))) {
      const row = must(await db().from('gx_docs').select('data,revision,updated_at').eq('key', q.get('doc')).maybeSingle());
      return row ? json(res, { ...row, canEdit: authed(req) }) : json(res, { error: 'empty', canEdit: authed(req) }, 404);
    }

    /* ---------- SPV (wajib login) ---------- */
    if (!authed(req)) return json(res, { error: 'login-required' }, 401);

    if (req.method === 'GET') {
      const doc = q.get('doc');
      if (doc) {
        if (!okDoc(doc)) return json(res, { error: 'bad-doc' }, 400);
        const row = must(await db().from('gx_docs').select('data,revision,updated_at').eq('key', doc).maybeSingle());
        return row ? json(res, row) : json(res, { error: 'empty' }, 404);
      }
      const from = q.get('from'), to = q.get('to');
      if (okMonth(from) && okMonth(to)) {
        if (from > to) return json(res, { error: 'bad-month' }, 400);
        const rows = must(await db().from('gx_tasks').select('*').gte('month', from).lte('month', to).order('month').order('section').order('sort').order('created_at').limit(3000));
        return json(res, { tasks: rows || [] });
      }
      const month = q.get('month');
      const mrows = must(await db().from('gx_tasks').select('month').limit(5000));
      const months = [...new Set((mrows || []).map(r => r.month))].sort();
      if (!okMonth(month)) return json(res, { tasks: [], months });
      const rows = must(await db().from('gx_tasks').select('*').eq('month', month).order('section').order('sort').order('created_at'));
      return json(res, { tasks: rows || [], months });
    }
    if (req.method === 'DELETE') {
      const id = q.get('id'); if (!id) return json(res, { error: 'bad-id' }, 400);
      must(await db().from('gx_tasks').delete().eq('id', id));
      return json(res, { ok: true });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      if (b.doc) {
        if (!okDoc(b.doc) || !b.data || typeof b.data !== 'object') return json(res, { error: 'bad-doc' }, 400);
        const r = must(await db().rpc('gx_doc_save', { p_key: b.doc, p_data: b.data, p_revision: b.revision ?? null }));
        if (r && r.conflict) return json(res, { error: 'conflict', revision: r.revision }, 409);
        return json(res, r);
      }
      if (b.copy) {
        const { from, to } = b.copy;
        if (!okMonth(from) || !okMonth(to) || from === to) return json(res, { error: 'bad-month' }, 400);
        /* bulan tujuan boleh sudah berisi task (mis. task bulanan yang dibuat duluan) — task dengan section + judul sama tidak disalin dua kali */
        const exist = must(await db().from('gx_tasks').select('section,title').eq('month', to)) || [], has = new Set(exist.map(t => t.section + '|' + String(t.title).trim().toLowerCase()));
        const src = must(await db().from('gx_tasks').select('*').eq('month', from).in('section', RECURRING));
        const rows = (src || []).filter(t => !has.has(t.section + '|' + String(t.title).trim().toLowerCase())).map(t => ({ ...clean({ ...t, month: to, status: 'NOT STARTED', due: shiftDue(t.due, to) }), team_note: '', team_by: '' }));
        if (rows.length) must(await db().from('gx_tasks').insert(rows));
        return json(res, { ok: true, copied: rows.length, skipped: (src || []).length - rows.length });
      }
      if (Array.isArray(b.import)) {
        const rows = b.import.slice(0, 500).map(clean);
        const months = [...new Set(rows.map(r => r.month))];
        const exist = must(await db().from('gx_tasks').select('id').in('month', months).limit(1));
        if (exist && exist.length) return json(res, { error: 'target-not-empty', detail: 'Bulan ini sudah punya task — import dibatalkan supaya tidak dobel.' }, 409);
        if (rows.length) must(await db().from('gx_tasks').insert(rows));
        return json(res, { ok: true, imported: rows.length });
      }
      if (b.task) {
        const t = clean(b.task);
        if (b.task.id) {
          const row = must(await db().from('gx_tasks').update(t).eq('id', b.task.id).select('*').single());
          return json(res, { task: row });
        }
        const row = must(await db().from('gx_tasks').insert(t).select('*').single());
        return json(res, { task: row });
      }
      return json(res, { error: 'bad-payload' }, 400);
    }
    return json(res, { error: 'method' }, 405);
  } catch (e) {
    const err = e instanceof AppError ? e : dbError(e);
    return json(res, { error: err.code || 'error', detail: err.detail || String(e.message || e) }, err.status || 500);
  }
}
