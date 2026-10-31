import { createHash, createHmac } from 'node:crypto';
import { HttpError } from './validation.js';
export function clientKey(req, purpose) {
  const address = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown' : req.socket?.remoteAddress || 'local';
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET is not configured');
  return purpose + ':' + createHmac('sha256', process.env.SESSION_SECRET).update(String(address).split(',')[0].trim()).digest('hex');
}
export async function consumeLimit(sql, key, limit) {
  await sql`DELETE FROM emsit_rate_limits WHERE expires_at < now() - interval '1 day'`;
  const rows = await sql`INSERT INTO emsit_rate_limits (key, hits, expires_at) VALUES (${key}, 1, now() + interval '10 minutes')
    ON CONFLICT (key) DO UPDATE SET hits = CASE WHEN emsit_rate_limits.expires_at < now() THEN 1 ELSE emsit_rate_limits.hits + 1 END,
    expires_at = CASE WHEN emsit_rate_limits.expires_at < now() THEN now() + interval '10 minutes' ELSE emsit_rate_limits.expires_at END RETURNING hits`;
  if (rows[0].hits > limit) throw new HttpError(429, 'Too many attempts. Please try again in 10 minutes.');
}
export async function saveRequest(sql, value) {
  const hash = createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const rows = await sql`INSERT INTO emsit_requests (id,kind,first_name,last_name,email,company,role,message,preferred_date,preferred_time,timezone,payload_hash)
    VALUES (${value.id},${value.kind},${value.firstName},${value.lastName},${value.email},${value.company},${value.role},${value.message},${value.date},${value.time},${value.timezone},${hash})
    ON CONFLICT (id) DO NOTHING RETURNING id`;
  if (!rows.length) {
    const existing = await sql`SELECT payload_hash FROM emsit_requests WHERE id = ${value.id}`;
    if (existing[0]?.payload_hash !== hash) throw new HttpError(409, 'This request reference was already used. Refresh before sending a different request.');
  }
  return value.id;
}
export async function listRequests(sql, {kind, status, offset, search = ''}) {
  return sql`SELECT id,kind,first_name,last_name,email,company,role,message,preferred_date::text,preferred_time::text,timezone,status,created_at,updated_at
    FROM emsit_requests WHERE (${kind} = 'all' OR kind = ${kind}) AND (${status} = 'all' OR status = ${status})
    AND (${search} = '' OR strpos(lower(first_name || ' ' || last_name || ' ' || email || ' ' || company), lower(${search})) > 0)
    ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ${offset}`;
}
export async function requestSummary(sql) {
  const rows = await sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'new')::int AS new,
    count(*) FILTER (WHERE kind = 'booking' AND status IN ('new','contacted'))::int AS pending_calls,
    count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed FROM emsit_requests`;
  return rows[0];
}
export async function updateStatus(sql, id, status) {
  const rows = await sql`UPDATE emsit_requests SET status = ${status}, updated_at = now() WHERE id = ${id}
    AND (${status} <> 'confirmed' OR kind = 'booking') RETURNING id,status`;
  if (!rows.length) throw new HttpError(404, 'Request not found or status is not valid for this request.');
  return rows[0];
}
