// BOSS HQ — Report Service
// Read-only metrics. No mutations. All data via DataProvider.

import type { DataProvider } from '../providers/DataProvider'
import { getUninvoicedLeads } from './invoiceService'

// ─── Return Types ─────────────────────────────────────────────────────────────

export interface CampaignMetrics {
  campaign_id:          string
  campaign_name:        string
  total_leads:          number
  delivered:            number
  accepted:             number
  rejected:             number
  pending:              number
  acceptance_rate:      number | null  // accepted / (accepted + rejected); null if none reviewed yet
  unit_price:           number
  earned_revenue:       number         // sum(price_at_acceptance) for accepted leads (fallback: unit_price)
  invoiced_revenue:     number         // sum of invoice totals
  collected_revenue:    number         // sum of payments
  outstanding_revenue:  number         // invoiced - collected
}

export interface GlobalMetrics {
  total_revenue:           number       // sum of all invoice totals
  total_collected:         number       // sum of all payments
  total_outstanding:       number       // total_revenue - total_collected
  total_leads:             number
  total_delivered:         number
  total_accepted:          number
  overall_acceptance_rate: number | null // accepted / (accepted + rejected) across all campaigns
}

export interface UninvoicedRevenue {
  campaign_id:       string
  uninvoiced_count:  number
  unit_price:        number
  uninvoiced_revenue: number
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Compute all metrics for a single campaign.
 */
export function getCampaignMetrics(
  provider: DataProvider,
  campaignId: string
): CampaignMetrics | null {
  const campaign = provider.getCampaign(campaignId)
  if (!campaign) return null

  const leads     = provider.listLeads({ campaign_id: campaignId })
  const delivered = leads.filter(l => l.status === 'delivered').length
  const accepted  = leads.filter(l => l.status === 'accepted').length
  const rejected  = leads.filter(l => l.status === 'rejected').length
  const pending   = leads.filter(l => l.status === 'pending').length

  // Acceptance rate = accepted / (accepted + rejected)
  // Excludes pending and delivered (unreviewed) — measures quality of reviewed leads only.
  const reviewed        = accepted + rejected
  const acceptance_rate = reviewed > 0
    ? Math.round((accepted / reviewed) * 1000) / 10   // e.g. 70.0
    : null

  // Earned revenue uses price_at_acceptance snapshot per lead.
  // Fallback to campaign.unit_price for any legacy leads missing the snapshot.
  const acceptedLeads   = leads.filter(l => l.status === 'accepted')
  const earned_revenue  = acceptedLeads.reduce(
    (sum, l) => sum + (l.price_at_acceptance ?? campaign.unit_price), 0
  )

  const invoices          = provider.listInvoices({ campaign_id: campaignId })
  const invoiced_revenue  = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const collected_revenue = invoices.reduce((sum, inv) => {
    return sum + provider.listPayments(inv.id).reduce((s, p) => s + p.amount, 0)
  }, 0)

  return {
    campaign_id:         campaignId,
    campaign_name:       campaign.name,
    total_leads:         leads.length,
    delivered,
    accepted,
    rejected,
    pending,
    acceptance_rate,
    unit_price:          campaign.unit_price,
    earned_revenue,
    invoiced_revenue,
    collected_revenue,
    outstanding_revenue: invoiced_revenue - collected_revenue,
  }
}

/**
 * Compute aggregate metrics across all campaigns.
 */
export function getGlobalMetrics(provider: DataProvider): GlobalMetrics {
  const campaigns = provider.listCampaigns()

  if (campaigns.length === 0) {
    return {
      total_revenue:           0,
      total_collected:         0,
      total_outstanding:       0,
      total_leads:             0,
      total_delivered:         0,
      total_accepted:          0,
      overall_acceptance_rate: null,
    }
  }

  const allLeads    = provider.listLeads()
  const allInvoices = campaigns.flatMap(c => provider.listInvoices({ campaign_id: c.id }))

  const total_leads     = allLeads.length
  const total_delivered = allLeads.filter(l => l.status === 'delivered').length
  const total_accepted  = allLeads.filter(l => l.status === 'accepted').length
  const total_rejected  = allLeads.filter(l => l.status === 'rejected').length

  // Acceptance rate = accepted / (accepted + rejected) — same formula as per-campaign
  const total_reviewed          = total_accepted + total_rejected
  const overall_acceptance_rate = total_reviewed > 0
    ? Math.round((total_accepted / total_reviewed) * 1000) / 10
    : null

  const total_revenue   = allInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const total_collected = allInvoices.reduce((sum, inv) => {
    return sum + provider.listPayments(inv.id).reduce((s, p) => s + p.amount, 0)
  }, 0)

  return {
    total_revenue,
    total_collected,
    total_outstanding:       total_revenue - total_collected,
    total_leads,
    total_delivered,
    total_accepted,
    overall_acceptance_rate,
  }
}

/**
 * Return uninvoiced accepted leads and their revenue potential for a campaign.
 */
export function getUninvoicedRevenue(
  provider: DataProvider,
  campaignId: string
): UninvoicedRevenue | null {
  const campaign = provider.getCampaign(campaignId)
  if (!campaign) return null

  const uninvoiced       = getUninvoicedLeads(provider, campaignId)
  const uninvoiced_count = uninvoiced.length

  return {
    campaign_id:        campaignId,
    uninvoiced_count,
    unit_price:         campaign.unit_price,
    uninvoiced_revenue: uninvoiced_count * campaign.unit_price,
  }
}
