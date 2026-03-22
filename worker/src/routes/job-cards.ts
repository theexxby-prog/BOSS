import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun, touchUpdated } from '../db';
import type { Env, RouteHandler } from '../types';

export const jobCardsRouter: RouteHandler = async (request, env) => {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin');
  const parts  = url.pathname.replace('/api/job-cards', '').split('/').filter(Boolean);
  const id     = parts[0] ? parseInt(parts[0]) : null;

  if (request.method === 'GET' && !id) {
    const clientId = url.searchParams.get('client_id');
    const where    = clientId ? `WHERE client_id=${parseInt(clientId)}` : '';
    const rows     = await dbAll(env.DB, `SELECT * FROM job_cards ${where} ORDER BY created_at DESC`);
    return jsonResponse({ success: true, data: rows }, 200, origin);
  }

  if (request.method === 'GET' && id) {
    const row = await dbFirst(env.DB, `SELECT * FROM job_cards WHERE id=?`, [String(id)]);
    if (!row) return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
    return jsonResponse({ success: true, data: row }, 200, origin);
  }

  if (request.method === 'POST') {
    const b: any = await request.json();
    const result = await dbRun(env.DB,
      `INSERT INTO job_cards (campaign_id,client_id,title,target_leads,cpl,asset_name,icp_summary,delivery_method,start_date,end_date,status,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.campaign_id??null, b.client_id??null, b.title, b.target_leads??0, b.cpl??0,
       b.asset_name??null, b.icp_summary??null, b.delivery_method??null,
       b.start_date??null, b.end_date??null, b.status??'draft', b.notes??null]
    );
    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, origin);
  }

  if (request.method === 'PUT' && id) {
    const b: any = await request.json();
    await dbRun(env.DB,
      `UPDATE job_cards SET title=?,target_leads=?,cpl=?,asset_name=?,icp_summary=?,delivery_method=?,start_date=?,end_date=?,status=?,notes=?,${touchUpdated()} WHERE id=?`,
      [b.title, b.target_leads??0, b.cpl??0, b.asset_name??null, b.icp_summary??null,
       b.delivery_method??null, b.start_date??null, b.end_date??null,
       b.status??'draft', b.notes??null, String(id)]
    );
    return jsonResponse({ success: true }, 200, origin);
  }

  if (request.method === 'DELETE' && id) {
    await dbRun(env.DB, `DELETE FROM job_cards WHERE id=?`, [String(id)]);
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
};
