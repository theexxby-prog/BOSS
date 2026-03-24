// BOSS HQ — Lead Service
// Enforces lead lifecycle rules. All state changes go through here.
// No direct store access — uses DataProvider only.

import type { DataProvider } from '../providers/DataProvider'
import type { LeadRecord } from '../providers/types'

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

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Mark a lead as delivered.
 * Rules:
 *   - Lead must exist
 *   - Status must be 'pending' (cannot deliver twice)
 */
export function deliverLead(provider: DataProvider, id: string): LeadRecord {
  const lead = provider.getLead(id)
  if (!lead) throw new LeadNotFoundError(id)

  if (lead.status === 'delivered') return lead  // idempotent

  if (lead.status !== 'pending') {
    throw new LeadLifecycleError(
      `Cannot deliver lead "${id}": status is "${lead.status}", expected "pending"`
    )
  }

  const updated = provider.updateLeadStatus(id, 'delivered', { delivered_at: today() })
  return updated!
}

/**
 * Mark a delivered lead as accepted.
 * Rules:
 *   - Lead must exist
 *   - Status must be 'delivered' (delivered_at must be set)
 *   - Cannot accept a lead that is already accepted or rejected
 */
export function acceptLead(provider: DataProvider, id: string): LeadRecord {
  const lead = provider.getLead(id)
  if (!lead) throw new LeadNotFoundError(id)

  if (lead.status === 'accepted') return lead   // idempotent

  if (lead.status !== 'delivered' || !lead.delivered_at) {
    throw new LeadLifecycleError(
      `Cannot accept lead "${id}": must be delivered first (current status: "${lead.status}")`
    )
  }

  const updated = provider.updateLeadStatus(id, 'accepted', { accepted_at: today() })
  return updated!
}

/**
 * Mark a delivered lead as rejected.
 * Rules:
 *   - Lead must exist
 *   - Status must be 'delivered' (delivered_at must be set)
 *   - Cannot reject a lead that is already rejected or accepted
 */
export function rejectLead(provider: DataProvider, id: string): LeadRecord {
  const lead = provider.getLead(id)
  if (!lead) throw new LeadNotFoundError(id)

  if (lead.status === 'rejected') return lead   // idempotent

  if (lead.status !== 'delivered' || !lead.delivered_at) {
    throw new LeadLifecycleError(
      `Cannot reject lead "${id}": must be delivered first (current status: "${lead.status}")`
    )
  }

  const updated = provider.updateLeadStatus(id, 'rejected', {})
  return updated!
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
