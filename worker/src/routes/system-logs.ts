import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';

export async function systemLogsRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/system-logs — all workflow statuses
    if (method === 'GET' && !id) {
      const rows = await dbAll<Record<string, unknown>>(env.DB, 'SELECT * FROM system_logs ORDER BY workflow_name ASC');
      // health summary: any failures in last 24h?
      const failedRecently = rows.filter((r: Record<string, unknown>) => r.last_status === 'failure');
      return jsonResponse({
        success: true,
        data: rows,
        health: {
          total: rows.length,
          healthy: rows.length - failedRecently.length,
          failing: failedRecently.length,
        },
      }, 200, origin);
    }

    // GET /api/system-logs/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB, 'SELECT * FROM system_logs WHERE id = ?', [id]);
      if (!row) return jsonResponse({ success: false, error: 'Log not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // PUT /api/system-logs/:id — n8n calls this to update workflow run stats
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const { last_status } = body;
      const fields: string[] = [`last_run_at = datetime('now')`, `updated_at = datetime('now')`];
      const values: unknown[] = [];

      if (last_status === 'success') {
        fields.push('runs = runs + 1', 'successes = successes + 1');
      } else if (last_status === 'failure') {
        fields.push('runs = runs + 1', 'failures = failures + 1');
      }
      if ('last_status' in body) { fields.push('last_status = ?'); values.push(body.last_status); }
      if ('last_error' in body)  { fields.push('last_error = ?'); values.push(body.last_error); }

      values.push(id);
      await dbRun(env.DB, `UPDATE system_logs SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM system_logs WHERE id = ?', [id]);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // POST /api/system-logs — register a new workflow
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { workflow_name } = body;
      if (!workflow_name) return jsonResponse({ success: false, error: 'Missing workflow_name' }, 400, origin);
      const result = await dbRun(env.DB,
        'INSERT INTO system_logs (workflow_name) VALUES (?)', [workflow_name]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM system_logs WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
