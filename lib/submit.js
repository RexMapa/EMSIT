import { database } from './db.js';
import { endpoint, requireMethod, sameOrigin, readJson, json } from './http.js';
import { validateSubmission } from './validation.js';
import { clientKey, consumeLimit, saveRequest } from './store.js';
export function submissionEndpoint(kind, getDatabase = database) {
  return endpoint(async (req, res) => {
    requireMethod(req, res, ['POST']); sameOrigin(req);
    const body = await readJson(req);
    if (body.website) return json(res, 200, { ok: true });
    const value = validateSubmission(body, kind), sql = getDatabase();
    await consumeLimit(sql, clientKey(req, 'submit'), 10);
    const id = await saveRequest(sql, value);
    json(res, 201, { ok: true, id });
  });
}
