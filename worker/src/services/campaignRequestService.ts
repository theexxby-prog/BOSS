// BOSS HQ — Campaign Request Service
// Manages the intake queue for new campaign requests.
// Approved requests create a BillingCampaign; rejected requests are closed with notes.

import type { DataProvider } from '../providers/DataProvider'
import type { CampaignRequest, BillingType } from '../providers/types'
import { ClientNotFoundError } from './clientService'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class CampaignRequestError extends Error {
  constructor(message: string) { super(message) }
}

export class CampaignRequestNotFoundError extends Error {
  constructor(id: string) { super(`Campaign request not found: ${id}`) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const VALID_BILLING_TYPES: BillingType[] = ['per_lead', 'flat_fee', 'retainer']

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Submit a new campaign request for review.
 * Rules:
 *   - Client must exist
 *   - name and requested_by are required
 *   - billing_type must be valid
 *   - unit_price is required for per_lead and flat_fee; must be positive
 *   - unit_price is null for retainer
 */
export function createCampaignRequest(
  provider: DataProvider,
  data: Omit<CampaignRequest, 'id' | 'created_at' | 'status' | 'campaign_id' | 'reviewed_by' | 'review_notes' | 'reviewed_at'>
): CampaignRequest {
  const client = provider.getClient(data.client_id)
  if (!client) throw new ClientNotFoundError(data.client_id)

  if (!data.name?.trim()) {
    throw new CampaignRequestError('Campaign name is required')
  }
  if (!data.requested_by?.trim()) {
    throw new CampaignRequestError('requested_by is required')
  }
  if (!VALID_BILLING_TYPES.includes(data.billing_type)) {
    throw new CampaignRequestError(
      `Invalid billing_type "${data.billing_type}". Must be one of: ${VALID_BILLING_TYPES.join(', ')}`
    )
  }
  if (data.billing_type === 'retainer') {
    if (data.unit_price !== null && data.unit_price !== undefined) {
      throw new CampaignRequestError(
        `unit_price must be null for billing_type "retainer"`
      )
    }
  } else {
    if (data.unit_price === null || data.unit_price === undefined) {
      throw new CampaignRequestError(
        `unit_price is required for billing_type "${data.billing_type}"`
      )
    }
    if (data.unit_price <= 0) {
      throw new CampaignRequestError(`unit_price must be greater than 0`)
    }
  }

  return provider.createCampaignRequest({
    ...data,
    unit_price:   data.billing_type === 'retainer' ? null : data.unit_price,
    status:       'pending',
    campaign_id:  null,
    reviewed_by:  null,
    review_notes: null,
    reviewed_at:  null,
  })
}

/**
 * Approve a campaign request — creates the BillingCampaign and links it back.
 * Rules:
 *   - Request must exist and be in 'pending' status
 *   - Idempotent: if already 'approved', returns the request as-is
 *   - acceptance_source is inherited from the client's integration config;
 *     defaults to 'manual' if no integration has been configured yet
 */
export function approveCampaignRequest(
  provider: DataProvider,
  requestId: string,
  reviewedBy: string,
  reviewNotes?: string
): { request: CampaignRequest; campaign: ReturnType<DataProvider['createCampaign']> } {
  const request = provider.getCampaignRequest(requestId)
  if (!request) throw new CampaignRequestNotFoundError(requestId)

  // Idempotent: already approved — return existing
  if (request.status === 'approved' && request.campaign_id) {
    const campaign = provider.getCampaign(request.campaign_id)!
    return { request, campaign }
  }

  if (request.status === 'rejected') {
    throw new CampaignRequestError(
      `Campaign request "${requestId}" has already been rejected and cannot be approved. ` +
      `Create a new request instead.`
    )
  }

  if (!reviewedBy?.trim()) {
    throw new CampaignRequestError('reviewedBy is required to approve a request')
  }

  // Inherit acceptance_source from client integration, default to 'manual'
  const integration = provider.getIntegrationByClient(request.client_id)
  const acceptanceSource = integration?.acceptance_source ?? 'manual'

  // Create the BillingCampaign from the approved request
  const campaign = provider.createCampaign({
    client_id:         request.client_id,
    name:              request.name,
    status:            'active',
    billing_type:      request.billing_type,
    unit_price:        request.unit_price ?? 0,
    acceptance_source: acceptanceSource,
  })

  // Link campaign back to request and mark as approved
  const updated = provider.updateCampaignRequest(requestId, {
    status:       'approved',
    campaign_id:  campaign.id,
    reviewed_by:  reviewedBy,
    review_notes: reviewNotes ?? null,
    reviewed_at:  today(),
  })!

  return { request: updated, campaign }
}

/**
 * Reject a campaign request.
 * Rules:
 *   - Request must exist and be in 'pending' status
 *   - Idempotent: if already 'rejected', returns as-is
 *   - review_notes are strongly recommended but not enforced
 */
export function rejectCampaignRequest(
  provider: DataProvider,
  requestId: string,
  reviewedBy: string,
  reviewNotes?: string
): CampaignRequest {
  const request = provider.getCampaignRequest(requestId)
  if (!request) throw new CampaignRequestNotFoundError(requestId)

  // Idempotent: already rejected
  if (request.status === 'rejected') return request

  if (request.status === 'approved') {
    throw new CampaignRequestError(
      `Campaign request "${requestId}" has already been approved. ` +
      `Cannot reject an approved request — deactivate the campaign instead.`
    )
  }

  if (!reviewedBy?.trim()) {
    throw new CampaignRequestError('reviewedBy is required to reject a request')
  }

  return provider.updateCampaignRequest(requestId, {
    status:       'rejected',
    reviewed_by:  reviewedBy,
    review_notes: reviewNotes ?? null,
    reviewed_at:  today(),
  })!
}

/**
 * List campaign requests, optionally filtered by client or status.
 */
export function listCampaignRequests(
  provider: DataProvider,
  filters?: { client_id?: string; status?: CampaignRequest['status'] }
): CampaignRequest[] {
  return provider.listCampaignRequests(filters)
}
