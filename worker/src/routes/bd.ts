import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';

export async function bdRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/bd — full pipeline, grouped by stage
    if (method === 'GET' && !id) {
      const stage = url.searchParams.get('stage');
      const where = stage ? 'WHERE stage = ?' : '';
      const params = stage ? [stage] : [];
      const rows = await dbAll(env.DB,
        `SELECT * FROM bd_pipeline ${where} ORDER BY next_action_date ASC, created_at DESC`,
        params
      );
      // pipeline summary: total value and count per stage
      const summary = await dbAll<{ stage: string; count: number; total_value: number }>(env.DB,
        `SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM bd_pipeline GROUP BY stage`
      );
      return jsonResponse({ success: true, data: rows, summary }, 200, origin);
    }

    // GET /api/bd/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB, 'SELECT * FROM bd_pipeline WHERE id = ?', [id]);
      if (!row) return jsonResponse({ success: false, error: 'Deal not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/bd
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { company, value } = body;
      if (!company) return jsonResponse({ success: false, error: 'Missing required field: company' }, 400, origin);
      const result = await dbRun(env.DB,
        `INSERT INTO bd_pipeline (company, stage, value, probability, contact_name, contact_title, contact_email, next_action, next_action_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company, body.stage ?? 'qualified', value ?? 0, body.probability ?? 50,
          body.contact_name ?? null, body.contact_title ?? null, body.contact_email ?? null,
          body.next_action ?? null, body.next_action_date ?? null, body.notes ?? null,
        ]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM bd_pipeline WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/bd/:id — move stage, update next action, etc.
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const key of ['company', 'stage', 'value', 'probability', 'contact_name', 'contact_title', 'contact_email', 'next_action', 'next_action_date', 'notes']) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      fields.push(`updated_at = datetime('now')`);
      values.push(id);
      await dbRun(env.DB, `UPDATE bd_pipeline SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM bd_pipeline WHERE id = ?', [id]);
      if (!updated) return jsonResponse({ success: false, error: 'Deal not found' }, 404, origin);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // DELETE /api/bd/:id
    if (method === 'DELETE' && id) {
      const existing = await dbFirst(env.DB, 'SELECT id FROM bd_pipeline WHERE id = ?', [id]);
      if (!existing) return jsonResponse({ success: false, error: 'Deal not found' }, 404, origin);
      await dbRun(env.DB, 'DELETE FROM bd_pipeline WHERE id = ?', [id]);
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
