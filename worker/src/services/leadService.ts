// BOSS HQ — Lead Service
// Enforces lead lifecycle rules. All state changes go through here.
// No direct store access — uses DataProvider only.

import type { DataProvider } from '../providers/DataProvider'
import type { LeadRecord, AcceptanceSource } from '../providers/types'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class LeadNotFoundError extends Error {
  constructor(id: string) { super(`Lead not found: ${id}`) }
}

export class LeadLifecycleError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Throws if the lead has already been linked to an invoice.
 * Financial fields (status, price_at_acceptance, acceptance_source) must not
 * change after invoicing. Contact fields (name, email) are not blocked.
 */
function assertNotInvoiced(lead: LeadRecord): void {
  if (lead.invoice_id !== null) {
    throw new LeadLifecycleError(
      `Cannot modify lead "${lead.id}": it has been invoiced (invoice_id: "${lead.invoice_id}")`
    )
  }
}

/**
 * Throws if a lower-authority source is trying to override a higher-authority one.
 *
 * Authority order (highest to lowest): convertr = hubspot > manual
 * Rules:
 *   - External sources (convertr, hubspot) cannot override each other
 *   - manual cannot override any external source
 *   - Any source can write if acceptance_source is currently null
 */
function assertSourceAllowed(lead: LeadRecord, incomingSource: AcceptanceSource): void {
  const existing = lead.acceptance_source
  if (!existing) return                         // no prior source — always allowed
  if (existing === incomingSource) return       // same source retrying — idempotency handles it
  if (incomingSource === 'manual') {
    throw new LeadLifecycleError(
      `Cannot manually update lead "${lead.id}": already owned by external source "${existing}". ` +
      `Only "${existing}" can update this lead.`
    )
  }
  // Different external sources colliding (e.g. convertr → hubspot)
  throw new LeadLifecycleError(
    `Cannot update lead "${lead.id}" via "${incomingSource}": ` +
    `already owned by "${existing}". Source conflict must be resolved manually.`
  )
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Mark a lead as delivered.
 * Rules:
 *   - Lead must exist
 *   - Lead must not be invoiced (financial lock)
 *   - Status must be 'pending' (idempotent if already delivered)
 */
export function deliverLead(provider: DataProvider, id: string): LeadRecord {
  const lead = provider.getLead(id)
  if (!lead) throw new LeadNotFoundError(id)

  if (lead.status === 'delivered') return lead  // idempotent

  assertNotInvoiced(lead)

  if (lead.status !== 'pending') {
    throw new LeadLifecycleError(
      `Cannot deliver lead "${id}": status is "${lead.status}", expected "pending"`
    )
  }

  const updated = provider.updateLeadStatus(id, 'delivered', { delivered_at: today() })
  return updated!
}

/**
 * Central acceptance/rejection function. All accept and reject actions — whether
 * from manual UI, Convertr webhook, or HubSpot — route through here.
 *
 * Rules (in enforcement order):
 *   1. Lead must exist
 *   2. Idempotent: same status + same source → no-op
 *   3. Lead must not be invoiced (financial lock)
 *   4. Client-level enforcement: source must match campaign → client integration.acceptance_source
 *      This is the primary authority. If the client is configured for 'convertr', only
 *      'convertr' may accept or reject any lead under their campaigns.
 *   5. Lead-level source guard: prevents different sources colliding on the same lead
 *   6. Lead must be 'delivered' with delivered_at set
 *   7. On accept: snapshots campaign.unit_price into price_at_acceptance
 */
export function updateLeadAcceptance(
  provider: DataProvider,
  id: string,
  status: 'accepted' | 'rejected',
  source: AcceptanceSource
): LeadRecord {
  const lead = provider.getLead(id)
  if (!lead) throw new LeadNotFoundError(id)

  // Idempotent: same status + same source → no-op
  if (lead.status === status && lead.acceptance_source === source) return lead

  assertNotInvoiced(lead)

  // ── Client-level enforcement ───────────────────────────────────────────────
  // Fetch campaign → client integration to get the authoritative acceptance_source.
  // If an integration config exists and the incoming source doesn't match, reject immediately.
  const campaign    = provider.getCampaign(lead.campaign_id)
  const integration = campaign
    ? provider.getIntegrationByClient(campaign.client_id)
    : null

  if (integration && source !== integration.acceptance_source) {
    throw new LeadLifecycleError(
      `Cannot ${status} lead "${id}" via "${source}": ` +
      `client "${campaign!.client_id}" requires all acceptance via "${integration.acceptance_source}". ` +
      `Check the client's integration config.`
    )
  }

  // ── Lead-level source guard (secondary) ───────────────────────────────────
  assertSourceAllowed(lead, source)

  if (lead.status !== 'delivered' || !lead.delivered_at) {
    throw new LeadLifecycleError(
      `Cannot ${status} lead "${id}": must be delivered first (current status: "${lead.status}")`
    )
  }

  if (status === 'accepted') {
    const price_at_acceptance = campaign?.unit_price ?? null
    return provider.updateLeadStatus(id, 'accepted', {
      accepted_at: today(),
      acceptance_source: source,
      price_at_acceptance,
    })!
  } else {
    return provider.updateLeadStatus(id, 'rejected', {
      rejected_at: today(),
      acceptance_source: source,
    })!
  }
}

/**
 * Accept a lead manually (convenience wrapper around updateLeadAcceptance).
 */
export function acceptLead(provider: DataProvider, id: string): LeadRecord {
  return updateLeadAcceptance(provider, id, 'accepted', 'manual')
}

/**
 * Reject a lead manually (convenience wrapper around updateLeadAcceptance).
 */
export function rejectLead(provider: DataProvider, id: string): LeadRecord {
  return updateLeadAcceptance(provider, id, 'rejected', 'manual')
}

/**
 * Return all leads for a campaign, optionally filtered by status.
 */
export function getLeadsByCampaign(
  provider: DataProvider,
  campaignId: string,
  status?: LeadRecord['status']
): LeadRecord[] {
  return provider.listLeads({ campaign_id: campaignId, status })
}
