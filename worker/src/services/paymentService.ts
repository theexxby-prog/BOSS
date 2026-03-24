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
 *   - Overpayment is allowed (outstanding balance goes negative — status still set to 'paid')
 * After recording:
 *   - Recalculates outstanding balance
 *   - Updates invoice status: outstanding > 0 → 'partial', outstanding <= 0 → 'paid'
 *   - This is idempotent: replaying the same payment sequence yields the same status
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

  const payment = provider.createPayment({
    invoice_id: invoiceId,
    amount,
    paid_at: today(),
  })

  // Derive new invoice status from total payments after this one
  const totalPaid   = provider.listPayments(invoiceId).reduce((sum, p) => sum + p.amount, 0)
  const outstanding = invoice.total - totalPaid
  const newStatus   = outstanding <= 0 ? 'paid' : 'partial'

  // Only update if status actually needs to change (avoids unnecessary writes)
  if (invoice.status !== newStatus) {
    provider.updateInvoice(invoiceId, { status: newStatus })
  }

  return payment
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
