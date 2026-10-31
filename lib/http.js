import { HttpError } from './validation.js';
export function json(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status; res.end(JSON.stringify(data));
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  const expectedProtocol = process.env.VERCEL ? 'https:' : 'http:';
  try {
    const url = new URL(origin);
    if (url.host !== req.headers.host || url.protocol !== expectedProtocol) throw new Error();
  } catch { throw new HttpError(403, 'Request origin is not allowed.'); }
}
export async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Use JSON for this request.');
  if (Number(req.headers['content-length'] || 0) > 16384) throw new HttpError(413, 'Request is too large.');
  let body = req.body;
  if (body === undefined) {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 16384) throw new HttpError(413, 'Request is too large.'); chunks.push(Buffer.from(chunk)); }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new HttpError(400, 'Invalid JSON.'); } }
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'Invalid request.');
  if (Buffer.byteLength(JSON.stringify(body)) > 16384) throw new HttpError(413, 'Request is too large.');
  return body;
}
export function endpoint(handler) {
  return async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      if (error.status) return json(res, error.status, { error: error.message });
      console.error('EMSIT API failure:', error.code || error.name || 'Error');
      json(res, 503, { error: 'Service temporarily unavailable. Please try again or email hello@emsit.com.' });
    }
  };
}
export function requireMethod(req, res, methods) {
  if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); throw new HttpError(405, 'Method not allowed.'); }
}
