// /api/quiz — Quiz Knowledge Base ala Kahoot (sesi + leaderboard).
//   GET  /api/quiz?code=ABC123            → info sesi (soal hanya untuk SPV) — publik
//   GET  /api/quiz?code=ABC123&board=1    → leaderboard — publik
//   POST /api/quiz { join:{ code, player, token? } } → daftar ikut quiz, status 'pending' sampai di-approve SPV — publik
//   GET  /api/quiz?code=ABC123&me=TOKEN   → status peserta; bila approved → soal (TANPA kunci jawaban) — publik
//   POST /api/quiz { code, player, token, answers:[{ c, ms }] } → simpan hasil (wajib sudah di-approve), skor dihitung di server — publik
//   SPV (login dashboard):
//   GET  /api/quiz?list=1                 → daftar sesi + jumlah peserta
//   POST /api/quiz { create:{ title, set_key, timer_s, questions:[{ q, o, a, e, src }] } } → { code }
//   POST /api/quiz { close: code } / { reopen: code }
//   DELETE /api/quiz?code=ABC123          → hapus sesi + hasil
//   GET  /api/quiz?code=ABC123&joins=1    → daftar peserta + status approval
//   POST /api/quiz { approve:{ code, player } } / { reject:{ code, player } } / { approveAll: code } / { allowRetry:{ code, player } }
//   GET  /api/quiz?code=ABC123&results=1  → hasil + jawaban tiap peserta untuk review SPV
// Approval disimpan di gx_docs (key quiz-join-<pin>) → tidak perlu tabel baru.
import { randomInt, randomUUID } from 'node:crypto';
import { AppError, configured, db, dbError } from './_store.js';
import { authed } from './_auth.js';

const json = (res, obj, status = 200) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
const must = ({ data, error }) => { if (error) throw dbError(error); return data; };
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const okCode = c => typeof c === 'string' && /^[A-Z0-9]{5,8}$/.test(c);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let buf;
  if (req.body != null) buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));
  else { const c = []; for await (const x of req) c.push(Buffer.isBuffer(x) ? x : Buffer.from(x)); buf = Buffer.concat(c); }
  if (buf.length > 1024 * 1024) throw new AppError('too-large', 413, 'Data terlalu besar.');
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new AppError('bad-payload', 400, 'JSON tidak valid.'); }
}
function cleanQuestions(a) {
  return (Array.isArray(a) ? a : []).slice(0, 80).map(x => {
    const o = (Array.isArray(x && x.o) ? x.o : []).slice(0, 6).map(v => str(v, 300));
    return { q: str(x.q, 500), o, a: Number.isInteger(x.a) && x.a >= 0 && x.a < o.length ? x.a : -1, e: str(x.e, 800), src: str(x.src, 200) };
  }).filter(x => x.q && x.o.length >= 2 && x.a >= 0);
}
/* poin ala Kahoot: benar = 500–1000 tergantung kecepatan; salah / habis waktu = 0 */
const points = (ok, ms, timer) => ok ? Math.round(1000 * (1 - Math.min(1, Math.max(0, ms) / (timer * 1000)) / 2)) : 0;
/* ---------- approval peserta (gx_docs: quiz-join-<pin>) ---------- */
const joinKey = c => 'quiz-join-' + c.toLowerCase();
const nkey = n => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
async function getJoin(c) { const row = must(await db().from('gx_docs').select('data,revision').eq('key', joinKey(c)).maybeSingle()); return { data: (row && row.data && row.data.players) ? row.data : { players: {} }, revision: row ? row.revision : null }; }
async function mutateJoin(c, fn) {   // baca → ubah → simpan dengan cek revisi (ulang bila bentrok dengan peserta lain)
  for (let t = 0; t < 6; t++) {
    const cur = await getJoin(c); const out = fn(cur.data); if (out && out.abort) return out;
    const r = must(await db().rpc('gx_doc_save', { p_key: joinKey(c), p_data: cur.data, p_revision: cur.revision }));
    if (!r || !r.conflict) return out || {};
  }
  throw new AppError('busy', 503, 'Server sibuk, coba lagi.');
}
const pubQ = s => (s.questions || []).map(x => ({ q: x.q, o: x.o }));
const board = async code => must(await db().from('gx_quiz_results').select('player,score,correct,total,duration_ms,created_at').eq('code', code).order('score', { ascending: false }).order('duration_ms', { ascending: true }).limit(200)) || [];

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    if (!configured()) return json(res, { error: 'storage-not-configured' }, 501);
    const code = str(q.get('code'), 8).toUpperCase();

    if (req.method === 'GET' && code) {
      if (!okCode(code)) return json(res, { error: 'bad-code' }, 400);
      if (q.get('board')) return json(res, { board: await board(code) });
      const s = must(await db().from('gx_quiz_sessions').select('code,title,set_key,timer_s,questions,status,created_at').eq('code', code).maybeSingle());
      if (!s) return json(res, { error: 'not-found' }, 404);
      const info = { code: s.code, title: s.title, set_key: s.set_key, timer_s: s.timer_s, status: s.status, created_at: s.created_at, n: (s.questions || []).length };
      if (q.get('me')) {   // peserta cek status approval
        const tok = str(q.get('me'), 60), J = (await getJoin(code)).data;
        const p = Object.values(J.players).find(x => x.token === tok);
        if (!p) return json(res, { error: 'not-joined' }, 404);
        return json(res, { status: p.status, player: p.name, session: p.status === 'approved' ? { ...info, questions: pubQ(s) } : info });
      }
      if (q.get('joins') || q.get('results')) {
        if (!authed(req)) return json(res, { error: 'login-required' }, 401);
        if (q.get('joins')) { const J = (await getJoin(code)).data; return json(res, { players: Object.values(J.players).map(({ token, ...x }) => x).sort((a, b) => String(a.at).localeCompare(String(b.at))) }); }
        const R = must(await db().from('gx_quiz_results').select('player,score,correct,total,duration_ms,answers,created_at').eq('code', code).order('score', { ascending: false }).order('duration_ms', { ascending: true }).limit(200)) || [];
        return json(res, { questions: s.questions || [], timer_s: s.timer_s, results: R });
      }
      return json(res, { session: authed(req) ? { ...info, questions: pubQ(s) } : info });
    }

    if (req.method === 'POST') {
      const b = await readJson(req);
      /* ---------- peserta daftar → menunggu approval SPV ---------- */
      if (b.join && typeof b.join === 'object') {
        const c = str(b.join.code, 8).toUpperCase(); if (!okCode(c)) return json(res, { error: 'bad-code' }, 400);
        const player = str(b.join.player, 40).replace(/\s+/g, ' ').trim(); if (player.length < 2) return json(res, { error: 'bad-name', detail: 'Nama minimal 2 huruf.' }, 400);
        const s = must(await db().from('gx_quiz_sessions').select('code,status').eq('code', c).maybeSingle());
        if (!s) return json(res, { error: 'not-found' }, 404);
        if (s.status !== 'open') return json(res, { error: 'closed', detail: 'Sesi quiz sudah ditutup.' }, 409);
        const done = must(await db().from('gx_quiz_results').select('player').eq('code', c).ilike('player', player.replace(/[%_]/g, '\\$&')).limit(1)) || [];
        if (done.length) return json(res, { error: 'name-taken', detail: 'Nama ini sudah menyelesaikan quiz di sesi ini — pakai nama lain.' }, 409);
        const tok0 = str(b.join.token, 60);
        const out = await mutateJoin(c, J => {
          const k = nkey(player), p = J.players[k];
          if (p && p.token === tok0 && tok0) return { abort: true, status: p.status, token: p.token, player: p.name };
          if (p && p.status !== 'rejected') return { abort: true, error: 'name-taken' };
          const np = { name: player, token: randomUUID(), status: 'pending', at: new Date().toISOString() };
          J.players[k] = np; return { status: np.status, token: np.token, player: np.name };
        });
        if (out.error) return json(res, { error: 'name-taken', detail: 'Nama ini sudah dipakai peserta lain di sesi ini — pakai nama lain.' }, 409);
        return json(res, { status: out.status, token: out.token, player: out.player });
      }
      /* ---------- pemain kirim jawaban (wajib sudah di-approve SPV) ---------- */
      if (b.code && b.player != null && Array.isArray(b.answers)) {
        const c = str(b.code, 8).toUpperCase(); if (!okCode(c)) return json(res, { error: 'bad-code' }, 400);
        const s = must(await db().from('gx_quiz_sessions').select('*').eq('code', c).maybeSingle());
        if (!s) return json(res, { error: 'not-found' }, 404);
        if (s.status !== 'open') return json(res, { error: 'closed', detail: 'Sesi quiz sudah ditutup.' }, 409);
        const tok = str(b.token, 60), J = (await getJoin(c)).data, me = Object.values(J.players).find(x => x.token === tok);
        if (!me || me.status !== 'approved') return json(res, { error: 'not-approved', detail: 'Belum di-approve SPV.' }, 403);
        const player = me.name;
        const Q = s.questions || [];
        const ans = Q.map((x, i) => { const a = b.answers[i] || {}; const ch = Number.isInteger(a.c) && a.c >= 0 && a.c < x.o.length ? a.c : null; const ms = Math.max(0, Math.min(s.timer_s * 1000, Math.round(+a.ms || s.timer_s * 1000))); return { c: ch, ms, p: points(ch === x.a, ms, s.timer_s) }; });
        const row = { code: c, player, score: ans.reduce((t, a) => t + a.p, 0), correct: ans.filter((a, i) => a.c === Q[i].a).length, total: Q.length, duration_ms: ans.reduce((t, a) => t + a.ms, 0), answers: ans };
        const r = await db().from('gx_quiz_results').insert(row).select('id').single();
        if (r.error) { if (r.error.code === '23505') return json(res, { error: 'name-taken', detail: 'Nama ini sudah dipakai di sesi ini — pakai nama lain.' }, 409); throw dbError(r.error); }
        await mutateJoin(c, J2 => { const p = J2.players[nkey(player)]; if (p) { p.status = 'done'; p.doneAt = new Date().toISOString(); } });
        const B = await board(c);
        return json(res, { result: row, rank: B.findIndex(x => x.player.toLowerCase() === player.toLowerCase()) + 1, players: B.length, review: Q.map((x, i) => ({ ...x, c: ans[i].c, p: ans[i].p, ms: ans[i].ms })) });
      }
      if (!authed(req)) return json(res, { error: 'login-required' }, 401);
      if (b.create) {
        const questions = cleanQuestions(b.create.questions);
        if (!questions.length) return json(res, { error: 'no-questions', detail: 'Belum ada soal di set ini.' }, 400);
        const timer = Math.max(5, Math.min(120, Math.round(+b.create.timer_s || 20)));
        for (let t = 0; t < 5; t++) {
          const nc = Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join('');
          const r = await db().from('gx_quiz_sessions').insert({ code: nc, title: str(b.create.title, 120), set_key: str(b.create.set_key, 40), timer_s: timer, questions }).select('code').single();
          if (!r.error) return json(res, { code: nc });
          if (r.error.code !== '23505') throw dbError(r.error);
        }
        return json(res, { error: 'code-collision' }, 500);
      }
      if (b.approve || b.reject || b.approveAll || b.allowRetry) {
        const o = b.approveAll ? { code: b.approveAll } : (b.approve || b.reject || b.allowRetry);
        const c = str(o.code, 8).toUpperCase(); if (!okCode(c)) return json(res, { error: 'bad-code' }, 400);
        const k = nkey(o.player), now = new Date().toISOString();
        if (b.allowRetry) must(await db().from('gx_quiz_results').delete().eq('code', c).ilike('player', String(o.player || '').replace(/[%_]/g, '\\$&')));
        await mutateJoin(c, J => {
          if (b.approveAll) { for (const p of Object.values(J.players)) if (p.status === 'pending') { p.status = 'approved'; p.decidedAt = now; } return; }
          const p = J.players[k]; if (!p) return;
          p.status = b.reject ? 'rejected' : 'approved'; p.decidedAt = now;
          if (b.allowRetry) { p.token = randomUUID(); p.status = 'rejected'; p.retry = true; }   // token lama hangus; peserta daftar ulang & di-approve lagi
        });
        return json(res, { ok: true });
      }
      if (b.close || b.reopen) {
        const c = str(b.close || b.reopen, 8).toUpperCase(); if (!okCode(c)) return json(res, { error: 'bad-code' }, 400);
        must(await db().from('gx_quiz_sessions').update({ status: b.close ? 'closed' : 'open' }).eq('code', c));
        return json(res, { ok: true });
      }
      return json(res, { error: 'bad-payload' }, 400);
    }

    if (!authed(req)) return json(res, { error: 'login-required' }, 401);
    if (req.method === 'GET' && q.get('list')) {
      const S = must(await db().from('gx_quiz_sessions').select('code,title,set_key,timer_s,status,created_at,questions').order('created_at', { ascending: false }).limit(100)) || [];
      const R = must(await db().from('gx_quiz_results').select('code').in('code', S.map(s => s.code).concat(['-']))) || [];
      return json(res, { sessions: S.map(s => ({ code: s.code, title: s.title, set_key: s.set_key, timer_s: s.timer_s, status: s.status, created_at: s.created_at, n: (s.questions || []).length, players: R.filter(r => r.code === s.code).length })) });
    }
    if (req.method === 'DELETE' && code) {
      if (!okCode(code)) return json(res, { error: 'bad-code' }, 400);
      must(await db().from('gx_quiz_sessions').delete().eq('code', code));
      await db().from('gx_docs').delete().eq('key', joinKey(code));
      return json(res, { ok: true });
    }
    return json(res, { error: 'method' }, 405);
  } catch (e) {
    const err = e instanceof AppError ? e : dbError(e);
    return json(res, { error: err.code || 'error', detail: err.detail || String(e.message || e) }, err.status || 500);
  }
}
