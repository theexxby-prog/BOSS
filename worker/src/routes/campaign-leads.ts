import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbFirst, dbRun } from '../db';

const VALID_SOURCES = ['apollo', 'manual', 'import'];

export async function campaignLeadsRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // /api/campaigns/:id/leads  → segments: ['api', 'campaigns', ':id', 'leads']
  const campaignId = segments[2] ? parseInt(segments[2]) : null;

  try {
    // POST /api/campaigns/:id/leads  (segments: api, campaigns, :id, leads)
    if (request.method === 'POST' && segments[1] === 'campaigns' && segments[3] === 'leads' && campaignId) {
      const body = await request.json() as Record<string, unknown>;
      const { name, email: rawEmail, source } = body;

      // Step 2 — Validate required fields
      if (!rawEmail || typeof rawEmail !== 'string') {
        return jsonResponse({ success: false, error: 'email is required' }, 400, origin);
      }
      if (!source || typeof source !== 'string') {
        return jsonResponse({ success: false, error: 'source is required' }, 400, origin);
      }
      if (!VALID_SOURCES.includes(source)) {
        return jsonResponse({ success: false, error: 'Invalid source value. Must be apollo, manual, or import' }, 400, origin);
      }

      // Step 3 — Normalize email
      const email = rawEmail.trim().toLowerCase();

      // Step 4 — Validate campaign exists
      const campaign = await dbFirst(env.DB, 'SELECT id FROM campaigns WHERE id = ?', [campaignId]);
      if (!campaign) {
        return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);
      }

      // Step 5 — Check or create global lead
      let leadId: number;
      let reused: boolean;

      const existing = await dbFirst<{ id: number }>(env.DB, 'SELECT id FROM global_leads WHERE email = ?', [email]);
      if (existing) {
        leadId = existing.id;
        reused = true;
      } else {
        const result = await dbRun(
          env.DB,
          'INSERT INTO global_leads (email, name, source, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [email, name ?? null, source]
        );
        if (!result.lastRowId) {
          return jsonResponse({ success: false, error: 'Failed to create lead' }, 500, origin);
        }
        leadId = result.lastRowId;
        reused = false;
      }

      // Step 6 — Check for duplicate campaign lead
      const duplicate = await dbFirst(
        env.DB,
        'SELECT id FROM campaign_leads WHERE lead_id = ? AND campaign_id = ?',
        [leadId, campaignId]
      );
      if (duplicate) {
        return jsonResponse({ success: false, error: 'Lead already exists in this campaign' }, 409, origin);
      }

      // Step 7 — Insert campaign lead
      const inserted = await dbRun(
        env.DB,
        'INSERT INTO campaign_leads (lead_id, campaign_id, status, qa_status) VALUES (?, ?, \'pending\', \'pending\')',
        [leadId, campaignId]
      );

      return jsonResponse({
        success: true,
        data: {
          lead_id: leadId,
          campaign_lead_id: inserted.lastRowId,
          reused,
        },
      }, 201, origin);
    }

    // POST /api/campaign-leads/:id/deliver
    if (
      request.method === 'POST' &&
      segments[1] === 'campaign-leads' &&
      segments[3] === 'deliver'
    ) {
      const campaignLeadId = Number(segments[2]);
      if (!campaignLeadId || isNaN(campaignLeadId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign_lead id' }, 400, origin);
      }

      const row = await dbFirst<{
        id: number; lead_id: number; campaign_id: number;
        status: string; qa_status: string;
        email: string; name: string | null;
      }>(env.DB,
        `SELECT cl.*, gl.email, gl.name
         FROM campaign_leads cl
         JOIN global_leads gl ON cl.lead_id = gl.id
         WHERE cl.id = ?`,
        [campaignLeadId]
      );
      if (!row) return jsonResponse({ success: false, error: 'Campaign lead not found' }, 404, origin);

      if (row.qa_status !== 'approved') {
        return jsonResponse({ success: false, error: 'Lead must be QA approved before delivery' }, 409, origin);
      }
      if (row.status !== 'pending') {
        return jsonResponse({ success: false, error: 'Lead has already been delivered' }, 409, origin);
      }

      await dbRun(env.DB,
        `UPDATE campaign_leads SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [campaignLeadId]
      );

      return jsonResponse({
        success: true,
        data: {
          campaign_lead_id: row.id,
          lead_id: row.lead_id,
          campaign_id: row.campaign_id,
          email: row.email,
          name: row.name ?? null,
          status: 'delivered',
        },
      }, 200, origin);
    }

    // POST /api/campaign-leads/:id/qa
    const qaMatch = /^\/api\/campaign-leads\/(\d+)\/qa$/.test(url.pathname);
    if (request.method === 'POST' && qaMatch) {
      const clSegments = url.pathname.split('/').filter(Boolean);
      const campaignLeadId = Number(clSegments[2]);
      if (!campaignLeadId || isNaN(campaignLeadId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign_lead id' }, 400, origin);
      }

      // Step 2 — Fetch campaign_lead + email from global_lead
      const row = await dbFirst<{
        id: number; status: string; qa_status: string;
        lead_id: number; campaign_id: number;
        email: string; name: string | null;
      }>(env.DB,
        `SELECT cl.*, gl.email, gl.name
         FROM campaign_leads cl
         JOIN global_leads gl ON cl.lead_id = gl.id
         WHERE cl.id = ?`,
        [campaignLeadId]
      );
      if (!row) return jsonResponse({ success: false, error: 'Campaign lead not found' }, 404, origin);

      // Step 3 — Guard conditions
      if (row.qa_status === 'approved' || row.qa_status === 'rejected') {
        return jsonResponse({ success: false, error: 'QA already completed for this lead' }, 409, origin);
      }
      if (row.status !== 'pending') {
        return jsonResponse({ success: false, error: 'QA can only be run on pending leads' }, 409, origin);
      }

      // Step 4 — QA checks
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let qa_status: string;
      let qa_reason: string | null;

      if (!row.email || !row.email.trim()) {
        qa_status = 'rejected';
        qa_reason = 'Missing email';
      } else if (!EMAIL_REGEX.test(row.email)) {
        qa_status = 'rejected';
        qa_reason = 'Invalid email format';
      } else {
        qa_status = 'approved';
        qa_reason = null;
      }

      // Step 5 — Persist result
      await dbRun(env.DB,
        `UPDATE campaign_leads SET qa_status = ?, qa_reason = ?, qa_checked_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [qa_status, qa_reason, campaignLeadId]
      );

      return jsonResponse({
        success: true,
        data: { campaign_lead_id: campaignLeadId, qa_status, qa_reason },
      }, 200, origin);
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  } catch (err) {
    console.error('campaignLeadsRouter error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, origin);
  }
}
