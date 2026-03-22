import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function clientsRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean); // ['api', 'clients', '{id?}']
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/clients
    if (method === 'GET' && !id) {
      const { limit, offset, page } = paginate(url);
      const status = url.searchParams.get('status');
      const where = status ? 'WHERE status = ?' : '';
      const params = status ? [status, limit, offset] : [limit, offset];
      const rows = await dbAll(env.DB, `SELECT * FROM clients ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, params);
      const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM clients ${where}`, status ? [status] : [])) ?? { count: 0 };
      return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
    }

    // GET /api/clients/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB, 'SELECT * FROM clients WHERE id = ?', [id]);
      if (!row) return jsonResponse({ success: false, error: 'Client not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/clients
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { name, type, status = 'active', cpl, delivery_method, icp_spec, suppression_list, contract_details, contact_name, contact_email, contact_phone, notes } = body;
      if (!name || !type || !cpl || !delivery_method) {
        return jsonResponse({ success: false, error: 'Missing required fields: name, type, cpl, delivery_method' }, 400, origin);
      }
      const result = await dbRun(env.DB,
        `INSERT INTO clients (name, type, status, cpl, delivery_method, icp_spec, suppression_list, contract_details, contact_name, contact_email, contact_phone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, type, status, cpl, delivery_method, icp_spec ?? null, suppression_list ?? null, contract_details ?? null, contact_name ?? null, contact_email ?? null, contact_phone ?? null, notes ?? null]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM clients WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/clients/:id
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      const allowed = ['name', 'type', 'status', 'cpl', 'delivery_method', 'icp_spec', 'suppression_list', 'contract_details', 'contact_name', 'contact_email', 'contact_phone', 'notes'];
      for (const key of allowed) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      fields.push(`updated_at = datetime('now')`);
      values.push(id);
      await dbRun(env.DB, `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM clients WHERE id = ?', [id]);
      if (!updated) return jsonResponse({ success: false, error: 'Client not found' }, 404, origin);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // DELETE /api/clients/:id
    if (method === 'DELETE' && id) {
      const existing = await dbFirst(env.DB, 'SELECT id FROM clients WHERE id = ?', [id]);
      if (!existing) return jsonResponse({ success: false, error: 'Client not found' }, 404, origin);
      await dbRun(env.DB, 'DELETE FROM clients WHERE id = ?', [id]);
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
