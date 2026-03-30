import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function campaignsRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/campaigns
    if (method === 'GET' && !id) {
      const { limit, offset, page } = paginate(url);
      const clientId = url.searchParams.get('client_id');
      const status = url.searchParams.get('status');
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (clientId) { conditions.push('c.client_id = ?'); params.push(clientId); }
      if (status)   { conditions.push('c.status = ?'); params.push(status); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbAll(env.DB,
        `SELECT c.*, cl.name as client_name FROM campaigns c
         LEFT JOIN clients cl ON c.client_id = cl.id
         ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM campaigns c ${where}`, params)) ?? { count: 0 };
      return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
    }

    // GET /api/campaigns/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB,
        `SELECT c.*, cl.name as client_name FROM campaigns c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?`, [id]
      );
      if (!row) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/campaigns
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { client_id, name, status = 'draft', target = 0, cpl, asset_name, asset_url, start_date, end_date, notes,
              tal, suppression_list, custom_questions, brand_color, brand_color_secondary, brand_accent, logo_url,
              geo, industries, titles, company_sizes } = body as any;
      if (!client_id || !name || !cpl) {
        return jsonResponse({ success: false, error: 'Missing required fields: client_id, name, cpl' }, 400, origin);
      }
      const result = await dbRun(env.DB,
        `INSERT INTO campaigns (client_id, name, status, target, cpl, asset_name, asset_url, start_date, end_date, notes,
         tal, suppression_list, custom_questions, brand_color, brand_color_secondary, brand_accent, logo_url,
         geo, industries, titles, company_sizes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [client_id, name, status, target, cpl, asset_name ?? null, asset_url ?? null, start_date ?? null, end_date ?? null, notes ?? null,
         tal ? JSON.stringify(tal) : null, suppression_list ? JSON.stringify(suppression_list) : null,
         custom_questions ? JSON.stringify(custom_questions) : null,
         brand_color ?? '#2563eb', brand_color_secondary ?? '#1e40af', brand_accent ?? '#3b82f6', logo_url ?? null,
         geo ? JSON.stringify(geo) : null, industries ? JSON.stringify(industries) : null,
         titles ? JSON.stringify(titles) : null, company_sizes ? JSON.stringify(company_sizes) : null]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM campaigns WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/campaigns/:id
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      const allowed = ['name', 'status', 'target', 'delivered', 'accepted', 'rejected', 'cpl', 'asset_name', 'asset_url', 'start_date', 'end_date', 'notes',
        'tal', 'suppression_list', 'custom_questions', 'brand_color', 'brand_color_secondary', 'brand_accent', 'logo_url',
        'geo', 'industries', 'titles', 'company_sizes', 'email_sequences'];
      const jsonFields = ['tal', 'suppression_list', 'custom_questions', 'geo', 'industries', 'titles', 'company_sizes', 'email_sequences'];
      for (const key of allowed) {
        if (key in body) {
          fields.push(`${key} = ?`);
          values.push(jsonFields.includes(key) && typeof body[key] === 'object' ? JSON.stringify(body[key]) : body[key]);
        }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      fields.push(`updated_at = datetime('now')`);
      values.push(id);
      await dbRun(env.DB, `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM campaigns WHERE id = ?', [id]);
      if (!updated) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // DELETE /api/campaigns/:id
    if (method === 'DELETE' && id) {
      const existing = await dbFirst(env.DB, 'SELECT id FROM campaigns WHERE id = ?', [id]);
      if (!existing) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);
      await dbRun(env.DB, 'DELETE FROM campaigns WHERE id = ?', [id]);
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
