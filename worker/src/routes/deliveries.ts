import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function deliveriesRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/deliveries
    if (method === 'GET' && !id) {
      const { limit, offset, page } = paginate(url);
      const conditions: string[] = [];
      const params: unknown[] = [];
      for (const [key, col] of Object.entries({ campaign_id: 'd.campaign_id', client_id: 'd.client_id', status: 'd.status' })) {
        const val = url.searchParams.get(key);
        if (val) { conditions.push(`${col} = ?`); params.push(val); }
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbAll(env.DB,
        `SELECT d.*, l.first_name, l.last_name, l.email, l.company, c.name as campaign_name, cl.name as client_name
         FROM deliveries d
         LEFT JOIN leads l ON d.lead_id = l.id
         LEFT JOIN campaigns c ON d.campaign_id = c.id
         LEFT JOIN clients cl ON d.client_id = cl.id
         ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM deliveries d ${where}`, params)) ?? { count: 0 };
      return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
    }

    // GET /api/deliveries/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB, 'SELECT * FROM deliveries WHERE id = ?', [id]);
      if (!row) return jsonResponse({ success: false, error: 'Delivery not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/deliveries — record a new delivery attempt
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { lead_id, campaign_id, client_id, method: deliveryMethod } = body;
      if (!lead_id || !campaign_id || !client_id || !deliveryMethod) {
        return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
      }
      const result = await dbRun(env.DB,
        `INSERT INTO deliveries (lead_id, campaign_id, client_id, method, status, response_code, response_body, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [lead_id, campaign_id, client_id, deliveryMethod, body.status ?? 'pending',
         body.response_code ?? null, body.response_body ?? null, body.delivered_at ?? null]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM deliveries WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/deliveries/:id — update status after client response
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const key of ['status', 'response_code', 'response_body', 'delivered_at']) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      values.push(id);
      await dbRun(env.DB, `UPDATE deliveries SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM deliveries WHERE id = ?', [id]);
      if (!updated) return jsonResponse({ success: false, error: 'Delivery not found' }, 404, origin);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
