// Penyimpanan online laporan (Vercel Blob).
// Bisa dipakai dengan Blob store Private maupun Public:
//  - Private: file hanya bisa dibaca lewat API ini.
//  - Public : file disimpan di folder acak yang diturunkan dari token rahasia store, jadi alamatnya tidak bisa ditebak.
//
// GET  /api/report               → data laporan terbaru (gzip JSON)
// GET  /api/report?meta=1        → { at, open } waktu simpan terakhir
// GET  /api/report?history=1     → daftar riwayat [{ id, at, title, auto, size }]
// GET  /api/report?snap=<id>     → isi satu riwayat (gzip JSON)
// POST /api/report               → simpan data terbaru
// POST /api/report?snap=1&title=…&auto=0|1 → simpan riwayat baru (body gzip JSON)
// POST /api/report?del=<id>      → hapus satu riwayat
// POST /api/report?check=1       → cek password saja
// Bila env PUBLISH_KEY diisi, semua POST wajib header x-publish-key. Bila kosong, siapa pun boleh menyimpan (mode terbuka).
import { put, get, head, list, del } from '@vercel/blob';
import { timingSafeEqual, createHash } from 'node:crypto';

const MAX = 4.2 * 1024 * 1024; // batas body request Vercel Functions ±4.5 MB
const MAX_HISTORY = 80;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const configured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const open = () => !process.env.PUBLISH_KEY;

function keyOk(given) {
  const want = process.env.PUBLISH_KEY || '';
  if (!want) return true; // mode terbuka
  if (!given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------- akses store: private, atau public di folder rahasia ---------- */
let ACCESS = process.env.BLOB_ACCESS === 'public' || process.env.BLOB_ACCESS === 'private' ? process.env.BLOB_ACCESS : null;
const secretDir = () => {
  const seed = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || 'gx';
  return 'r-' + createHash('sha256').update('gx-cs-report:' + seed).digest('hex').slice(0, 32);
};
const base = () => (ACCESS === 'public' ? secretDir() + '/' : '') + 'report/';
const P = {
  latest: () => base() + 'latest.json.gz',
  hist: () => base() + 'history/',
};

async function putAuto(path, body) {
  const opts = { allowOverwrite: true, addRandomSuffix: false, contentType: 'application/gzip', cacheControlMaxAge: 60 };
  if (ACCESS) return put(rebase(path), body, { ...opts, access: ACCESS });
  try {
    const r = await put(path, body, { ...opts, access: 'private' });
    ACCESS = 'private';
    return r;
  } catch (e) {
    ACCESS = 'public'; // store dibuat sebagai Public
    return put(rebase(path), body, { ...opts, access: 'public' });
  }
}
// path dibuat sebelum ACCESS diketahui → sesuaikan folder
function rebase(path) {
  const rel = path.replace(/^r-[0-9a-f]{32}\//, '');
  return (ACCESS === 'public' ? secretDir() + '/' : '') + rel;
}

async function detectAccess() {
  if (ACCESS) return ACCESS;
  // cari file yang sudah ada untuk tahu jenis store
  const priv = await head('report/latest.json.gz').catch(() => null);
  if (priv) return (ACCESS = 'private');
  const pub = await head(secretDir() + '/report/latest.json.gz').catch(() => null);
  if (pub) return (ACCESS = 'public');
  const anyPriv = await list({ prefix: 'report/', limit: 1 }).catch(() => null);
  if (anyPriv && anyPriv.blobs.length) return (ACCESS = 'private');
  const anyPub = await list({ prefix: secretDir() + '/report/', limit: 1 }).catch(() => null);
  if (anyPub && anyPub.blobs.length) return (ACCESS = 'public');
  return null; // belum ada data sama sekali
}

async function readBlob(path) {
  const r = await get(path, { access: ACCESS || 'private', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return r;
}

const histId = (at, title, auto) => `${at}__${auto ? 'a' : 'm'}__${encodeURIComponent(String(title || 'Report').slice(0, 80)).replace(/%/g, '~')}`;
function parseHist(pathname) {
  const name = pathname.split('/').pop().replace(/\.json\.gz$/, '');
  const [at, kind, ...rest] = name.split('__');
  let title = rest.join('__');
  try { title = decodeURIComponent(title.replace(/~/g, '%')); } catch (e) {}
  return { id: name, at: +at || 0, auto: kind === 'a', title };
}
const safeId = id => /^[0-9]{10,16}__[am]__[A-Za-z0-9._~\-!*'()]{0,400}$/.test(String(id || ''));

async function listHistory() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: P.hist(), cursor, limit: 1000 });
    for (const b of r.blobs) out.push({ ...parseHist(b.pathname), size: b.size, pathname: b.pathname });
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.at - a.at);
}

async function GET(request) {
  if (!configured()) return json({ error: 'storage-not-configured' }, 501);
  const q = new URL(request.url).searchParams;
  try {
    const acc = await detectAccess();
    if (q.has('history')) {
      if (!acc) return json({ items: [], open: open() });
      const items = (await listHistory()).map(({ pathname, ...x }) => x);
      return json({ items, open: open() });
    }
    if (q.has('snap')) {
      const id = q.get('snap');
      if (!safeId(id) || !acc) return json({ error: 'not-found' }, 404);
      const r = await readBlob(P.hist() + id + '.json.gz');
      if (!r) return json({ error: 'not-found' }, 404);
      return new Response(r.stream, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
    }
    if (q.has('meta')) {
      if (!acc) return json({ error: 'empty', open: open() }, 404);
      const h = await head(P.latest()).catch(() => null);
      if (!h) return json({ error: 'empty', open: open() }, 404);
      return json({ at: new Date(h.uploadedAt).getTime(), size: h.size, open: open(), access: acc });
    }
    if (!acc) return json({ error: 'empty' }, 404);
    const r = await readBlob(P.latest());
    if (!r) return json({ error: 'empty' }, 404);
    return new Response(r.stream, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-published-at': String(new Date(r.blob.uploadedAt).getTime()) } });
  } catch (e) {
    return json({ error: 'read-failed', detail: String((e && e.message) || e) }, 500);
  }
}

async function POST(request) {
  if (!keyOk(request.headers.get('x-publish-key'))) return json({ error: 'unauthorized' }, 401);
  const q = new URL(request.url).searchParams;
  if (q.has('check')) return json({ ok: true, storage: configured(), open: open() });
  if (!configured()) return json({ error: 'storage-not-configured' }, 501);
  try {
    await detectAccess();
    if (q.has('del')) {
      const id = q.get('del');
      if (!safeId(id)) return json({ error: 'bad-id' }, 400);
      await del(P.hist() + id + '.json.gz');
      return json({ ok: true });
    }
    const buf = Buffer.from(await request.arrayBuffer());
    if (buf.length < 20 || buf[0] !== 0x1f || buf[1] !== 0x8b) return json({ error: 'bad-payload' }, 400);
    if (buf.length > MAX) return json({ error: 'too-large', size: buf.length }, 413);
    if (q.has('snap')) {
      const at = Date.now(), auto = q.get('auto') === '1', title = q.get('title') || 'Report';
      // riwayat otomatis dengan judul sama dalam 3 jam terakhir → diganti (supaya tidak menumpuk)
      const items = await listHistory().catch(() => []);
      const old = auto ? items.filter(x => x.auto && x.title === title && at - x.at < 3 * 3600e3) : [];
      const id = histId(at, title, auto);
      await putAuto(P.hist() + id + '.json.gz', buf);
      const extra = items.filter(x => !old.includes(x)).slice(MAX_HISTORY - 1).filter(x => x.auto);
      const drop = [...old, ...extra].map(x => x.pathname);
      if (drop.length) await del(drop).catch(() => {});
      return json({ ok: true, id, at, title, auto });
    }
    await putAuto(P.latest(), buf);
    const h = await head(P.latest()).catch(() => null);
    return json({ ok: true, at: h ? new Date(h.uploadedAt).getTime() : Date.now(), size: buf.length, access: ACCESS });
  } catch (e) {
    return json({ error: 'write-failed', detail: String((e && e.message) || e) }, 500);
  }
}

/* ---------- adapter: format klasik Vercel Node.js (req, res) ---------- */
export const config = { api: { bodyParser: false } };
async function readBody(req) {
  if (req.body !== undefined && req.body !== null && !(typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length === 0)) {
    return Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}
export default async function handler(req, res) {
  try {
    const url = 'https://' + (req.headers.host || 'localhost') + req.url;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
    let out;
    if (req.method === 'GET' || req.method === 'HEAD') out = await GET(new Request(url, { method: 'GET', headers }));
    else if (req.method === 'POST') out = await POST(new Request(url, { method: 'POST', headers, body: await readBody(req) }));
    else out = json({ error: 'method-not-allowed' }, 405);
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'handler-failed', detail: String((e && e.message) || e) }));
  }
}
