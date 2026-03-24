// BOSS HQ — Payment Service
// Records payments against invoices and calculates balances.
// Does not update invoice status — that is a separate concern.

import type { DataProvider } from '../providers/DataProvider'
import type { BillingPayment } from '../providers/types'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Record a payment against an invoice.
 * Rules:
 *   - Invoice must exist
 *   - Invoice must be in 'sent', 'partial', or 'paid' status (not 'draft')
 *   - Amount must be positive
 *   - Overpayment is allowed (outstanding balance goes negative)
 */
export function recordPayment(
  provider: DataProvider,
  invoiceId: string,
  amount: number
): BillingPayment {
  const invoice = provider.getInvoice(invoiceId)
  if (!invoice) throw new PaymentError(`Invoice not found: ${invoiceId}`)

  if (invoice.status === 'draft') {
    throw new PaymentError(
      `Cannot record payment for invoice "${invoiceId}": invoice has not been sent yet`
    )
  }

  if (amount <= 0) {
    throw new PaymentError(`Payment amount must be positive (got ${amount})`)
  }

  return provider.createPayment({
    invoice_id: invoiceId,
    amount,
    paid_at: today(),
  })
}

/**
 * Return all payments recorded against an invoice.
 */
export function getPaymentsForInvoice(
  provider: DataProvider,
  invoiceId: string
): BillingPayment[] {
  return provider.listPayments(invoiceId)
}

/**
 * Calculate the outstanding balance for an invoice.
 * outstanding = invoice.total - sum(all payments)
 * A negative value means overpayment has occurred.
 */
export function getOutstandingBalance(provider: DataProvider, invoiceId: string): number {
  const invoice = provider.getInvoice(invoiceId)
  if (!invoice) throw new PaymentError(`Invoice not found: ${invoiceId}`)

  const paid = provider
    .listPayments(invoiceId)
    .reduce((sum, p) => sum + p.amount, 0)

  return invoice.total - paid
}
