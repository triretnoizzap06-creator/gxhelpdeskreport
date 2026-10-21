// npm run check — cek build sebelum upload/deploy.
//  1. Semua file wajib ada.
//  2. Script di index.html valid (tidak ada syntax error).
//  3. Modul API bisa di-load (dependensi terpasang).
//  4. Bila env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY diisi: tes koneksi & skema Supabase (read-only).
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };

for (const f of ['index.html', 'vercel.json', 'package.json', 'api/report.js', 'api/health.js', 'lib/store.js', 'supabase/schema.sql', 'assets/mark.png'])
  ok(fs.existsSync(path.join(root, f)), 'file ' + f);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let parsed = 0; for (const s of scripts) { try { new vm.Script(s); parsed++; } catch (e) { ok(false, 'script index.html: ' + e.message); } }
ok(parsed === scripts.length && parsed > 0, `script index.html valid (${parsed} blok)`);
try { JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')); ok(true, 'vercel.json valid'); } catch (e) { ok(false, 'vercel.json: ' + e.message); }

for (const m of ['api/report.js', 'api/health.js']) {
  try { const mod = await import(path.join(root, m)); ok(typeof mod.default === 'function', 'modul ' + m + ' (export default handler)'); }
  catch (e) { ok(false, 'modul ' + m + ': ' + e.message + ' — jalankan npm install'); }
}

if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
  const { db, dbError } = await import(path.join(root, 'lib/store.js'));
  try {
    for (const t of ['report_state', 'report_imports', 'report_snapshots']) {
      const r = await db().from(t).select('id', { count: 'exact' }).limit(1);
      if (r.error) throw dbError(r.error);
      ok(true, `Supabase tabel ${t} (${r.count} baris)`);
    }
  } catch (e) { ok(false, 'Supabase: ' + (e.detail || e.message)); }
} else console.log('• Lewati tes Supabase (isi SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY untuk mengetes koneksi).');

console.log(fail ? `\n${fail} cek gagal.` : '\nSemua cek lolos.');
process.exit(fail ? 1 : 0);
