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
    // POST /api/campaigns/:id/leads
    if (request.method === 'POST' && campaignId) {
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

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, origin);
  }
}
