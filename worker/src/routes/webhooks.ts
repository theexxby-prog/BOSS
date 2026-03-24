// BOSS HQ — Webhook Routes
// Handles inbound events from external systems (Convertr, HubSpot).
// These endpoints are intentionally permissive on errors:
//   - Unknown leads → 200 (silently ignored — external systems don't know our IDs)
//   - Duplicate calls → 200 (idempotent by design)
//   - Business rule violations → 422 (e.g. source conflict, invoiced lead)

import { jsonResponse }       from '../cors'
import { mockProvider }       from '../providers/mockProvider'
import { updateLeadAcceptance } from '../services/leadService'
import { LeadNotFoundError, LeadLifecycleError } from '../services/leadService'

const provider = mockProvider

// ─── Convertr Webhook ─────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/convertr
 *
 * Payload:
 *   { "external_lead_id": "cvtr-001", "status": "accepted" | "rejected" }
 *
 * Behavior:
 *   1. Look up internal lead by external_id
 *   2. If not found: log and return 200 (do not expose internal errors to Convertr)
 *   3. If found: call updateLeadAcceptance with source = 'convertr'
 *   4. Idempotent: duplicate calls return 200 with no side effects
 */
async function handleConvertrWebhook(
  request: Request,
  origin: string | null
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, origin)
  }

  const external_lead_id = body.external_lead_id
  const rawStatus        = body.status

  // Validate required fields
  if (typeof external_lead_id !== 'string' || !external_lead_id.trim()) {
    return jsonResponse({ success: false, error: 'external_lead_id is required' }, 422, origin)
  }
  if (rawStatus !== 'accepted' && rawStatus !== 'rejected') {
    return jsonResponse(
      { success: false, error: 'status must be "accepted" or "rejected"' },
      422, origin
    )
  }

  // Map external ID → internal lead
  const lead = provider.getLeadByExternalId(external_lead_id)
  if (!lead) {
    // Do NOT return an error — Convertr should not know our internal ID structure.
    // Log for observability and return 200.
    console.warn(`[convertr-webhook] No lead found for external_id="${external_lead_id}" — ignoring`)
    return jsonResponse({ success: true, note: 'lead not found — ignored' }, 200, origin)
  }

  try {
    const updated = updateLeadAcceptance(provider, lead.id, rawStatus, 'convertr')
    return jsonResponse({ success: true, data: { lead_id: updated.id, status: updated.status } }, 200, origin)
  } catch (err) {
    if (err instanceof LeadLifecycleError) {
      // Known business rule violation — return 422 so Convertr can alert on it
      return jsonResponse({ success: false, error: err.message }, 422, origin)
    }
    if (err instanceof LeadNotFoundError) {
      // Should not happen (we looked up above) but guard anyway
      return jsonResponse({ success: true, note: 'lead not found — ignored' }, 200, origin)
    }
    return jsonResponse({ success: false, error: String(err) }, 500, origin)
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function webhooksRouter(
  request: Request,
  origin: string | null
): Promise<Response> {
  const url      = new URL(request.url)
  const path     = url.pathname
  const method   = request.method
  const segments = path.split('/').filter(Boolean)
  // segments: ['api', 'webhooks', ...]

  if (method === 'POST' && segments[2] === 'convertr') {
    return handleConvertrWebhook(request, origin)
  }

  return jsonResponse({ success: false, error: 'Webhook endpoint not found' }, 404, origin)
}
