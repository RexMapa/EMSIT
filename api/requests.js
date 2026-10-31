import { endpoint, requireMethod, sameOrigin, readJson, json } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { database } from '../lib/db.js';
import { listRequests, updateStatus, requestSummary } from '../lib/store.js';
import { HttpError, uuid } from '../lib/validation.js';
export default endpoint(async (req, res) => {
  requireMethod(req, res, ['GET','PATCH']); requireAdmin(req);
  if (req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const kind = params.get('kind') || 'all', status = params.get('status') || 'all', offset = Number(params.get('offset') || 0);
    if (!['all','message','booking'].includes(kind) || !['all','new','contacted','confirmed','closed'].includes(status) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw new HttpError(400, 'Invalid filters.');
    const search = (params.get('search') || '').trim();
    if(search.length > 160) throw new HttpError(400, 'Search is too long.');
    const sql=database();
    const [rows,summary] = await Promise.all([listRequests(sql, {kind,status,offset,search}),requestSummary(sql)]);
    return json(res, 200, {items: rows.slice(0,50),hasMore: rows.length > 50,summary});
  }
  sameOrigin(req); const body = await readJson(req);
  if (!uuid.test(body.id || '') || !['new','contacted','confirmed','closed'].includes(body.status)) throw new HttpError(400, 'Invalid status update.');
  const sql=database(), result=await updateStatus(sql, body.id, body.status);
  json(res, 200, {...result,summary:await requestSummary(sql)});
});
