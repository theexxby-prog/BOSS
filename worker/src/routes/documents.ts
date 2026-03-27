import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';
import type { Env, RouteHandler } from '../types';

export const documentsRouter: RouteHandler = async (request, env) => {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin');
  const parts  = url.pathname.replace('/api/documents', '').split('/').filter(Boolean);
  const id     = parts[0] ? parseInt(parts[0]) : null;

  if (request.method === 'GET' && !id) {
    const type     = url.searchParams.get('type');
    const clientId = url.searchParams.get('client_id');
    const conds:  string[] = [];
    const params: string[] = [];
    if (type)     { conds.push('type = ?');      params.push(type); }
    if (clientId) { conds.push('client_id = ?'); params.push(clientId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows  = await dbAll(env.DB, `SELECT * FROM documents ${where} ORDER BY created_at DESC`, params);
    return jsonResponse({ success: true, data: rows }, 200, origin);
  }

  if (request.method === 'GET' && id) {
    const row = await dbFirst(env.DB, `SELECT * FROM documents WHERE id = ?`, [String(id)]);
    if (!row) return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
    return jsonResponse({ success: true, data: row }, 200, origin);
  }

  if (request.method === 'POST') {
    const b: any = await request.json();
    const result = await dbRun(env.DB,
      `INSERT INTO documents (client_id, campaign_id, type, title, status, content, file_url, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.client_id ?? null, b.campaign_id ?? null, b.type, b.title,
       b.status ?? 'draft', b.content ?? null, b.file_url ?? null, b.due_date ?? null]
    );
    return jsonResponse({ success: true, id: result.lastRowId }, 201, origin);
  }

  if (request.method === 'PUT' && id) {
    const b: any = await request.json();
    await dbRun(env.DB,
      `UPDATE documents
       SET title=?, status=?, content=?, file_url=?, due_date=?, signed_at=?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [b.title, b.status ?? 'draft', b.content ?? null, b.file_url ?? null,
       b.due_date ?? null, b.signed_at ?? null, String(id)]
    );
    return jsonResponse({ success: true }, 200, origin);
  }

  if (request.method === 'DELETE' && id) {
    await dbRun(env.DB, `DELETE FROM documents WHERE id = ?`, [String(id)]);
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
};
