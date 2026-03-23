import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';
import type { Env, RouteHandler } from '../types';

export const pagesRouter: RouteHandler = async (request, env) => {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin');
  const parts  = url.pathname.replace('/api/pages', '').split('/').filter(Boolean);
  const id     = parts[0] ? parseInt(parts[0]) : null;

  if (request.method === 'GET' && !id) {
    const rows = await dbAll(env.DB, `SELECT * FROM landing_pages ORDER BY created_at DESC`);
    return jsonResponse({ success: true, data: rows }, 200, origin);
  }

  if (request.method === 'GET' && id) {
    const row = await dbFirst(env.DB, `SELECT * FROM landing_pages WHERE id=?`, [String(id)]);
    if (!row) return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
    return jsonResponse({ success: true, data: row }, 200, origin);
  }

  // Public form submission webhook — POST /api/pages/:slug/submit
  if (request.method === 'POST' && parts[1] === 'submit') {
    const slug = parts[0];
    const page = await dbFirst(env.DB, `SELECT * FROM landing_pages WHERE slug=? AND status='active'`, [slug]);
    if (!page) return jsonResponse({ success: false, error: 'Page not found or inactive' }, 404, origin);

    const body: any = await request.json();
    const p = page as any;

    // Increment submission count
    await dbRun(env.DB, `UPDATE landing_pages SET submissions=submissions+1, updated_at=datetime('now') WHERE id=?`, [String(p.id)]);

    // Insert lead with custom answers
    await dbRun(env.DB,
      `INSERT INTO leads (campaign_id,client_id,first_name,last_name,email,phone,company,title,industry,company_size,country,asset_downloaded,consent_flag,status,source,custom_answers)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'pending','landing_page',?)`,
      [String(p.campaign_id), String(p.client_id), body.first_name??'', body.last_name??'',
       body.email??'', body.phone??null, body.company??'', body.title??'',
       body.industry??null, body.company_size??null, body.country??null, p.asset_name || p.name,
       body.custom_answers??null]
    );
    return jsonResponse({ success: true, message: 'Lead captured' }, 201, origin);
  }

  if (request.method === 'POST') {
    const b: any = await request.json();
    const result = await dbRun(env.DB,
      `INSERT INTO landing_pages (campaign_id,client_id,asset_id,name,slug,headline,subheadline,cta_text,fields,status,custom_questions,brand_color,brand_color_secondary,brand_accent,logo_url,asset_url,asset_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.campaign_id??null, b.client_id??null, b.asset_id??null, b.name, b.slug,
       b.headline??null, b.subheadline??null, b.cta_text??'Download Now',
       b.fields ? JSON.stringify(b.fields) : '["first_name","last_name","email","company","title","phone"]',
       b.status??'draft',
       b.custom_questions ? JSON.stringify(b.custom_questions) : '[]',
       b.brand_color??'#2563eb', b.brand_color_secondary??'#1e40af', b.brand_accent??'#3b82f6',
       b.logo_url??null, b.asset_url??null, b.asset_name??null]
    );
    return jsonResponse({ success: true, id: result.lastRowId }, 201, origin);
  }

  if (request.method === 'PUT' && id) {
    const b: any = await request.json();
    await dbRun(env.DB,
      `UPDATE landing_pages SET name=?,slug=?,headline=?,subheadline=?,cta_text=?,fields=?,status=?,
       custom_questions=?,brand_color=?,brand_color_secondary=?,brand_accent=?,logo_url=?,asset_url=?,asset_name=?,
       updated_at=datetime('now') WHERE id=?`,
      [b.name, b.slug, b.headline??null, b.subheadline??null, b.cta_text??'Download Now',
       b.fields ? JSON.stringify(b.fields) : '["first_name","last_name","email","company","title","phone"]',
       b.status??'draft',
       b.custom_questions ? JSON.stringify(b.custom_questions) : '[]',
       b.brand_color??'#2563eb', b.brand_color_secondary??'#1e40af', b.brand_accent??'#3b82f6',
       b.logo_url??null, b.asset_url??null, b.asset_name??null,
       String(id)]
    );
    return jsonResponse({ success: true }, 200, origin);
  }

  if (request.method === 'DELETE' && id) {
    await dbRun(env.DB, `DELETE FROM landing_pages WHERE id=?`, [String(id)]);
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
};
