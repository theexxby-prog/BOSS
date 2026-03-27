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
    // GET /api/alerts
    if (request.method === 'GET' && segments[1] === 'alerts' && segments.length === 2) {
      const [lowAcceptanceRows, noDeliveryRows, pacingRows] = await Promise.all([

        // Alert 1 — Low Acceptance
        dbAll<{ campaign_id: number; campaign_name: string; delivered: number; accepted: number }>(env.DB,
          `SELECT
             c.id as campaign_id,
             c.name as campaign_name,
             COUNT(CASE WHEN cl.status = 'delivered' THEN 1 END) as delivered,
             COUNT(CASE WHEN cl.status = 'accepted' THEN 1 END) as accepted
           FROM campaigns c
           JOIN campaign_leads cl ON cl.campaign_id = c.id
           WHERE c.status = 'active'
           GROUP BY c.id, c.name
           HAVING delivered > 0
              AND CAST(accepted AS REAL) / NULLIF(delivered, 0) < 0.5`
        ),

        // Alert 2 — No Delivery
        dbAll<{ campaign_id: number; campaign_name: string; total_leads: number }>(env.DB,
          `SELECT
             c.id as campaign_id,
             c.name as campaign_name,
             COUNT(cl.id) as total_leads
           FROM campaigns c
           LEFT JOIN campaign_leads cl ON cl.campaign_id = c.id
           WHERE c.status = 'active'
           GROUP BY c.id, c.name
           HAVING SUM(CASE WHEN cl.status IN ('delivered','accepted','rejected') THEN 1 ELSE 0 END) = 0`
        ),

        // Alert 3 — Behind Pacing
        dbAll<{
          campaign_id: number; campaign_name: string;
          target: number; start_date: string; end_date: string; actual_delivered: number;
        }>(env.DB,
          `SELECT
             c.id as campaign_id,
             c.name as campaign_name,
             c.target,
             c.start_date,
             c.end_date,
             COUNT(CASE WHEN cl.status IN ('delivered','accepted','rejected') THEN 1 END) as actual_delivered
           FROM campaigns c
           LEFT JOIN campaign_leads cl ON cl.campaign_id = c.id
           WHERE c.status = 'active'
             AND c.start_date IS NOT NULL
             AND c.end_date IS NOT NULL
             AND c.target > 0
           GROUP BY c.id, c.name, c.target, c.start_date, c.end_date`
        ),
      ]);

      const alerts: unknown[] = [];

      for (const row of lowAcceptanceRows) {
        alerts.push({
          type: 'low_acceptance',
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          delivered: row.delivered,
          accepted: row.accepted,
          acceptance_rate: Math.round((row.accepted / row.delivered) * 100),
        });
      }

      for (const row of noDeliveryRows) {
        alerts.push({
          type: 'no_delivery',
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          total_leads: row.total_leads,
        });
      }

      for (const row of pacingRows) {
        const start = new Date(row.start_date).getTime();
        const end = new Date(row.end_date).getTime();
        const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
        const elapsedRaw = Math.ceil((Date.now() - start) / 86400000);
        const elapsed = Math.max(0, Math.min(totalDays, elapsedRaw));
        const progress = elapsed / totalDays;
        const expected = Math.floor(row.target * progress);
        const behind = row.actual_delivered < expected * 0.8;

        if (behind && expected > 0) {
          alerts.push({
            type: 'behind_pacing',
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            target: row.target,
            expected,
            actual: row.actual_delivered,
            progress_pct: Math.round(progress * 100),
          });
        }
      }

      alerts.sort((a: any, b: any) => a.type.localeCompare(b.type));

      return jsonResponse({ success: true, data: { alerts, count: alerts.length } }, 200, origin);
    }

    // GET /api/campaign-leads?campaign_id=:id  (list with optional filter)
    if (request.method === 'GET' && segments[1] === 'campaign-leads' && segments.length === 2) {
      const url2 = new URL(request.url);
      const filterCampaignId = url2.searchParams.get('campaign_id');

      const rows = await dbAll<{
        id: number; campaign_lead_id: number; email: string;
        campaign_id: number; campaign_name: string;
        status: string; qa_status: string | null;
        billing_status: string; price_at_acceptance: number | null;
        created_at: string;
      }>(env.DB,
        `SELECT
           cl.id          AS campaign_lead_id,
           gl.email,
           cl.campaign_id,
           c.name         AS campaign_name,
           cl.status,
           cl.qa_status,
           cl.billing_status,
           cl.price_at_acceptance,
           cl.created_at
         FROM campaign_leads cl
         JOIN global_leads gl ON gl.id = cl.lead_id
         JOIN campaigns    c  ON c.id  = cl.campaign_id
         ${filterCampaignId ? 'WHERE cl.campaign_id = ?' : ''}
         ORDER BY cl.created_at DESC
         LIMIT 500`,
        filterCampaignId ? [Number(filterCampaignId)] : []
      );

      return jsonResponse({ success: true, data: rows }, 200, origin);
    }

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

    // POST /api/campaign-leads/:id/accept
    if (
      request.method === 'POST' &&
      segments[1] === 'campaign-leads' &&
      segments[3] === 'accept'
    ) {
      const campaignLeadId = Number(segments[2]);
      if (!campaignLeadId || isNaN(campaignLeadId)) {
        return jsonResponse({ success: false, error: 'Invalid campaign_lead id' }, 400, origin);
      }

      const body = await request.json() as Record<string, unknown>;
      const price = Number(body.price);
      if (!body.price || isNaN(price) || price <= 0) {
        return jsonResponse({ success: false, error: 'price is required and must be a number greater than 0' }, 400, origin);
      }

      const row = await dbFirst<{ id: number; status: string }>(
        env.DB, 'SELECT id, status FROM campaign_leads WHERE id = ?', [campaignLeadId]
      );
      if (!row) return jsonResponse({ success: false, error: 'Campaign lead not found' }, 404, origin);

      if (row.status === 'accepted' || row.status === 'rejected') {
        return jsonResponse({ success: false, error: 'Lead has already been accepted or rejected' }, 409, origin);
      }
      if (row.status !== 'delivered') {
        return jsonResponse({ success: false, error: 'Lead must be delivered before acceptance' }, 409, origin);
      }

      await dbRun(env.DB,
        `UPDATE campaign_leads
         SET status = 'accepted',
             accepted_at = CURRENT_TIMESTAMP,
             price_at_acceptance = ?
         WHERE id = ?`,
        [price, campaignLeadId]
      );

      return jsonResponse({
        success: true,
        data: {
          campaign_lead_id: campaignLeadId,
          status: 'accepted',
          price_at_acceptance: price,
        },
      }, 200, origin);
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
        client_id: number; leads_count: number; total: number;
        due_date: string | null; status: string;
      }>(env.DB, 'SELECT * FROM invoices WHERE campaign_id = ?', [campaignId]);
      if (existing) {
        return jsonResponse({ success: true, data: {
          invoice_id: existing.id,
          invoice_number: existing.invoice_number,
          campaign_id: existing.campaign_id,
          client_id: existing.client_id,
          leads_count: existing.leads_count,
          total: existing.total,
          due_date: existing.due_date ?? null,
          overdue: false,
          status: existing.status,
        }}, 200, origin);
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
