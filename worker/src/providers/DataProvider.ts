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
  LeadRecord,
  InvoiceRecord,
  BillingPayment,
  LeadStatus,
  InvoiceStatus,
} from './types'

export interface DataProvider {
  // ─── Clients ─────────────────────────────────────────────────────────────
  listClients(): BillingClient[]
  getClient(id: string): BillingClient | null

  // ─── Campaigns ───────────────────────────────────────────────────────────
  listCampaigns(clientId?: string): BillingCampaign[]
  getCampaign(id: string): BillingCampaign | null

  // ─── Leads ───────────────────────────────────────────────────────────────
  listLeads(filters?: { campaign_id?: string; status?: LeadStatus }): LeadRecord[]
  getLead(id: string): LeadRecord | null
  createLead(data: Omit<LeadRecord, 'id' | 'created_at'>): LeadRecord
  updateLeadStatus(id: string, status: LeadStatus, timestamps?: {
    delivered_at?:        string
    accepted_at?:         string
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
