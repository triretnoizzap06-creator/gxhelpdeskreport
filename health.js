// Cek cepat: buka /api/health di browser. Tidak menampilkan isi token.
import { list } from '@vercel/blob';
export default async function handler(req, res) {
  const out = {
    server: 'ok',
    node: process.version,
    blobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobStoreId: !!process.env.BLOB_STORE_ID,
    publishKey: !!process.env.PUBLISH_KEY,
    blobAccessEnv: process.env.BLOB_ACCESS || null,
    storage: 'not-tested',
  };
  if (out.blobToken || out.blobStoreId) {
    try { const r = await list({ limit: 1 }); out.storage = 'ok'; out.files = r.blobs.length; }
    catch (e) { out.storage = 'error'; out.storageError = String((e && e.message) || e); }
  } else out.storage = 'not-connected';
  out.hint = out.storage === 'ok' ? 'Semua siap. Import data di web; semua yang membuka link akan melihatnya.'
    : out.storage === 'not-connected' ? 'Blob store belum terhubung ke project ini (env BLOB_READ_WRITE_TOKEN tidak ada). Vercel → Storage → Blob → Connect ke project, lalu Redeploy.'
    : 'Blob store terhubung tapi error — kirim teks storageError ini.';
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(out, null, 2));
}
