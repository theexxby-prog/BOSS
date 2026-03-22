import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, touchUpdated } from '../db';
import type { Env, RouteHandler } from '../types';

export const assetsRouter: RouteHandler = async (request, env) => {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin');
  const parts  = url.pathname.replace('/api/assets', '').split('/').filter(Boolean);
  const id     = parts[0] ? parseInt(parts[0]) : null;

  if (request.method === 'GET' && !id) {
    const clientId = url.searchParams.get('client_id');
    const where    = clientId ? `WHERE client_id = ${parseInt(clientId)}` : '';
    const rows     = await dbAll(env.DB, `SELECT * FROM assets ${where} ORDER BY created_at DESC`);
    return jsonResponse({ success: true, data: rows }, 200, origin);
  }

  if (request.method === 'GET' && id) {
    const row = await dbFirst(env.DB, `SELECT * FROM assets WHERE id = ?`, [String(id)]);
    if (!row) return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
    return jsonResponse({ success: true, data: row }, 200, origin);
  }

  if (request.method === 'POST') {
    const b: any = await request.json();
    const result = await dbRun(env.DB,
      `INSERT INTO assets (client_id,name,type,description,file_url,thumbnail_url,status)
       VALUES (?,?,?,?,?,?,?)`,
      [b.client_id??null, b.name, b.type, b.description??null, b.file_url??null, b.thumbnail_url??null, b.status??'active']
    );
    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, origin);
  }

  if (request.method === 'PUT' && id) {
    const b: any = await request.json();
    await dbRun(env.DB,
      `UPDATE assets SET name=?,type=?,description=?,file_url=?,thumbnail_url=?,status=?,${touchUpdated()} WHERE id=?`,
      [b.name, b.type, b.description??null, b.file_url??null, b.thumbnail_url??null, b.status??'active', String(id)]
    );
    return jsonResponse({ success: true }, 200, origin);
  }

  if (request.method === 'DELETE' && id) {
    await dbRun(env.DB, `DELETE FROM assets WHERE id=?`, [String(id)]);
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
};
