import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function socialRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2] ? parseInt(segments[2]) : null;
  const method = request.method;

  try {
    // GET /api/social
    if (method === 'GET' && !id) {
      const { limit, offset, page } = paginate(url);
      const status = url.searchParams.get('status');
      const platform = url.searchParams.get('platform');
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status)   { conditions.push('status = ?'); params.push(status); }
      if (platform) { conditions.push('platform = ?'); params.push(platform); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbAll(env.DB,
        `SELECT * FROM social_posts ${where} ORDER BY scheduled_at DESC, created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM social_posts ${where}`, params)) ?? { count: 0 };
      return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
    }

    // GET /api/social/:id
    if (method === 'GET' && id) {
      const row = await dbFirst(env.DB, 'SELECT * FROM social_posts WHERE id = ?', [id]);
      if (!row) return jsonResponse({ success: false, error: 'Post not found' }, 404, origin);
      return jsonResponse({ success: true, data: row }, 200, origin);
    }

    // POST /api/social
    if (method === 'POST' && !id) {
      const body = await request.json() as Record<string, unknown>;
      const { platform, content } = body;
      if (!platform || !content) {
        return jsonResponse({ success: false, error: 'Missing required fields: platform, content' }, 400, origin);
      }
      const result = await dbRun(env.DB,
        `INSERT INTO social_posts (platform, content, status, scheduled_at, utm_campaign) VALUES (?, ?, ?, ?, ?)`,
        [platform, content, body.status ?? 'draft', body.scheduled_at ?? null, body.utm_campaign ?? null]
      );
      const created = await dbFirst(env.DB, 'SELECT * FROM social_posts WHERE id = ?', [result.lastRowId]);
      return jsonResponse({ success: true, data: created }, 201, origin);
    }

    // PUT /api/social/:id
    if (method === 'PUT' && id) {
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const key of ['content', 'status', 'scheduled_at', 'published_at', 'impressions', 'likes', 'comments', 'reposts', 'utm_campaign']) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
      fields.push(`updated_at = datetime('now')`);
      values.push(id);
      await dbRun(env.DB, `UPDATE social_posts SET ${fields.join(', ')} WHERE id = ?`, values);
      const updated = await dbFirst(env.DB, 'SELECT * FROM social_posts WHERE id = ?', [id]);
      return jsonResponse({ success: true, data: updated }, 200, origin);
    }

    // DELETE /api/social/:id
    if (method === 'DELETE' && id) {
      const existing = await dbFirst(env.DB, 'SELECT id FROM social_posts WHERE id = ?', [id]);
      if (!existing) return jsonResponse({ success: false, error: 'Post not found' }, 404, origin);
      await dbRun(env.DB, 'DELETE FROM social_posts WHERE id = ?', [id]);
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
