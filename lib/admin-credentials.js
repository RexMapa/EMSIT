import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { adminToken, passwordMatches, requireAdmin } from './auth.js';
import { HttpError } from './validation.js';

const derive = promisify(scrypt);

export async function readAdminPassword(sql) {
  const rows = await sql`SELECT password_hash FROM emsit_admin_credentials WHERE id = 1`;
  return rows[0]?.password_hash ?? null;
}

export async function requireStoredAdmin(req, getDatabase) {
  const token = adminToken(req);
  if (!/^\d+\.[A-Za-z0-9_-]{43}$/.test(token ?? '')) throw new HttpError(401, 'Please sign in.');
  const passwordHash = await readAdminPassword(getDatabase());
  requireAdmin(req, passwordHash);
  return passwordHash;
}

export async function adminPasswordMatches(value, passwordHash) {
  if (typeof value !== 'string' || value.length > 256) return false;
  if (passwordHash === null) return passwordMatches(value);
  const [salt, key] = passwordHash.split(':');
  const expected = Buffer.from(key, 'hex');
  const derived = await derive(value, salt, expected.length);
  return timingSafeEqual(derived, expected);
}

export async function changeAdminPassword(sql, current, next, passwordHash) {
  if (typeof next !== 'string' || next.length < 16 || next.length > 256) {
    throw new HttpError(400, 'Use 16 to 256 characters for the new password.');
  }
  if (!await adminPasswordMatches(current, passwordHash)) throw new HttpError(400, 'Incorrect current password.');
  if (current === next) throw new HttpError(400, 'Choose a password different from your current one.');

  const salt = randomBytes(16).toString('hex');
  const derived = await derive(next, salt, 64);
  const updatedHash = salt + ':' + derived.toString('hex');
  const rows = passwordHash === null
    ? await sql`INSERT INTO emsit_admin_credentials (id, password_hash) VALUES (1, ${updatedHash})
        ON CONFLICT (id) DO NOTHING RETURNING id`
    : await sql`UPDATE emsit_admin_credentials SET password_hash = ${updatedHash}
        WHERE id = 1 AND password_hash = ${passwordHash} RETURNING id`;
  if (!rows.length) throw new HttpError(409, 'The password changed in another session. Sign in again.');
  return updatedHash;
}
