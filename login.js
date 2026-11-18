// POST /api/login  (form: password, next) → set cookie & redirect ke halaman tujuan
// GET  /api/login?logout=1                → hapus cookie, kembali ke dashboard utama
// GET  /api/login?check=1                 → { authed, team } (dipakai halaman untuk tombol Logout)
// POST /api/login  JSON { team: 1, password } → akses tim (GX_TEAM_PASSWORD) untuk melihat password tools
// Login per orang (Dashboard Helpdesk / AM):
// POST /api/login  JSON { member: 1, name, password }        → login pakai nama lengkap (password awal: env GX_MEMBER_DEFAULT_PASSWORD)
// POST /api/login  JSON { member: 1, change: { old, new } }  → ganti password sendiri
// POST /api/login  JSON { member: 1, reset: "Nama Lengkap" } → SPV mengembalikan password orang itu ke password awal
// GET  /api/login?members=1 → daftar nama untuk form login · GET /api/login?logout=member → keluar dari akun orang
import { memberOf, memberCookie, clearMemberCookie, membersConfigured, findMember, listMembers, checkPassword, setPassword, resetPassword, mustChange, defaultPw } from './_members.js';
import { passOk, sessionCookie, clearCookie, safeNext, authed, authConfigured, teamPassOk, teamCookie, teamAuthed, teamConfigured } from './_auth.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let s = '';
  if (req.body != null) s = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
  else { const c = []; for await (const x of req) c.push(Buffer.isBuffer(x) ? x : Buffer.from(x)); s = Buffer.concat(c).toString('utf8'); }
  if (s.length > 4096) return {};
  if (/^\s*\{/.test(s)) { try { return JSON.parse(s); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(s));
}
const redirect = (res, to, cookie) => { res.statusCode = 303; if (cookie) res.setHeader('set-cookie', cookie); res.setHeader('location', to); res.setHeader('cache-control', 'no-store'); res.end(); };

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const J = (o, st = 200, cookie) => { res.statusCode = st; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); if (cookie) res.setHeader('set-cookie', cookie); return res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && u.searchParams.get('logout') === 'member') return J({ ok: true }, 200, clearMemberCookie());
  if (req.method === 'GET' && u.searchParams.has('logout')) return redirect(res, '/', clearCookie());
  if (req.method === 'GET' && u.searchParams.has('members')) { try { return J({ members: membersConfigured() ? await listMembers() : [], configured: membersConfigured() }); } catch (e) { return J({ members: [], error: 'db' }, 500); } }
  if (req.method === 'GET') {
    const m = memberOf(req); let mc = false; if (m) { try { mc = await mustChange(m); } catch (e) {} }
    return J({ authed: authed(req), configured: authConfigured(), team: authed(req) || teamAuthed(req), teamConfigured: teamConfigured(), member: m ? { ...m, mustChange: mc } : null, membersConfigured: membersConfigured() });
  }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  const b = await readBody(req);
  if (b.member) {
    if (!membersConfigured()) return J({ error: 'members-not-configured', detail: 'Login per orang belum aktif — SPV perlu mengisi GX_MEMBER_DEFAULT_PASSWORD di Vercel.' }, 503);
    try {
      if (b.reset) { if (!authed(req)) return J({ error: 'spv-login-required' }, 401); const m = await findMember(b.reset); if (!m) return J({ error: 'not-found' }, 404); await resetPassword(m.name); return J({ ok: true }); }
      if (b.change) { const m = memberOf(req); if (!m) return J({ error: 'login-required', detail: 'Login dulu.' }, 401);
        const nw = String(b.change.new || ''); if (nw.length < 6) return J({ error: 'weak', detail: 'Password baru minimal 6 karakter.' }, 400);
        if (nw === defaultPw()) return J({ error: 'weak', detail: 'Pakai password yang berbeda dari password awal.' }, 400);
        const c = await checkPassword(m, String(b.change.old || '')); if (!c.ok) { await new Promise(r => setTimeout(r, 600)); return J({ error: 'wrong-password', detail: 'Password lama salah.' }, 401); }
        await setPassword(m, nw); return J({ ok: true }); }
      const m = await findMember(b.name); const c = m ? await checkPassword(m, String(b.password || '')) : { ok: false };
      if (!m || !c.ok) { await new Promise(r => setTimeout(r, 700)); return J({ error: 'wrong-password', detail: 'Nama lengkap atau password salah.' }, 401); }
      return J({ ok: true, member: { ...m, mustChange: c.mustChange } }, 200, memberCookie(m));
    } catch (e) { return J({ error: 'db', detail: 'Database belum tersambung.' }, 500); }
  }
  if (b.team) {
    res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
    if (!teamConfigured()) { res.statusCode = 503; return res.end(JSON.stringify({ error: 'team-not-configured' })); }
    if (teamPassOk(b.password)) { res.setHeader('set-cookie', teamCookie()); return res.end(JSON.stringify({ ok: true })); }
    await new Promise(r => setTimeout(r, 600));
    res.statusCode = 401; return res.end(JSON.stringify({ error: 'wrong-password' }));
  }
  const next = safeNext(b.next);
  if (passOk(b.password)) return redirect(res, next, sessionCookie());
  await new Promise(r => setTimeout(r, 600));   // perlambat tebak-tebakan password
  const [p, h] = next.split('#');
  return redirect(res, p + (p.includes('?') ? '&' : '?') + 'err=1' + (h ? '#' + h : ''));
}
