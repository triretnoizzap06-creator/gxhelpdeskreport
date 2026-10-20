// Penyimpanan online laporan (Vercel Blob, private).
// GET  /api/report        → data laporan terakhir yang dipublish (gzip JSON)
// GET  /api/report?meta=1 → { at } waktu publish terakhir (ringan, untuk cek update)
// POST /api/report        → publish data baru (header x-publish-key = env PUBLISH_KEY)
// POST /api/report?check=1→ cek password saja, tidak menyimpan apa pun
import { put, get, head } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const PATH = 'report/latest.json.gz';
const MAX = 4.2 * 1024 * 1024; // batas body request Vercel Functions ±4.5 MB

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const configured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

function keyOk(given) {
  const want = process.env.PUBLISH_KEY || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!configured()) return json({ error: 'storage-not-configured' }, 501);
  const meta = new URL(request.url).searchParams.has('meta');
  try {
    if (meta) {
      const h = await head(PATH).catch(() => null);
      if (!h) return json({ error: 'empty' }, 404);
      return json({ at: new Date(h.uploadedAt).getTime(), size: h.size });
    }
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return json({ error: 'empty' }, 404);
    return new Response(r.stream, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-published-at': String(new Date(r.blob.uploadedAt).getTime()) } });
  } catch (e) {
    return json({ error: 'read-failed', detail: String(e && e.message || e) }, 500);
  }
}

export async function POST(request) {
  if (!process.env.PUBLISH_KEY) return json({ error: 'publish-key-not-set' }, 501);
  if (!keyOk(request.headers.get('x-publish-key'))) return json({ error: 'unauthorized' }, 401);
  if (new URL(request.url).searchParams.has('check')) return json({ ok: true, storage: configured() });
  if (!configured()) return json({ error: 'storage-not-configured' }, 501);
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length < 20 || buf[0] !== 0x1f || buf[1] !== 0x8b) return json({ error: 'bad-payload' }, 400);
  if (buf.length > MAX) return json({ error: 'too-large', size: buf.length }, 413);
  try {
    await put(PATH, buf, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/gzip', cacheControlMaxAge: 60 });
    const h = await head(PATH).catch(() => null);
    return json({ ok: true, at: h ? new Date(h.uploadedAt).getTime() : Date.now(), size: buf.length });
  } catch (e) {
    return json({ error: 'write-failed', detail: String(e && e.message || e) }, 500);
  }
}
