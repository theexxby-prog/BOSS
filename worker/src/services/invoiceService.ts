// BOSS HQ — Invoice Service
// Handles invoice generation and locking. No payment logic here.

import type { DataProvider } from '../providers/DataProvider'
import type { InvoiceRecord, LeadRecord } from '../providers/types'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class InvoiceError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Return all accepted leads with invoice_id = null for a campaign.
 * These are eligible to be included in the next invoice.
 */
export function getUninvoicedLeads(provider: DataProvider, campaignId: string): LeadRecord[] {
  return provider
    .listLeads({ campaign_id: campaignId, status: 'accepted' })
    .filter(l => l.invoice_id === null)
}

/**
 * Generate a draft invoice for a campaign from its uninvoiced accepted leads.
 * Rules:
 *   - Campaign must exist
 *   - At least one uninvoiced accepted lead must exist
 *   - Creates invoice with status = 'draft'
 *   - Sets invoice_id on each included lead (marks them as invoiced)
 */
export function generateInvoice(provider: DataProvider, campaignId: string): InvoiceRecord {
  const campaign = provider.getCampaign(campaignId)
  if (!campaign) throw new InvoiceError(`Campaign not found: ${campaignId}`)

  const uninvoiced = getUninvoicedLeads(provider, campaignId)
  if (uninvoiced.length === 0) {
    throw new InvoiceError(
      `Cannot generate invoice for campaign "${campaignId}": no uninvoiced accepted leads`
    )
  }

  const unit_count = uninvoiced.length
  const unit_price = campaign.unit_price
  const total      = unit_count * unit_price

  const invoice = provider.createInvoice({
    invoice_number: provider.nextInvoiceNumber(),
    client_id:      campaign.client_id,
    campaign_id:    campaignId,
    billing_type:   'per_lead',
    unit_count,
    unit_price,
    total,
    status:         'draft',
    sent_at:        null,
  })

  // Mark each lead as invoiced — defensive check ensures we never overwrite an existing link
  for (const lead of uninvoiced) {
    if (lead.invoice_id === null) {
      provider.setLeadInvoice(lead.id, invoice.id)
    }
  }

  return invoice
}

/**
 * Lock an invoice by setting status = 'sent' and recording sent_at.
 * Rules:
 *   - Invoice must exist
 *   - Must be in 'draft' status (idempotent: already 'sent' returns existing state)
 */
export function sendInvoice(provider: DataProvider, invoiceId: string): InvoiceRecord {
  const invoice = provider.getInvoice(invoiceId)
  if (!invoice) throw new InvoiceError(`Invoice not found: ${invoiceId}`)

  if (invoice.status === 'sent') return invoice  // idempotent

  if (invoice.status !== 'draft') {
    throw new InvoiceError(
      `Cannot send invoice "${invoiceId}": status is "${invoice.status}", expected "draft"`
    )
  }

  return provider.updateInvoice(invoiceId, { status: 'sent', sent_at: today() })!
}
