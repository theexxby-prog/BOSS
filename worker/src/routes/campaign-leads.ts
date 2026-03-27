import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';

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

    // POST /api/campaigns/:id/complete
    if (
      request.method === 'POST' &&
      segments[1] === 'campaigns' &&
      segments[3] === 'complete'
    ) {
      const campaignId = Number(segments[2]);
      if (!campaignId || isNaN(campaignId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign id' }, 400, origin);
      }

      const campaign = await dbFirst<{ id: number; status: string }>(
        env.DB, 'SELECT id, status FROM campaigns WHERE id = ?', [campaignId]
      );
      if (!campaign) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);

      // Idempotent: if already completed, return preview immediately
      if (campaign.status === 'completed') {
        const preview = await dbFirst<{
          accepted_count: number; billable_count: number;
          non_billable_count: number; total_amount: number | null;
        }>(env.DB,
          `SELECT
             SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
             SUM(CASE WHEN status = 'accepted' AND billing_status = 'billable' THEN 1 ELSE 0 END) as billable_count,
             SUM(CASE WHEN status = 'accepted' AND billing_status = 'non-billable' THEN 1 ELSE 0 END) as non_billable_count,
             ROUND(SUM(CASE
               WHEN status = 'accepted' AND billing_status = 'billable' AND price_at_acceptance IS NOT NULL
               THEN price_at_acceptance ELSE 0
             END), 2) as total_amount
           FROM campaign_leads WHERE campaign_id = ?`,
          [campaignId]
        );
        return jsonResponse({
          success: true,
          data: {
            campaign_id: campaignId,
            status: 'completed',
            invoice_preview: {
              accepted_count: preview?.accepted_count ?? 0,
              billable_count: preview?.billable_count ?? 0,
              non_billable_count: preview?.non_billable_count ?? 0,
              total_amount: preview?.total_amount ?? 0,
            },
          },
        }, 200, origin);
      }

      // Require invoice before completion
      const invoice = await dbFirst(env.DB, 'SELECT id FROM invoices WHERE campaign_id = ?', [campaignId]);
      if (!invoice) {
        return jsonResponse({
          success: false,
          error: 'Cannot complete campaign without generating invoice',
        }, 409, origin);
      }

      // Mark campaign as completed.
      // After completion, campaign should be treated as immutable for billing and lead status changes.
      await dbRun(env.DB,
        `UPDATE campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?`,
        [campaignId]
      );

      const preview = await dbFirst<{
        accepted_count: number; billable_count: number;
        non_billable_count: number; total_amount: number | null;
      }>(env.DB,
        `SELECT
           SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
           SUM(CASE WHEN status = 'accepted' AND billing_status = 'billable' THEN 1 ELSE 0 END) as billable_count,
           SUM(CASE WHEN status = 'accepted' AND billing_status = 'non-billable' THEN 1 ELSE 0 END) as non_billable_count,
           ROUND(SUM(CASE
             WHEN status = 'accepted' AND billing_status = 'billable' AND price_at_acceptance IS NOT NULL
             THEN price_at_acceptance ELSE 0
           END), 2) as total_amount
         FROM campaign_leads WHERE campaign_id = ?`,
        [campaignId]
      );

      return jsonResponse({
        success: true,
        data: {
          campaign_id: campaignId,
          status: 'completed',
          invoice_preview: {
            accepted_count: preview?.accepted_count ?? 0,
            billable_count: preview?.billable_count ?? 0,
            non_billable_count: preview?.non_billable_count ?? 0,
            total_amount: preview?.total_amount ?? 0,
          },
        },
      }, 200, origin);
    }

    // GET /api/campaigns/:id/invoice-preview
    if (
      request.method === 'GET' &&
      segments[1] === 'campaigns' &&
      segments[3] === 'invoice-preview'
    ) {
      const campaignId = Number(segments[2]);
      if (!campaignId || isNaN(campaignId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign id' }, 400, origin);
      }

      const campaign = await dbFirst(env.DB, 'SELECT id FROM campaigns WHERE id = ?', [campaignId]);
      if (!campaign) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);

      const preview = await dbFirst<{
        accepted_count: number;
        billable_count: number;
        non_billable_count: number;
        total_amount: number | null;
      }>(env.DB,
        `SELECT
           SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
           SUM(CASE WHEN status = 'accepted' AND billing_status = 'billable' THEN 1 ELSE 0 END) as billable_count,
           SUM(CASE WHEN status = 'accepted' AND billing_status = 'non-billable' THEN 1 ELSE 0 END) as non_billable_count,
           ROUND(SUM(CASE
             WHEN status = 'accepted'
               AND billing_status = 'billable'
               AND price_at_acceptance IS NOT NULL
             THEN price_at_acceptance
             ELSE 0
           END), 2) as total_amount
         FROM campaign_leads
         WHERE campaign_id = ?`,
        [campaignId]
      );

      const invoice = await dbFirst<{ due_date: string | null; status: string }>(
        env.DB, 'SELECT due_date, status FROM invoices WHERE campaign_id = ?', [campaignId]
      );
      const overdue = !!invoice &&
        invoice.status !== 'paid' &&
        !!invoice.due_date &&
        new Date(invoice.due_date + 'T23:59:59Z') < new Date();

      return jsonResponse({
        success: true,
        data: {
          campaign_id: campaignId,
          accepted_count: preview?.accepted_count ?? 0,
          billable_count: preview?.billable_count ?? 0,
          non_billable_count: preview?.non_billable_count ?? 0,
          total_amount: preview?.total_amount ?? 0,
          due_date: invoice?.due_date ?? null,
          overdue,
        },
      }, 200, origin);
    }

    // POST /api/campaigns/:id/generate-invoice
    if (
      request.method === 'POST' &&
      segments[1] === 'campaigns' &&
      segments[3] === 'generate-invoice'
    ) {
      const campaignId = Number(segments[2]);
      if (!campaignId || isNaN(campaignId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign id' }, 400, origin);
      }

      // Validate campaign exists and fetch payment terms from client
      const campaign = await dbFirst<{ id: number; client_id: number; name: string; payment_terms_days: number }>(
        env.DB,
        `SELECT c.id, c.client_id, c.name, cl.payment_terms_days
         FROM campaigns c
         JOIN clients cl ON c.client_id = cl.id
         WHERE c.id = ?`,
        [campaignId]
      );
      if (!campaign) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);

      // Idempotent: return existing invoice if already generated
      const existing = await dbFirst<{
        id: number; invoice_number: string; campaign_id: number;
        client_id: number; leads_count: number; total: number; status: string;
      }>(env.DB, 'SELECT * FROM invoices WHERE campaign_id = ?', [campaignId]);
      if (existing) {
        return jsonResponse({ success: true, data: existing }, 200, origin);
      }

      // Aggregate billable leads in SQL — never in JS
      const totals = await dbFirst<{ leads_count: number; total: number | null }>(
        env.DB,
        `SELECT COUNT(*) as leads_count,
                ROUND(SUM(price_at_acceptance), 2) as total
         FROM campaign_leads
         WHERE campaign_id = ?
           AND status = 'accepted'
           AND billing_status = 'billable'
           AND price_at_acceptance IS NOT NULL`,
        [campaignId]
      );
      if (!totals || totals.leads_count === 0) {
        return jsonResponse({ success: false, error: 'No accepted billable leads found for this campaign' }, 422, origin);
      }

      const invoice_number = `INV-${campaignId}-${Date.now()}`;
      const cpl = Math.round((totals.total! / totals.leads_count) * 100) / 100;

      const result = await dbRun(env.DB,
        `INSERT INTO invoices (client_id, campaign_id, invoice_number, leads_count, cpl, total, due_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, date('now', '+' || ? || ' days'), 'draft', CURRENT_TIMESTAMP)`,
        [campaign.client_id, campaignId, invoice_number, totals.leads_count, cpl, totals.total, campaign.payment_terms_days]
      );
      const invoiceId = result.lastRowId;

      // Stamp invoice_id on all qualifying leads.
      // Once invoice_id is set, a campaign_lead must not be modified by billing or other updates (enforced in later stages).
      await dbRun(env.DB,
        `UPDATE campaign_leads
         SET invoice_id = ?
         WHERE campaign_id = ?
           AND status = 'accepted'
           AND billing_status = 'billable'
           AND price_at_acceptance IS NOT NULL`,
        [invoiceId, campaignId]
      );

      // Fetch due_date from DB — source of truth
      const created = await dbFirst<{ due_date: string | null }>(
        env.DB, 'SELECT due_date FROM invoices WHERE id = ?', [invoiceId]
      );

      return jsonResponse({
        success: true,
        data: {
          invoice_id: invoiceId,
          invoice_number,
          campaign_id: campaignId,
          client_id: campaign.client_id,
          leads_count: totals.leads_count,
          total: totals.total,
          due_date: created?.due_date ?? null,
          overdue: false, // newly created invoices are never overdue
          status: 'draft',
        },
      }, 201, origin);
    }

    // POST /api/campaign-leads/:id/billing
    if (
      request.method === 'POST' &&
      segments[1] === 'campaign-leads' &&
      segments[3] === 'billing'
    ) {
      const campaignLeadId = Number(segments[2]);
      if (!campaignLeadId || isNaN(campaignLeadId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign_lead id' }, 400, origin);
      }

      const body = await request.json() as Record<string, unknown>;
      const { billing_status, reason, overridden_by } = body;

      if (!billing_status || !['billable', 'non-billable'].includes(billing_status as string)) {
        return jsonResponse({ success: false, error: 'billing_status must be billable or non-billable' }, 400, origin);
      }

      const row = await dbFirst<{
        id: number; status: string; invoice_id: number | null;
      }>(env.DB, 'SELECT id, status, invoice_id FROM campaign_leads WHERE id = ?', [campaignLeadId]);
      if (!row) return jsonResponse({ success: false, error: 'Campaign lead not found' }, 404, origin);

      if (row.status === 'pending' || row.status === 'rejected') {
        return jsonResponse({ success: false, error: 'Lead cannot be billed in its current status' }, 409, origin);
      }
      if (row.invoice_id !== null) {
        return jsonResponse({ success: false, error: 'Cannot modify billing after invoice has been issued' }, 409, origin);
      }

      await dbRun(env.DB,
        `UPDATE campaign_leads
         SET billing_status = ?,
             billing_override_reason = ?,
             billing_overridden_by = ?,
             billing_overridden_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [billing_status, reason ?? null, overridden_by ?? null, campaignLeadId]
      );

      return jsonResponse({
        success: true,
        data: {
          campaign_lead_id: campaignLeadId,
          billing_status,
          billing_override_reason: reason ?? null,
          billing_overridden_by: overridden_by ?? null,
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
