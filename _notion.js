// Sinkron Knowledge Base dari Notion (API resmi). Butuh env NOTION_TOKEN (Internal Integration Secret) —
// integration harus di-"Connect" ke halaman root "Customer Service Division Information - GlobalXtreme".
// Root bisa diganti dengan env NOTION_ROOT_PAGE. Token hanya dipakai di server, tidak pernah dikirim ke browser.
const API = 'https://api.notion.com/v1', VER = '2022-06-28';
export const ROOT = () => String(process.env.NOTION_ROOT_PAGE || '47b6a98d6f6347c5893df56334d34b25').replace(/-/g, '').slice(-32).toLowerCase();
export const notionConfigured = () => !!process.env.NOTION_TOKEN;
export const clean = id => String(id || '').replace(/-/g, '').toLowerCase();
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Budget extends Error {}

async function nf(path, opt = {}, deadline = Infinity) {
  for (let t = 0; t < 5; t++) {
    if (Date.now() > deadline) throw new Budget('budget');
    const r = await fetch(API + path, { ...opt, headers: { Authorization: 'Bearer ' + process.env.NOTION_TOKEN, 'Notion-Version': VER, 'content-type': 'application/json' } });
    if (r.status === 429 || r.status >= 500) { await sleep(Math.min(4000, (+r.headers.get('retry-after') || 1) * 1000)); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || 'Notion ' + r.status); e.status = r.status; e.code = j.code; throw e; }
    return j;
  }
  throw new Error('Notion sibuk (rate limit), coba lagi.');
}
async function children(id, deadline) {
  const out = []; let cur = null;
  do { const j = await nf(`/blocks/${id}/children?page_size=100${cur ? '&start_cursor=' + cur : ''}`, {}, deadline); out.push(...(j.results || [])); cur = j.has_more ? j.next_cursor : null; } while (cur);
  return out;
}
/* rich text → [[teks, flags, href]] (flags: b i s c u) */
const rich = rt => (rt || []).map(x => { const a = x.annotations || {}, f = (a.bold ? 'b' : '') + (a.italic ? 'i' : '') + (a.strikethrough ? 's' : '') + (a.code ? 'c' : '') + (a.underline ? 'u' : '');
  let h = x.href || (x.text && x.text.link && x.text.link.url) || ''; if (x.type === 'mention' && x.mention && x.mention.type === 'page') h = 'notion:' + clean(x.mention.page.id);
  return h || f ? [x.plain_text || '', f, h] : [x.plain_text || '']; }).filter(x => x[0] !== '' || x[2]);
const fileUrl = (o, id) => !o ? '' : o.type === 'external' ? (o.external || {}).url || '' : o.type === 'file' ? 'block:' + clean(id) : '';
/* blok Notion → node ringkas yang dirender kb.html */
async function convert(list, deadline, ctx, depth = 0) {
  const out = [];
  for (const b of list) {
    const t = b.type, v = b[t] || {}, kids = async () => b.has_children && depth < 6 ? convert(await children(b.id, deadline), deadline, ctx, depth + 1) : [];
    let n = null;
    if (t === 'paragraph') n = { t: 'p', r: rich(v.rich_text), c: await kids() };
    else if (/^heading_[123]$/.test(t)) n = { t: 'h' + t.slice(-1), r: rich(v.rich_text), ...(v.is_toggleable ? { tg: 1, c: await kids() } : {}) };
    else if (t === 'bulleted_list_item') n = { t: 'ul', r: rich(v.rich_text), c: await kids() };
    else if (t === 'numbered_list_item') n = { t: 'ol', r: rich(v.rich_text), c: await kids() };
    else if (t === 'to_do') n = { t: 'todo', r: rich(v.rich_text), k: v.checked ? 1 : 0, c: await kids() };
    else if (t === 'toggle') n = { t: 'tg', r: rich(v.rich_text), c: await kids() };
    else if (t === 'quote') n = { t: 'q', r: rich(v.rich_text), c: await kids() };
    else if (t === 'callout') n = { t: 'co', r: rich(v.rich_text), ic: v.icon && v.icon.type === 'emoji' ? v.icon.emoji : '💡', col: v.color || '', c: await kids() };
    else if (t === 'code') n = { t: 'code', r: [[(v.rich_text || []).map(x => x.plain_text).join('')]], lang: v.language || '' };
    else if (t === 'equation') n = { t: 'p', r: [[v.expression || '', 'c']] };
    else if (t === 'divider') n = { t: 'hr' };
    else if (t === 'image') n = { t: 'img', u: fileUrl(v, b.id), cap: rich(v.caption) };
    else if (t === 'video' || t === 'file' || t === 'pdf' || t === 'audio') n = { t: 'file', k: t, u: fileUrl(v, b.id), name: v.name || '', cap: rich(v.caption) };
    else if (t === 'bookmark' || t === 'embed' || t === 'link_preview') n = { t: 'emb', u: v.url || '', cap: rich(v.caption) };
    else if (t === 'table') { const rows = await children(b.id, deadline); n = { t: 'tbl', h: v.has_column_header ? 1 : 0, rows: rows.filter(x => x.type === 'table_row').map(x => (x.table_row.cells || []).map(rich)) }; }
    else if (t === 'column_list') { const cols = await children(b.id, deadline); n = { t: 'cols', c: [] }; for (const c of cols) n.c.push({ t: 'col', c: c.has_children ? await convert(await children(c.id, deadline), deadline, ctx, depth + 1) : [] }); }
    else if (t === 'synced_block') { const src = v.synced_from && v.synced_from.block_id; const k = src ? await children(src, deadline).catch(() => []) : b.has_children ? await children(b.id, deadline) : []; out.push(...await convert(k, deadline, ctx, depth + 1)); continue; }
    else if (t === 'child_page') { ctx.kids.push(clean(b.id)); n = { t: 'page', id: clean(b.id), title: v.title || '' }; }
    else if (t === 'link_to_page') n = v.type === 'page_id' ? { t: 'page', id: clean(v.page_id) } : null;
    else if (t === 'child_database') n = { t: 'db', title: v.title || '' };
    if (n) { if (n.c && !n.c.length) delete n.c; out.push(n); }
  }
  return out;
}
const plain = nodes => { let s = ''; const walk = a => (a || []).forEach(n => { if (n.r) s += n.r.map(x => x[0]).join('') + '\n'; if (n.rows) n.rows.forEach(r => { s += r.map(c => c.map(x => x[0]).join('')).join(' | ') + '\n'; }); if (n.title) s += n.title + '\n'; walk(n.c); }); walk(nodes); return s; };
const titleOf = p => { for (const k in p.properties || {}) { const x = p.properties[k]; if (x && x.type === 'title') return (x.title || []).map(t => t.plain_text).join('').trim(); } return ''; };

/* Satu langkah sinkron (dipanggil berulang sampai done). D = isi gx_docs 'kb-notion' (dimutasi). */
export async function syncStep(D, { budgetMs = 7000, full = false } = {}) {
  const t0 = Date.now(), deadline = t0 + budgetMs, root = ROOT(); D.pages = D.pages || {}; D.root = root;
  if (full || !D.treeAt || !Array.isArray(D.pending) || (!D.pending.length && Date.now() - Date.parse(D.treeAt) > 5 * 60e3)) {
    /* 1) daftar semua halaman yang di-share ke integration (Search API) → pohon dari root */
    const all = []; let cur = null;
    do { const j = await nf('/search', { method: 'POST', body: JSON.stringify({ filter: { property: 'object', value: 'page' }, page_size: 100, ...(cur ? { start_cursor: cur } : {}) }) }, deadline + 8000); all.push(...(j.results || [])); cur = j.has_more ? j.next_cursor : null; } while (cur);
    const meta = new Map(), blockParent = new Map();
    for (const p of all) { if (p.archived || p.in_trash) continue; const par = p.parent || {};
      meta.set(clean(p.id), { t: titleOf(p) || 'Untitled', i: p.icon && p.icon.type === 'emoji' ? p.icon.emoji : '', e: p.last_edited_time, u: p.public_url || p.url || '', p: par.type === 'page_id' ? clean(par.page_id) : par.type === 'block_id' ? 'b:' + clean(par.block_id) : '' }); }
    /* halaman di dalam toggle/kolom punya parent block → cari halaman induknya (maks 4 lompatan) */
    for (const [id, m] of meta) { let p = m.p, hop = 0; while (p.startsWith('b:') && hop++ < 4) { const bid = p.slice(2); if (!blockParent.has(bid)) { try { const b = await nf('/blocks/' + bid, {}, deadline + 8000); const bp = b.parent || {}; blockParent.set(bid, bp.type === 'page_id' ? clean(bp.page_id) : bp.type === 'block_id' ? 'b:' + clean(bp.block_id) : ''); } catch (e) { blockParent.set(bid, ''); } } p = blockParent.get(bid); } m.p = p.startsWith('b:') ? '' : p; }
    const inRoot = id => { let x = id, n = 0; while (x && n++ < 12) { if (x === root) return true; x = (meta.get(x) || {}).p; } return false; };
    const next = {};
    for (const [id, m] of meta) if (inRoot(id)) { const o = D.pages[id] || {}; next[id] = { ...o, ...m }; }
    if (!next[root]) throw Object.assign(new Error('Halaman root belum di-connect ke integration Notion (… → Connections → pilih integration).'), { code: 'root-not-shared' });
    D.pages = next; D.treeAt = new Date().toISOString();
    D.pending = Object.keys(next).filter(id => !next[id].b || next[id].s !== next[id].e).sort((a, b) => (a === root ? -1 : b === root ? 1 : 0));
  }
  /* 2) isi halaman yang berubah (sesuai sisa waktu) */
  let doneN = 0;
  while (D.pending.length && Date.now() < deadline - 600) {
    const id = D.pending[0], pg = D.pages[id]; if (!pg) { D.pending.shift(); continue; }
    const ctx = { kids: [] };
    try { const b = await convert(await children(id, deadline), deadline, ctx); pg.b = b; pg.o = ctx.kids; pg.x = plain(b).slice(0, 4000); pg.s = pg.e; pg.at = new Date().toISOString(); D.pending.shift(); doneN++; }
    catch (e) { if (e instanceof Budget) break; if (e.status === 404 || e.code === 'object_not_found') { D.pending.shift(); continue; } throw e; }
  }
  if (!D.pending.length) D.syncedAt = new Date().toISOString();
  return { done: !D.pending.length, remaining: D.pending.length, total: Object.keys(D.pages).length, updated: doneN };
}
/* URL file Notion (gambar/video upload) kedaluwarsa ±1 jam → ambil URL segar saat dibuka */
export async function freshFileUrl(blockId) {
  const b = await nf('/blocks/' + clean(blockId)); const v = b[b.type] || {};
  return v.type === 'file' ? (v.file || {}).url : v.type === 'external' ? (v.external || {}).url : '';
}
