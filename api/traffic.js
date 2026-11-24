import { requireStoredAdmin } from '../lib/admin-credentials.js';
import { database } from '../lib/db.js';
import { endpoint, json, readJson, requireMethod, sameOrigin } from '../lib/http.js';
import { clientKey, consumeLimit } from '../lib/store.js';
import { HttpError } from '../lib/validation.js';

const publicPages = new Set([
  '/', '/apply', '/contact', '/hiring', '/quotation',
  '/services/application-processing', '/services/bookkeeping',
  '/services/customer-service', '/services/data-entry',
  '/services/data-processing', '/services/email-management',
  '/services/inventory-management', '/services/invoicing-and-payments',
  '/services/medical-billing', '/services/practice-operations',
  '/services/product-listing', '/services/project-management',
  '/services/property-management', '/services/recruiting',
  '/services/virtual-assistant'
]);

export function trafficEndpoint(getDatabase = database) {
  return endpoint(async (req, res) => {
    requireMethod(req, res, ['GET', 'POST']);
    if (req.method === 'POST') {
      sameOrigin(req);
      const { path } = await readJson(req);
      if (!publicPages.has(path)) throw new HttpError(400, 'Unknown page.');
      const sql = getDatabase();
      await consumeLimit(sql, clientKey(req, 'page-view'), 120);
      await sql`INSERT INTO emsit_page_views (view_date, page_path)
        VALUES ((now() AT TIME ZONE 'UTC')::date, ${path})
        ON CONFLICT (view_date, page_path)
        DO UPDATE SET views = emsit_page_views.views + 1`;
      return json(res, 200, { ok: true });
    }

    await requireStoredAdmin(req, getDatabase);
    const sql = getDatabase();
    const rows = await sql`SELECT
      to_char((now() AT TIME ZONE 'UTC')::date - days.back, 'YYYY-MM-DD') AS day,
      traffic.page_path AS path, coalesce(traffic.views, 0)::text AS views
      FROM generate_series(6, 0, -1) AS days(back)
      LEFT JOIN emsit_page_views AS traffic
        ON traffic.view_date = (now() AT TIME ZONE 'UTC')::date - days.back
      ORDER BY day, path`;
    return json(res, 200, { rows });
  });
}

export default trafficEndpoint();
