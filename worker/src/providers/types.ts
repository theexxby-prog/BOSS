// BOSS HQ — Revenue System Types
// Used by MockDataProvider and (future) RealDataProvider

export type LeadStatus       = 'pending' | 'delivered' | 'accepted' | 'rejected'
export type InvoiceStatus    = 'draft' | 'sent' | 'partial' | 'paid'
export type BillingType      = 'per_lead' | 'flat_fee' | 'retainer'
export type AcceptanceSource = 'convertr' | 'hubspot' | 'manual'
export type ClientStatus     = 'active' | 'paused'
export type ClientType       = 'direct' | 'agency'

// Primary point of contact at the client — used for comms, not auth.
export interface ClientContact {
  name:  string
  email: string
  phone: string | null
}

export interface BillingClient {
  id:              string
  name:            string
  status:          ClientStatus
  type:            ClientType
  industry:        string
  primary_contact: ClientContact
  domain:          string        // e.g. "apexventures.com" — used for dedup and branding
  timezone:        string        // IANA timezone, e.g. "America/New_York"
  account_owner:   string        // internal owner (BOSS team member name)
  created_at:      string
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
  email:                string             // natural dedup key
  external_id:          string | null      // ID used by external systems (Convertr, HubSpot); used for webhook mapping
  status:               LeadStatus
  delivered_at:         string | null
  accepted_at:          string | null
  rejected_at:          string | null      // set when status → rejected
  acceptance_source:    AcceptanceSource | null  // who made the accept/reject decision; immutable after invoicing
  invoice_id:           string | null      // null = eligible for invoicing; non-null = already invoiced
  price_at_acceptance:  number | null      // snapshot of unit_price at time of acceptance; null until accepted
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
