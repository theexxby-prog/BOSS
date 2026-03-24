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
  id:           string
  campaign_id:  string
  name:         string
  email:        string       // natural dedup key
  status:       LeadStatus
  delivered_at: string | null
  accepted_at:  string | null
  invoice_id:   string | null  // null = eligible for invoicing; non-null = already invoiced
  created_at:   string
}

export interface InvoiceRecord {
  id:             string
  invoice_number: string        // human-readable, e.g. "INV-001"
  client_id:      string
  campaign_id:    string
  billing_type:   BillingType
  unit_count:     number | null // null for retainer
  unit_price:     number | null // null for retainer
  total:          number
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
