// Login per orang untuk Dashboard Helpdesk / AM (Virtual Office, desk, status Break/Meeting).
// Username = nama lengkap di roster tim. Password awal TIDAK ditulis di kode: Vercel → Environment Variables →
// GX_MEMBER_DEFAULT_PASSWORD. Setelah ganti password, hash (scrypt + salt) disimpan di Supabase gx_docs 'member-auth'.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { envGet } from './_env.js';
import { cookies, MAX_AGE } from './_auth.js';
import { db } from './_store.js';

export const MEMBER_COOKIE = 'gx_member';
/* roster bawaan (sama dengan team.html) dipakai kalau roster tim belum pernah diubah */
export const DEF = { HD: ['Kadek Arisita Dhyana Putri', 'Gede Dimas Pery Narendra', 'Bayu Sukma Ramadhan', 'A.A Ngurah Kiyana Adhisa Oka Pertama', 'Nilma Syahrani'], AM: ['Ni Kadek Desi Mirayani', 'Aulia Sevi Diana', 'Devin Bagaskara'] };
const DEF_NICK = { 'Kadek Arisita Dhyana Putri': 'Sita', 'Gede Dimas Pery Narendra': 'Dimas', 'Bayu Sukma Ramadhan': 'Bayu', 'A.A Ngurah Kiyana Adhisa Oka Pertama': 'Oka', 'Nilma Syahrani': 'Rani', 'Ni Kadek Desi Mirayani': 'Desi', 'Aulia Sevi Diana': 'Sevia', 'Devin Bagaskara': 'Bagas' };
/* roster tim (nama lengkap + nickname) dari Supabase, atau bawaan kalau belum pernah diubah */
async function rosters() { const out = []; for (const team of ['HD', 'AM']) { const d = (await doc('team-board-' + team.toLowerCase())).data;
  (Array.isArray(d.roster) && d.roster.length ? d.roster.map(x => ({ name: x.name, nick: x.nick || DEF_NICK[x.name] || x.name.split(' ')[0] })) : DEF[team].map(n => ({ name: n, nick: DEF_NICK[n] || n.split(' ')[0] }))).forEach(m => out.push({ ...m, team })); } return out; }
export const nkey = n => String(n || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const secret = () => { const s = envGet('SUPABASE_SERVICE_ROLE_KEY') || envGet('GX_TEAM_PASSWORD') || envGet('GX_DASH_PASSWORD'); return s ? createHmac('sha256', 'gx-member-v1').update(s).digest() : null; };
export const defaultPw = () => envGet('GX_MEMBER_DEFAULT_PASSWORD') || '';
export const membersConfigured = () => !!(secret() && defaultPw());
const sign = s => createHmac('sha256', secret()).update(s).digest('base64url');
export function memberCookie(m) { const p = Buffer.from(JSON.stringify({ n: m.name, t: m.team, k: m.nick || '', x: Date.now() + MAX_AGE * 1000 })).toString('base64url'); return `${MEMBER_COOKIE}=${p}.${sign(p)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`; }
export const clearMemberCookie = () => `${MEMBER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
/* sesi orang yang sedang login → { name, team } atau null */
export function memberOf(req) {
  if (!secret()) return null; const c = cookies(req)[MEMBER_COOKIE]; if (!c || !c.includes('.')) return null;
  const [p, s] = c.split('.'); const a = Buffer.from(sign(p)), b = Buffer.from(String(s)); if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); return o && o.n && o.x > Date.now() ? { name: o.n, team: o.t, nick: o.k || String(o.n).split(' ')[0] } : null; } catch (e) { return null; }
}
async function doc(key) { const r = await db().from('gx_docs').select('data,revision').eq('key', key).maybeSingle(); if (r.error) throw r.error; return { data: (r.data && r.data.data) || {}, revision: r.data ? r.data.revision : null }; }
/* cari nama lengkap di roster HD / AM (huruf besar-kecil & spasi diabaikan) */
/* login pakai nickname (mis. "Sita"); nama lengkap juga diterima. Nickname kembar → wajib nama lengkap */
export async function findMember(name) {
  const k = nkey(name); if (!k) return null; const R = await rosters();
  const full = R.find(m => nkey(m.name) === k); if (full) return { name: full.name, team: full.team, nick: full.nick };
  const nk = R.filter(m => nkey(m.nick) === k); if (nk.length === 1) return { name: nk[0].name, team: nk[0].team, nick: nk[0].nick };
  if (nk.length > 1) return { ambiguous: true };
  return null;
}
export async function listMembers() { return rosters(); }
const hashPw = (pw, salt) => scryptSync(String(pw), salt, 32).toString('base64');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
export async function checkPassword(m, pw) {
  const u = ((await doc('member-auth')).data.users || {})[nkey(m.name)];
  if (u && u.hash) return { ok: same(hashPw(pw, u.salt), u.hash), mustChange: false };
  const d = defaultPw(); return { ok: !!d && same(pw, d), mustChange: true };
}
export async function mustChange(m) { const u = ((await doc('member-auth')).data.users || {})[nkey(m.name)]; return !(u && u.hash); }
async function saveUsers(fn) {
  for (let t = 0; t < 5; t++) { const { data, revision } = await doc('member-auth'); const D = { users: {}, ...data }; fn(D.users);
    const r = await db().rpc('gx_doc_save', { p_key: 'member-auth', p_data: D, p_revision: revision }); if (r.error) throw r.error; if (!r.data || !r.data.conflict) return true; }
  return false;
}
export async function setPassword(m, pw) { const salt = randomBytes(16).toString('base64'); return saveUsers(U => { U[nkey(m.name)] = { name: m.name, salt, hash: hashPw(pw, salt), changedAt: new Date().toISOString() }; }); }
export async function resetPassword(name) { return saveUsers(U => { delete U[nkey(name)]; }); }
