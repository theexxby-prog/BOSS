import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function leadsRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/leads
    if (method === 'GET' && !id) {
      const { limit, offset, page } = paginate(url);
      const conditions: string[] = [];
      const params: unknown[] = [];
      const filters: Record<string, string> = { campaign_id: 'l.campaign_id', client_id: 'l.client_id', status: 'l.status' };
      for (const [key, col] of Object.entries(filters)) {
        const val = url.searchParams.get(key);
        if (val) { conditions.push(`${col} = ?`); params.push(val); }
      }
      // QA queue: pending leads with icp_score between 70 and 89
      if (url.searchParams.get('qa_queue') === '1') {
        conditions.push(`l.status = 'pending' AND l.icp_score >= 70 AND l.icp_score < 90`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbAll(env.DB,
        `SELECT l.*, c.name as campaign_name, cl.name as client_name
         FROM leads l
         LEFT JOIN campaigns c ON l.campaign_id = c.id
         LEFT JOIN clients cl ON l.client_id = cl.id
         ${where} ORDER BY l.captured_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM leads l ${where}`, params)) ?? { count: 0 };
      return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
    }

    // GET /api/leads/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB,
        `SELECT l.*, c.name as campaign_name, cl.name as client_name
         FROM leads l
         LEFT JOIN campaigns c ON l.campaign_id = c.id
         LEFT JOIN clients cl ON l.client_id = cl.id
         WHERE l.id = ?`, [id]
      );
      if (!row) return jsonResponse({ success: false, error: 'Lead not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/leads — ingest a new lead
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { campaign_id, client_id, first_name, last_name, email, company, title } = body;
      if (!campaign_id || !client_id || !first_name || !last_name || !email || !company || !title) {
        return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
      }
      const result = await dbRun(env.DB,
        `INSERT INTO leads (campaign_id, client_id, first_name, last_name, email, phone, company, title,
          industry, company_size, revenue_range, tech_stack, country, state, asset_downloaded,
          consent_flag, icp_score, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaign_id, client_id, first_name, last_name, email,
          body.phone ?? null, company, title,
          body.industry ?? null, body.company_size ?? null, body.revenue_range ?? null,
          body.tech_stack ? JSON.stringify(body.tech_stack) : null,
          body.country ?? null, body.state ?? null, body.asset_downloaded ?? null,
          body.consent_flag ?? 1, body.icp_score ?? null,
          body.status ?? 'pending', body.source ?? 'api',
        ]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM leads WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/leads/:id — update status, score, enrichment etc.
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      const allowed = [
        'status', 'icp_score', 'rejection_reason', 'email_verified', 'enriched',
        'phone', 'industry', 'company_size', 'revenue_range', 'tech_stack',
        'country', 'state', 'asset_downloaded',
      ];
      for (const key of allowed) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      fields.push(`updated_at = datetime('now')`);
      values.push(id);
      await dbRun(env.DB, `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM leads WHERE id = ?', [id]);
      if (!updated) return jsonResponse({ success: false, error: 'Lead not found' }, 404, origin);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // DELETE /api/leads/:id
    if (method === 'DELETE' && id) {
      const existing = await dbFirst(env.DB, 'SELECT id FROM leads WHERE id = ?', [id]);
      if (!existing) return jsonResponse({ success: false, error: 'Lead not found' }, 404, origin);
      await dbRun(env.DB, 'DELETE FROM leads WHERE id = ?', [id]);
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
