import { endpoint, requireMethod, sameOrigin, readJson, json } from '../lib/http.js';
import { requireAdmin, passwordMatches, sessionToken, cookie } from '../lib/auth.js';
import { database } from '../lib/db.js';
import { consumeLimit, clientKey } from '../lib/store.js';
import { HttpError } from '../lib/validation.js';
export default endpoint(async (req, res) => {
  requireMethod(req, res, ['GET','POST','DELETE']);
  if (req.method === 'GET') { requireAdmin(req); return json(res, 200, { authenticated: true }); }
  sameOrigin(req);
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', cookie('', true)); return json(res, 200, { ok: true }); }
  const body = await readJson(req);
  await consumeLimit(database(), clientKey(req, 'login'), 10);
  if (!passwordMatches(body.password)) throw new HttpError(401, 'Incorrect password.');
  res.setHeader('Set-Cookie', cookie(sessionToken())); json(res, 200, { authenticated: true });
});
