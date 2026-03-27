// BOSS HQ — Cloudflare Worker Entry Point

import type { Env } from './types';
import { handleOptions, jsonResponse } from './cors';

import { clientsRouter }    from './routes/clients';
import { campaignsRouter }  from './routes/campaigns';
import { leadsRouter }      from './routes/leads';
import { deliveriesRouter } from './routes/deliveries';
import { financeRouter }    from './routes/finance';
import { socialRouter }     from './routes/social';
import { bdRouter }         from './routes/bd';
import { systemLogsRouter } from './routes/system-logs';
import { assetsRouter }     from './routes/assets';
import { pagesRouter }      from './routes/pages';
import { documentsRouter }  from './routes/documents';
import { settingsRouter }   from './routes/settings';
import { jobCardsRouter }      from './routes/job-cards';
import { landingPageRenderer } from './routes/landing-page';
import { billingRouter }       from './routes/billing';
import { webhooksRouter }      from './routes/webhooks';
import { campaignLeadsRouter } from './routes/campaign-leads';
import { dbFirst, dbAll }      from './db';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') return handleOptions(request);

    const url  = new URL(request.url);
    const path = url.pathname;

    // ── Public landing pages — /lp/:slug ────────────────────────────────────
    if (path.startsWith('/lp/')) {
      return landingPageRenderer(request, env);
    }

    // ── Health ──────────────────────────────────────────────────────────────
    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', ts: new Date().toISOString() }, 200, origin);
    }

    // ── Public: landing page form submissions ────────────────────────────────
    if (request.method === 'POST' && /^\/api\/pages\/[^/]+\/submit$/.test(path)) {
      return pagesRouter(request, env);
    }

    // ── Public: inbound webhooks (provider-specific signature auth, not bearer)
    if (path.startsWith('/api/webhooks/')) {
      return webhooksRouter(request, origin);
    }

    // ── Auth guard — all other /api/* routes ─────────────────────────────────
    const authHeader = request.headers.get('Authorization') || '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!env.BOSS_API_TOKEN || token !== env.BOSS_API_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);
    }

    // ── ICP Scoring — POST /api/leads/:id/score ─────────────────────────────
    if (request.method === 'POST' && /^\/api\/leads\/\d+\/score$/.test(path)) {
      const leadId = parseInt(path.split('/')[3]);
      const lead   = await dbFirst<any>(env.DB, 'SELECT * FROM leads WHERE id=?', [leadId]);
      if (!lead) return jsonResponse({ success: false, error: 'Lead not found' }, 404, origin);

      const client = await dbFirst<any>(env.DB, 'SELECT * FROM clients WHERE id=?', [lead.client_id]);
      const icp    = client?.icp_spec ? JSON.parse(client.icp_spec) : {};

      let score = 50; // base
      if (icp.titles?.some((t: string) => lead.title?.toLowerCase().includes(t.toLowerCase()))) score += 20;
      if (icp.industries?.some((i: string) => lead.industry?.toLowerCase().includes(i.toLowerCase()))) score += 15;
      if (icp.company_sizes?.includes(lead.company_size)) score += 10;
      if (icp.geographies?.some((g: string) => lead.country?.toLowerCase().includes(g.toLowerCase()))) score += 5;
      if (lead.email_verified) score += 5;
      if (lead.enriched)       score -= 0;
      score = Math.min(100, Math.max(0, score));

      const status = score >= 90 ? 'approved' : score >= 70 ? 'pending' : 'rejected';
      await env.DB.prepare(
        `UPDATE leads SET icp_score=?, status=?, updated_at=datetime('now') WHERE id=?`
      ).bind(score, status, leadId).run();

      return jsonResponse({ success: true, score, status }, 200, origin);
    }

    // ── Route dispatch ───────────────────────────────────────────────────────
    if (path.startsWith('/api/clients'))     return clientsRouter(request, env, origin);
    if (path === '/api/alerts' && request.method === 'GET') return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaign-leads')) return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaigns/') && path.endsWith('/leads') && request.method === 'POST')
      return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaigns/') && path.endsWith('/complete') && request.method === 'POST')
      return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaigns/') && path.endsWith('/invoice-preview') && request.method === 'GET')
      return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaigns/') && path.endsWith('/generate-invoice') && request.method === 'POST')
      return campaignLeadsRouter(request, env, origin);
    if (path.startsWith('/api/campaigns'))   return campaignsRouter(request, env, origin);
    if (path.startsWith('/api/leads'))       return leadsRouter(request, env, origin);
    if (path.startsWith('/api/deliveries'))  return deliveriesRouter(request, env, origin);
    if (path.startsWith('/api/finance'))     return financeRouter(request, env, origin);
    if (path.startsWith('/api/social'))      return socialRouter(request, env, origin);
    if (path.startsWith('/api/bd'))          return bdRouter(request, env, origin);
    if (path.startsWith('/api/system-logs')) return systemLogsRouter(request, env, origin);
    if (path.startsWith('/api/assets'))      return assetsRouter(request, env);
    if (path.startsWith('/api/pages'))       return pagesRouter(request, env);
    if (path.startsWith('/api/documents'))   return documentsRouter(request, env);
    if (path.startsWith('/api/settings'))    return settingsRouter(request, env);
    if (path.startsWith('/api/job-cards'))   return jobCardsRouter(request, env);
    if (path.startsWith('/api/billing'))      return billingRouter(request, origin);
    if (path.startsWith('/api/webhooks'))    return webhooksRouter(request, origin);

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
