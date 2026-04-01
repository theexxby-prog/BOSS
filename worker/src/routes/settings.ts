import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';
import type { RouteHandler } from '../types';

export const settingsRouter: RouteHandler = async (request, env) => {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin');
  const parts  = url.pathname.replace('/api/settings', '').split('/').filter(Boolean);
  const key    = parts[0] ?? null;

  if (request.method === 'GET' && !key) {
    const rows = await dbAll(env.DB, `SELECT * FROM settings ORDER BY key`);
    // Mask API key values in response
    const safe = (rows as any[]).map(r => ({
      ...r,
      value: r.key.includes('api_key') && r.value ? '••••••••' : r.value
    }));
    return jsonResponse({ success: true, data: safe }, 200, origin);
  }

  if (request.method === 'GET' && key) {
    const row = await dbFirst(env.DB, `SELECT * FROM settings WHERE key=?`, [key]);
    if (!row) return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
    return jsonResponse({ success: true, data: row }, 200, origin);
  }

  if (request.method === 'PUT') {
    const b: any = await request.json();
    // Batch update: body is { key: value, key: value }
    for (const [k, v] of Object.entries(b)) {
      await dbRun(env.DB,
        `UPDATE settings SET value=?, updated_at=datetime('now') WHERE key=?`,
        [String(v), k]
      );
    }
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
};
