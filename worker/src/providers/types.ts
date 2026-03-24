// BOSS HQ — Revenue System Types
// Used by MockDataProvider and (future) RealDataProvider

export type LeadStatus    = 'pending' | 'delivered' | 'accepted' | 'rejected'
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid'
export type BillingType   = 'per_lead' | 'flat_fee' | 'retainer'

export interface BillingClient {
  id:         string
  name:       string
  industry:   string
  created_at: string
}

export interface BillingCampaign {
  id:           string
  client_id:    string
  name:         string
  status:       'active' | 'paused' | 'completed'
  billing_type: BillingType
  unit_price:   number      // price per accepted lead (for per_lead)
  created_at:   string
}

export interface LeadRecord {
  id:                   string
  campaign_id:          string
  name:                 string
  email:                string       // natural dedup key
  status:               LeadStatus
  delivered_at:         string | null
  accepted_at:          string | null
  invoice_id:           string | null  // null = eligible for invoicing; non-null = already invoiced
  price_at_acceptance:  number | null  // snapshot of unit_price at time of acceptance; null until accepted
  created_at:           string
}

// One line per accepted lead included in an invoice.
// Captures the price at the time of invoicing — invoice is self-contained after creation.
// NOTE: stored as a JSON column in D1 on migration; will need normalisation if queried individually.
export interface InvoiceLineItem {
  lead_id: string
  price:   number   // price_at_acceptance snapshot — never recalculated
}

export interface InvoiceRecord {
  id:             string
  invoice_number: string        // human-readable, e.g. "INV-001"
  client_id:      string
  campaign_id:    string
  billing_type:   BillingType
  unit_count:     number | null // null for retainer
  unit_price:     number | null // null for retainer
  total:          number        // must equal sum(line_items[].price)
  line_items:     InvoiceLineItem[]  // populated at generation; invoice does not depend on leads after this
  status:         InvoiceStatus
  created_at:     string
  sent_at:        string | null
}

export interface BillingPayment {
  id:         string
  invoice_id: string
  amount:     number
  paid_at:    string
}
