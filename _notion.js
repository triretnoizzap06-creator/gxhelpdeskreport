// Knowledge Base ← halaman Notion yang dipublikasikan (notion.site) — TANPA token / integration.
// Server membaca halaman publik lewat endpoint yang sama dengan yang dipakai notion.site (api/v3),
// lalu menyimpan hasilnya (cache) di Supabase gx_docs 'kb-notion'. Sumber bisa diganti lewat env NOTION_PUBLIC_URL.
// Catatan: endpoint ini tidak resmi dari Notion; kalau formatnya berubah, KB tetap menampilkan cache terakhir.
const DEFAULT_URL = 'https://melon-lime-e28.notion.site/Customer-Service-Division-Information-GlobalXtreme-47b6a98d6f6347c5893df56334d34b25';
export const SOURCE = () => process.env.NOTION_PUBLIC_URL || DEFAULT_URL;
export const clean = id => String(id || '').replace(/-/g, '').toLowerCase();
const dash = id => { const c = clean(id); return c.length === 32 ? `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20)}` : id; };
export const ROOT = () => { const m = SOURCE().match(/([0-9a-f]{32})(?:[?#].*)?$/i) || SOURCE().match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i); return m ? clean(m[1]) : ''; };
const ORIGIN = () => { try { return new URL(SOURCE()).origin; } catch (e) { return 'https://www.notion.so'; } };
export const notionConfigured = () => !!ROOT();
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Budget extends Error {}

async function v3(path, body, deadline) {
  const bases = [ORIGIN(), 'https://www.notion.so'].filter((v, i, a) => a.indexOf(v) === i); let last;
  for (const base of bases) for (let t = 0; t < 3; t++) {
    if (Date.now() > deadline) throw new Budget('budget');
    let r; try { r = await fetch(base + '/api/v3/' + path, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'Mozilla/5.0 (GX-CS-KB)' }, body: JSON.stringify(body) }); }
    catch (e) { last = e; await sleep(400); continue; }
    if (r.status === 429 || r.status >= 500) { last = new Error('Notion ' + r.status); await sleep(800 * (t + 1)); continue; }
    if (!r.ok) { last = Object.assign(new Error('Notion ' + r.status), { status: r.status }); break; }
    return r.json();
  }
  throw last || new Error('Notion tidak bisa dihubungi');
}
/* recordMap kadang membungkus nilai 2 lapis ({ value: { value, role } }) */
const val = x => x && x.value && x.value.value && typeof x.value.value === 'object' ? x.value.value : x && x.value ? x.value : null;
function absorb(rm, store) { for (const tb of ['block', 'collection', 'collection_view']) for (const [id, x] of Object.entries((rm && rm[tb]) || {})) { const v = val(x); if (v) store[tb][clean(id)] = v; } }

/* ambil semua blok satu halaman (semua chunk) + blok yang belum termuat */
async function loadPage(id, deadline, S) {
  let cursor = { stack: [] }, n = 0, ok = false;
  do {
    let j;
    try { j = await v3('loadCachedPageChunk', { page: { id: dash(id) }, limit: 100, cursor, chunkNumber: n, verticalColumns: false }, deadline); }
    catch (e) { if (e instanceof Budget) throw e; j = await v3('loadPageChunk', { pageId: dash(id), limit: 100, cursor, chunkNumber: n, verticalColumns: false }, deadline); }
    absorb(j.recordMap, S); ok = true; cursor = j.cursor || { stack: [] }; n++;
  } while (cursor.stack && cursor.stack.length && n < 30);
  /* blok anak yang belum ada di recordMap (halaman panjang / toggle) */
  for (let round = 0; round < 6; round++) {
    const miss = []; const walk = bid => { const b = S.block[bid]; if (!b) return; for (const c of b.content || []) { const k = clean(c); if (!S.block[k]) miss.push(k); else if (S.block[k].type !== 'page' && S.block[k].type !== 'collection_view_page') walk(k); } };
    walk(clean(id)); if (!miss.length) break;
    for (let i = 0; i < miss.length; i += 80) {
      const ids = miss.slice(i, i + 80);
      let j; try { j = await v3('syncRecordValues', { requests: ids.map(x => ({ pointer: { table: 'block', id: dash(x) }, version: -1 })) }, deadline); }
      catch (e) { if (e instanceof Budget) throw e; j = await v3('syncRecordValues', { requests: ids.map(x => ({ table: 'block', id: dash(x), version: -1 })) }, deadline); }
      absorb(j.recordMap, S);
    }
  }
  return ok;
}
async function loadCollection(b, deadline, S) {   // database inline / halaman database → tabel
  const cid = clean(b.collection_id || (b.format && b.format.collection_pointer && b.format.collection_pointer.id)), vid = clean((b.view_ids || [])[0]); if (!cid || !vid) return null;
  try {
    const j = await v3('queryCollection', { collection: { id: dash(cid) }, collectionView: { id: dash(vid) }, loader: { type: 'reducer', reducers: { collection_group_results: { type: 'results', limit: 300 } }, searchQuery: '', userTimeZone: 'Asia/Makassar' } }, deadline);
    absorb(j.recordMap, S); const ids = (((j.result || {}).reducerResults || {}).collection_group_results || {}).blockIds || (j.result || {}).blockIds || [];
    const col = S.collection[cid] || {}, schema = col.schema || {}, keys = Object.keys(schema).sort((a, c) => (a === 'title' ? -1 : c === 'title' ? 1 : 0));
    return { name: rtTxt(col.name), keys, schema, rows: ids.map(clean) };
  } catch (e) { if (e instanceof Budget) throw e; return null; }
}
/* rich text v3 [[teks, [[deko]]]] → [[teks, flags, href]] */
function rich(t) {
  return (t || []).map(([s, deco]) => { let f = '', h = ''; s = String(s == null ? '' : s);
    for (const d of deco || []) { const k = d[0]; if (k === 'b') f += 'b'; else if (k === 'i') f += 'i'; else if (k === 's') f += 's'; else if (k === 'c') f += 'c'; else if (k === '_') f += 'u';
      else if (k === 'a') h = String(d[1] || ''); else if (k === 'p') { h = 'notion:' + clean(d[1]); if (s === '‣') s = ''; } else if (k === 'd' && d[1]) s = d[1].start_date || s; else if (k === 'e') s = d[1] || s; }
    return [s, f, h]; }).filter(x => x[0] !== '' || x[2]).map(x => x[2] || x[1] ? x : [x[0]]);
}
const rtTxt = t => (t || []).map(x => x[0]).join('');
const fixUrl = (u, bid) => { u = String(u || ''); if (!u) return ''; if (u.startsWith('/')) u = 'https://www.notion.so' + u;
  if (/^attachment:|secure\.notion-static\.com|prod-files-secure|amazonaws\.com\/.*notion/i.test(u)) return `${ORIGIN()}/image/${encodeURIComponent(u)}?table=block&id=${dash(bid)}&cache=v2`; return u; };
const srcOf = b => fixUrl((b.format && b.format.display_source) || ((b.properties || {}).source || [[]])[0][0], b.id);

function convert(ids, S, ctx, depth = 0) {
  const out = [];
  for (const raw of ids || []) {
    const id = clean(raw), b = S.block[id]; if (!b || b.alive === false) continue;
    const P = b.properties || {}, F = b.format || {}, kids = () => depth < 8 && (b.content || []).length ? convert(b.content, S, ctx, depth + 1) : undefined, r = rich(P.title);
    let n = null;
    switch (b.type) {
      case 'text': n = { t: 'p', r, c: kids() }; break;
      case 'header': case 'sub_header': case 'sub_sub_header': n = { t: b.type === 'header' ? 'h1' : b.type === 'sub_header' ? 'h2' : 'h3', r, ...(F.toggleable ? { tg: 1, c: kids() } : {}) }; break;
      case 'bulleted_list': n = { t: 'ul', r, c: kids() }; break;
      case 'numbered_list': n = { t: 'ol', r, c: kids() }; break;
      case 'to_do': n = { t: 'todo', r, k: ((P.checked || [[]])[0][0] === 'Yes') ? 1 : 0, c: kids() }; break;
      case 'toggle': n = { t: 'tg', r, c: kids() }; break;
      case 'quote': n = { t: 'q', r, c: kids() }; break;
      case 'callout': n = { t: 'co', r, ic: F.page_icon && !/^http/.test(F.page_icon) ? F.page_icon : '💡', col: F.block_color || '', c: kids() }; break;
      case 'code': n = { t: 'code', r: [[rtTxt(P.title)]], lang: rtTxt(P.language) }; break;
      case 'equation': n = { t: 'p', r: [[rtTxt(P.title), 'c']] }; break;
      case 'divider': n = { t: 'hr' }; break;
      case 'image': n = { t: 'img', u: srcOf(b), cap: rich(P.caption) }; break;
      case 'video': case 'audio': case 'file': case 'pdf': n = { t: 'file', k: b.type, u: srcOf(b), name: rtTxt(P.title), cap: rich(P.caption) }; break;
      case 'bookmark': n = { t: 'emb', u: rtTxt(P.link), cap: P.title ? rich(P.title) : rich(P.description) }; break;
      case 'embed': case 'figma': case 'gist': case 'drive': case 'maps': case 'codepen': case 'typeform': case 'miro': case 'excalidraw': case 'loom': case 'tweet': n = { t: 'emb', u: srcOf(b), cap: rich(P.caption) }; break;
      case 'table': { const cols = F.table_block_column_order || [], rows = (b.content || []).map(x => S.block[clean(x)]).filter(Boolean);
        n = { t: 'tbl', h: F.table_block_column_header ? 1 : 0, rows: rows.map(rw => cols.map(c => rich((rw.properties || {})[c]))) }; break; }
      case 'column_list': n = { t: 'cols', c: (b.content || []).map(c => ({ t: 'col', c: convert((S.block[clean(c)] || {}).content || [], S, ctx, depth + 1) })) }; break;
      case 'transclusion_container': case 'transclusion_reference': { const src = clean((F.transclusion_reference_pointer || {}).id); out.push(...convert(src && S.block[src] ? S.block[src].content : b.content, S, ctx, depth + 1)); continue; }
      case 'page': if (depth === 0 || true) { ctx.kids.push(id); n = { t: 'page', id, title: rtTxt(P.title) }; } break;
      case 'alias': { const to = clean((F.alias_pointer || {}).id); if (to) n = { t: 'page', id: to }; break; }
      case 'collection_view': case 'collection_view_page': { const c = ctx.cols[id]; if (b.type === 'collection_view_page') ctx.kids.push(id);
        if (c && c.rows.length) { const head = c.keys.map(k => [[(c.schema[k] || {}).name || k]]);
          n = { t: 'tbl', h: 1, cap: c.name, rows: [head, ...c.rows.map(rid => { const rb = S.block[rid] || {}; return c.keys.map(k => k === 'title' ? [[rtTxt((rb.properties || {}).title) || 'Untitled', '', 'notion:' + rid]] : rich((rb.properties || {})[k])); })] };
          c.rows.forEach(rid => { if (S.block[rid]) ctx.kids.push(rid); }); }
        else n = { t: 'db', title: c ? c.name : '' }; break; }
    }
    if (n) { if (n.c !== undefined && (!n.c || !n.c.length)) delete n.c; out.push(n); }
  }
  return out;
}
const plain = nodes => { let s = ''; const walk = a => (a || []).forEach(n => { if (n.r) s += n.r.map(x => x[0]).join('') + '\n'; if (n.rows) n.rows.forEach(r => { s += r.map(c => c.map(x => x[0]).join('')).join(' | ') + '\n'; }); if (n.title) s += n.title + '\n'; if (n.u) s += n.u + '\n'; walk(n.c); }); walk(nodes); return s; };
const pageUrl = (id, title) => ORIGIN() + '/' + (String(title || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page') + '-' + id;

/* Satu langkah crawl (dipanggil berulang sampai done). D = isi gx_docs 'kb-notion' (dimutasi). */
export async function syncStep(D, { budgetMs = 7000, full = false } = {}) {
  const t0 = Date.now(), deadline = t0 + budgetMs, root = ROOT(); if (!root) throw new Error('Link Notion tidak valid (NOTION_PUBLIC_URL).');
  D.pages = D.pages || {}; D.root = root; D.source = SOURCE();
  if (full || !Array.isArray(D.queue) || !D.queue.length) {   // mulai crawl baru dari root
    D.queue = [{ id: root, f: 1, p: '' }]; D.visit = {}; D.full = !!full; D.crawlAt = new Date().toISOString(); D.errors = 0;
  }
  let fetched = 0;
  while (D.queue.length && Date.now() < deadline - 500) {
    const it = D.queue[0], id = it.id, old = D.pages[id];
    if (D.visit[id]) { D.queue.shift(); continue; }
    if (!it.f && old && old.b) {   // halaman tidak berubah → pakai cache, lanjut ke sub-halamannya
      D.visit[id] = 1; D.queue.shift(); (old.o || []).forEach(k => D.queue.push({ id: k, f: D.full ? 1 : (D.pages[k] && D.pages[k].b && D.pages[k].s === D.pages[k].e ? 0 : 1), p: id })); continue; }
    const S = { block: {}, collection: {}, collection_view: {} };
    try { await loadPage(id, deadline, S); }
    catch (e) { if (e instanceof Budget) break; if (id === root) throw new Error('Halaman Notion tidak bisa dibaca — pastikan sudah "Publish to web" (' + (e.message || e) + ').'); D.errors++; D.visit[id] = 1; D.queue.shift(); continue; }
    const pb = S.block[id]; if (!pb) { if (id === root) throw new Error('Halaman root tidak ditemukan / tidak publik.'); D.visit[id] = 1; D.queue.shift(); continue; }
    const ctx = { kids: [], cols: {} };
    try { for (const cid of (pb.type === 'collection_view_page' ? [id] : []).concat(Object.keys(S.block).filter(k => S.block[k].type === 'collection_view' && S.block[k].parent_id && clean(S.block[k].parent_id) === id)))
      ctx.cols[cid] = await loadCollection(S.block[cid], deadline, S); } catch (e) { if (e instanceof Budget) break; }
    const P = pb.properties || {}, F = pb.format || {}, title = rtTxt(P.title) || (pb.type === 'collection_view_page' && ctx.cols[id] ? ctx.cols[id].name : '') || 'Untitled';
    const blocks = pb.type === 'collection_view_page' ? convert([id], S, ctx) : convert(pb.content || [], S, ctx);
    const e = new Date(pb.last_edited_time || Date.now()).toISOString(), kids = [...new Set(ctx.kids)].filter(k => k !== id);
    D.pages[id] = { ...(old || {}), t: title, i: F.page_icon && !/^http/.test(F.page_icon) ? F.page_icon : '', p: it.p || (id === root ? '' : (old && old.p) || ''), e, s: e, u: pageUrl(id, title), b: blocks, o: kids, x: plain(blocks).slice(0, 20000), at: new Date().toISOString() };
    for (const k of kids) { const kb = S.block[k], ke = kb && kb.last_edited_time ? new Date(kb.last_edited_time).toISOString() : '', ko = D.pages[k];
      if (ko && ke) ko.e = ke; if (!ko && kb) D.pages[k] = { t: rtTxt((kb.properties || {}).title) || 'Untitled', p: id, e: ke };
      if (D.pages[k]) D.pages[k].p = id;
      D.queue.push({ id: k, f: D.full || !ko || !ko.b || !ke || ko.s !== ke ? 1 : 0, p: id }); }
    D.visit[id] = 1; D.queue.shift(); fetched++;
    if (Object.keys(D.visit).length > 600) { D.queue = []; break; }   // pengaman
  }
  const done = !D.queue.length;
  if (done) { for (const k of Object.keys(D.pages)) if (!D.visit[k]) delete D.pages[k];   // halaman yang sudah dihapus / tidak publik lagi
    D.syncedAt = new Date().toISOString(); delete D.visit; D.queue = []; }
  return { done, remaining: (D.queue || []).length, total: Object.keys(D.pages).length, updated: fetched };
}
/* pencarian teks lengkap di semua halaman (judul + isi) */
export function searchPages(D, q, limit = 40) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(w => w.length > 1).slice(0, 6); if (!words.length) return [];
  const out = [];
  for (const [id, p] of Object.entries(D.pages || {})) { const t = String(p.t || '').toLowerCase(), x = String(p.x || ''), xl = x.toLowerCase();
    if (!words.every(w => t.includes(w) || xl.includes(w))) continue;
    const score = words.reduce((s, w) => s + (t.includes(w) ? 10 : 0) + Math.min(5, xl.split(w).length - 1), 0), i = Math.max(0, xl.indexOf(words[0]));
    out.push({ id, t: p.t, score, snip: (i > 60 ? '…' : '') + x.slice(Math.max(0, i - 60), i + 140).replace(/\s+/g, ' ').trim() + '…' }); }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
