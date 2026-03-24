// BOSS HQ — DataProvider Interface
// Both MockDataProvider and RealDataProvider must implement this.
// Service layer depends only on this interface — never on a concrete provider.

// Thrown by any provider when a financial field update is attempted on a non-draft invoice.
export class InvoiceLockError extends Error {
  constructor(message: string) { super(message) }
}

import type {
  BillingClient,
  BillingCampaign,
  ClientBilling,
  ClientIntegration,
  LeadRecord,
  InvoiceRecord,
  BillingPayment,
  LeadStatus,
  InvoiceStatus,
  AcceptanceSource,
} from './types'

export interface DataProvider {
  // ─── Clients ─────────────────────────────────────────────────────────────
  listClients(): BillingClient[]
  getClient(id: string): BillingClient | null
  createClient(data: Omit<BillingClient, 'id' | 'created_at'>): BillingClient
  updateClient(id: string, patch: Partial<Omit<BillingClient, 'id' | 'created_at'>>): BillingClient | null

  // ─── Client Billing Config ───────────────────────────────────────────────
  // One billing config per client. updateBilling acts as upsert.
  getBillingByClient(clientId: string): ClientBilling | null
  updateBilling(clientId: string, data: Omit<ClientBilling, 'client_id'>): ClientBilling

  // ─── Client Integration Config ───────────────────────────────────────────
  // One integration config per client. acceptance_source is immutable after creation.
  getIntegrationByClient(clientId: string): ClientIntegration | null
  // Throws if an integration already exists for this client (acceptance_source is immutable).
  createIntegration(data: ClientIntegration): ClientIntegration
  // Only delivery_method and config may be updated — acceptance_source is excluded by type.
  updateIntegrationConfig(
    clientId: string,
    patch: Pick<ClientIntegration, 'delivery_method' | 'config'>
  ): ClientIntegration | null

  // ─── Campaigns ───────────────────────────────────────────────────────────
  listCampaigns(clientId?: string): BillingCampaign[]
  getCampaign(id: string): BillingCampaign | null

  // ─── Leads ───────────────────────────────────────────────────────────────
  listLeads(filters?: { campaign_id?: string; status?: LeadStatus }): LeadRecord[]
  getLead(id: string): LeadRecord | null
  // Looks up a lead by its external_id (set by CRM/Convertr at create time).
  // Returns null if no match — callers must handle gracefully (do not throw).
  getLeadByExternalId(externalId: string): LeadRecord | null
  createLead(data: Omit<LeadRecord, 'id' | 'created_at'>): LeadRecord
  updateLeadStatus(id: string, status: LeadStatus, timestamps?: {
    delivered_at?:        string
    accepted_at?:         string
    rejected_at?:         string
    acceptance_source?:   AcceptanceSource | null
    price_at_acceptance?: number | null
  }): LeadRecord | null
  setLeadInvoice(id: string, invoiceId: string): LeadRecord | null

  // ─── Invoices ────────────────────────────────────────────────────────────
  listInvoices(filters?: { campaign_id?: string; status?: InvoiceStatus }): InvoiceRecord[]
  getInvoice(id: string): InvoiceRecord | null
  createInvoice(data: Omit<InvoiceRecord, 'id' | 'created_at'>): InvoiceRecord
  updateInvoice(id: string, patch: Partial<InvoiceRecord>): InvoiceRecord | null

  // ─── Payments ────────────────────────────────────────────────────────────
  listPayments(invoiceId: string): BillingPayment[]
  createPayment(data: Omit<BillingPayment, 'id'>): BillingPayment

  // ─── Sequences ───────────────────────────────────────────────────────────
  nextInvoiceNumber(): string   // returns "INV-001", "INV-002", etc.
}
