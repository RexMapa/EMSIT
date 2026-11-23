import { endpoint, requireMethod, sameOrigin, readJson, json } from '../lib/http.js';
import { sessionToken, cookie } from '../lib/auth.js';
import { adminPasswordMatches, changeAdminPassword, readAdminPassword, requireStoredAdmin } from '../lib/admin-credentials.js';
import { database } from '../lib/db.js';
import { consumeLimit, clientKey } from '../lib/store.js';
import { HttpError } from '../lib/validation.js';
export function sessionEndpoint(getDatabase=database){return endpoint(async (req, res) => {
  requireMethod(req, res, ['GET','POST','PATCH','DELETE']);
  if (req.method === 'GET') { await requireStoredAdmin(req, getDatabase); return json(res, 200, { authenticated: true }); }
  sameOrigin(req);
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', cookie('', true)); return json(res, 200, { ok: true }); }
  const body = await readJson(req);
  if(!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length<16)throw new HttpError(503,'Admin setup incomplete: set ADMIN_PASSWORD to at least 16 characters, then restart or redeploy.');
  if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32)throw new HttpError(503,'Admin setup incomplete: set SESSION_SECRET to at least 32 characters, then restart or redeploy.');
  if(!process.env.DATABASE_URL)throw new HttpError(503,'Admin setup incomplete: set DATABASE_URL to your Neon connection string, then restart or redeploy.');
  let sql, passwordHash;
  try {
    sql = getDatabase();
    passwordHash = req.method === 'PATCH' ? await requireStoredAdmin(req, () => sql) : await readAdminPassword(sql);
    await consumeLimit(sql, clientKey(req, req.method === 'PATCH' ? 'password-change' : 'login'), 10);
  }
  catch(error){
    if(error instanceof HttpError)throw error;
    console.error('EMSIT login database failure:',error.code||error.name||'Error');
    if(error.code==='42P01')throw new HttpError(503,'Admin database setup incomplete: run database/schema.sql in your connected Neon database, then try again.');
    throw new HttpError(503,'Admin cannot connect to its database. Check DATABASE_URL and the Neon connection in the deployment logs.');
  }
  if (req.method === 'PATCH') {
    const updated = await changeAdminPassword(sql, body.currentPassword, body.newPassword, passwordHash);
    res.setHeader('Set-Cookie', cookie(sessionToken(Date.now(), updated)));
    return json(res, 200, { ok: true });
  }
  if (!await adminPasswordMatches(body.password, passwordHash)) throw new HttpError(401, 'Incorrect password.');
  res.setHeader('Set-Cookie', cookie(sessionToken(Date.now(), passwordHash))); json(res, 200, { authenticated: true });
});}
export default sessionEndpoint();
