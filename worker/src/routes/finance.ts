import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, paginate } from '../db';

export async function financeRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname; // /api/finance/revenue | /api/finance/expenses | /api/finance/invoices | /api/finance/subscriptions
  const segments = path.split('/').filter(Boolean); // ['api', 'finance', 'resource', '{id?}']
  const resource = segments[2]; // 'revenue' | 'expenses' | 'invoices' | 'subscriptions'
  const id = segments[3] ? parseInt(segments[3]) : null;
  const method = request.method;

  try {
    // ── REVENUE ──────────────────────────────────────────────────────────────
    if (resource === 'revenue') {
      if (method === 'GET' && !id) {
        const { limit, offset, page } = paginate(url);
        const period = url.searchParams.get('period');
        const where = period ? 'WHERE r.period = ?' : '';
        const params = period ? [period] : [];
        const rows = await dbAll(env.DB,
          `SELECT r.*, c.name as client_name, camp.name as campaign_name
           FROM finance_revenue r
           LEFT JOIN clients c ON r.client_id = c.id
           LEFT JOIN campaigns camp ON r.campaign_id = camp.id
           ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const summary = await dbFirst<{ total: number; count: number }>(env.DB,
          `SELECT SUM(amount) as total, COUNT(*) as count FROM finance_revenue ${where}`, params
        );
        return jsonResponse({ success: true, data: rows, meta: { total: summary?.count ?? 0, page, limit, total_amount: summary?.total ?? 0 } }, 200, origin);
      }
      if (method === 'POST' && !id) {
        const body = await request.json() as Record<string, unknown>;
        const { client_id, amount, leads_count, cpl, period } = body;
        if (!client_id || !amount || !leads_count || !cpl || !period) {
          return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
        }
        const result = await dbRun(env.DB,
          `INSERT INTO finance_revenue (client_id, campaign_id, amount, leads_count, cpl, period, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [client_id, body.campaign_id ?? null, amount, leads_count, cpl, period, body.notes ?? null]
        );
        const created = await dbFirst(env.DB, 'SELECT * FROM finance_revenue WHERE id = ?', [result.lastRowId]);
        return jsonResponse({ success: true, data: created }, 201, origin);
      }
    }

    // ── EXPENSES ─────────────────────────────────────────────────────────────
    if (resource === 'expenses') {
      if (method === 'GET' && !id) {
        const { limit, offset, page } = paginate(url);
        const rows = await dbAll(env.DB, `SELECT * FROM finance_expenses ORDER BY date DESC LIMIT ? OFFSET ?`, [limit, offset]);
        const { count } = (await dbFirst<{ count: number }>(env.DB, 'SELECT COUNT(*) as count FROM finance_expenses')) ?? { count: 0 };
        return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
      }
      if (method === 'POST' && !id) {
        const body = await request.json() as Record<string, unknown>;
        const { category, description, amount, date } = body;
        if (!category || !description || !amount || !date) {
          return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
        }
        const result = await dbRun(env.DB,
          `INSERT INTO finance_expenses (category, description, amount, currency, date, recurring) VALUES (?, ?, ?, ?, ?, ?)`,
          [category, description, amount, body.currency ?? 'USD', date, body.recurring ?? 0]
        );
        const created = await dbFirst(env.DB, 'SELECT * FROM finance_expenses WHERE id = ?', [result.lastRowId]);
        return jsonResponse({ success: true, data: created }, 201, origin);
      }
      if (method === 'DELETE' && id) {
        await dbRun(env.DB, 'DELETE FROM finance_expenses WHERE id = ?', [id]);
        return jsonResponse({ success: true }, 200, origin);
      }
    }

    // ── INVOICES ─────────────────────────────────────────────────────────────
    if (resource === 'invoices') {
      if (method === 'GET' && !id) {
        const { limit, offset, page } = paginate(url);
        const status = url.searchParams.get('status');
        const where = status ? 'WHERE i.status = ?' : '';
        const params = status ? [status] : [];
        const rows = await dbAll(env.DB,
          `SELECT i.*, c.name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const { count } = (await dbFirst<{ count: number }>(env.DB, `SELECT COUNT(*) as count FROM invoices ${where}`, params)) ?? { count: 0 };
        return jsonResponse({ success: true, data: rows, meta: { total: count, page, limit } }, 200, origin);
      }
      if (method === 'GET' && id) {
        const row = await dbFirst(env.DB, 'SELECT i.*, c.name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?', [id]);
        if (!row) return jsonResponse({ success: false, error: 'Invoice not found' }, 404, origin);
        return jsonResponse({ success: true, data: row }, 200, origin);
      }
      if (method === 'POST' && !id) {
        const body = await request.json() as Record<string, unknown>;
        const { client_id, invoice_number, leads_count, cpl, total, due_date, period } = body;
        if (!client_id || !invoice_number || !leads_count || !cpl || !total) {
          return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
        }
        const result = await dbRun(env.DB,
          `INSERT INTO invoices (client_id, invoice_number, leads_count, cpl, total, status, due_date, period, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [client_id, invoice_number, leads_count, cpl, total, body.status ?? 'draft', due_date ?? null, period ?? null, body.notes ?? null]
        );
        const created = await dbFirst(env.DB, 'SELECT * FROM invoices WHERE id = ?', [result.lastRowId]);
        return jsonResponse({ success: true, data: created }, 201, origin);
      }
      if (method === 'PUT' && id) {
        const body = await request.json() as Record<string, unknown>;
        const fields: string[] = [];
        const values: unknown[] = [];
        for (const key of ['status', 'paid_date', 'due_date', 'notes']) {
          if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
        }
        if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
        fields.push(`updated_at = datetime('now')`);
        values.push(id);
        await dbRun(env.DB, `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, values);
        const updated = await dbFirst(env.DB, 'SELECT * FROM invoices WHERE id = ?', [id]);
        return jsonResponse({ success: true, data: updated }, 200, origin);
      }
    }

    // ── SUBSCRIPTIONS ────────────────────────────────────────────────────────
    if (resource === 'subscriptions') {
      if (method === 'GET' && !id) {
        const rows = await dbAll(env.DB, `SELECT * FROM subscriptions WHERE status = 'active' ORDER BY renewal_date ASC`);
        return jsonResponse({ success: true, data: rows }, 200, origin);
      }
      if (method === 'POST' && !id) {
        const body = await request.json() as Record<string, unknown>;
        const { name, category, cost, renewal_date } = body;
        if (!name || !category || cost === undefined || !renewal_date) {
          return jsonResponse({ success: false, error: 'Missing required fields' }, 400, origin);
        }
        const result = await dbRun(env.DB,
          `INSERT INTO subscriptions (name, category, cost, currency, billing_cycle, renewal_date, status, url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, category, cost, body.currency ?? 'USD', body.billing_cycle ?? 'monthly', renewal_date, body.status ?? 'active', body.url ?? null, body.notes ?? null]
        );
        const created = await dbFirst(env.DB, 'SELECT * FROM subscriptions WHERE id = ?', [result.lastRowId]);
        return jsonResponse({ success: true, data: created }, 201, origin);
      }
      if (method === 'PUT' && id) {
        const body = await request.json() as Record<string, unknown>;
        const fields: string[] = [];
        const values: unknown[] = [];
        for (const key of ['name', 'category', 'cost', 'currency', 'billing_cycle', 'renewal_date', 'status', 'url', 'notes']) {
          if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
        }
        if (!fields.length) return jsonResponse({ success: false, error: 'No fields to update' }, 400, origin);
        fields.push(`updated_at = datetime('now')`);
        values.push(id);
        await dbRun(env.DB, `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`, values);
        const updated = await dbFirst(env.DB, 'SELECT * FROM subscriptions WHERE id = ?', [id]);
        return jsonResponse({ success: true, data: updated }, 200, origin);
      }
      if (method === 'DELETE' && id) {
        await dbRun(env.DB, 'DELETE FROM subscriptions WHERE id = ?', [id]);
        return jsonResponse({ success: true }, 200, origin);
      }
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, origin);
  }
}
