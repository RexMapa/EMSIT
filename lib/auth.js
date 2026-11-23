import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from './validation.js';
const lifetime = 8 * 60 * 60;
export function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16) throw new Error('Admin credentials are not configured');
  return process.env.SESSION_SECRET;
}
function sign(value, passwordHash) { return createHmac('sha256', secret()).update(value + ':' + process.env.ADMIN_PASSWORD + (passwordHash ? ':' + passwordHash : '')).digest('base64url'); }
export function passwordMatches(value) {
  secret();
  if (typeof value !== 'string' || value.length > 256) return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(process.env.ADMIN_PASSWORD).digest());
}
export function sessionToken(now = Date.now(), passwordHash = null) { const exp = String(Math.floor(now / 1000) + lifetime); return exp + '.' + sign(exp, passwordHash); }
export function validToken(token, now = Date.now(), passwordHash = null) {
  if (typeof token !== 'string' || token.length > 100) return false;
  const [exp, signature, extra] = token.split('.');
  if (extra || !/^\d+$/.test(exp) || Number(exp) <= now / 1000 || Number(exp) > now / 1000 + lifetime + 5 || !signature) return false;
  const expected = sign(exp, passwordHash); const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function adminToken(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('emsit_admin='))?.slice(12);
}
export function requireAdmin(req, passwordHash = null) {
  if (!validToken(adminToken(req), Date.now(), passwordHash)) throw new HttpError(401, 'Please sign in.');
}
export function cookie(token, clear = false) { return `emsit_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : lifetime}${process.env.VERCEL ? '; Secure' : ''}`; }
