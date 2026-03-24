// BOSS HQ — Billing Config Service
// Manages financial identity for clients: billing entity, payment terms, currency.
// Stage 2. Does not touch invoice calculations — only enriches invoice metadata.

import type { DataProvider } from '../providers/DataProvider'
import type { ClientBilling } from '../providers/types'
import { ClientNotFoundError } from './clientService'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class BillingConfigError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Return the billing config for a client.
 * Throws if the client doesn't exist.
 * Returns null if billing config has not been set up yet.
 */
export function getBillingConfig(
  provider: DataProvider,
  clientId: string
): ClientBilling | null {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)
  return provider.getBillingByClient(clientId)
}

/**
 * Create or update the billing config for a client.
 * Acts as an upsert — safe to call repeatedly.
 * Rules:
 *   - Client must exist
 *   - billing_entity_name must be non-empty (it appears on all invoices)
 *   - billing_email must be present
 *   - payment_terms_days must be a positive integer
 *   - currency must be a 3-letter ISO 4217 code
 */
export function updateBillingConfig(
  provider: DataProvider,
  clientId: string,
  data: Omit<ClientBilling, 'client_id'>
): ClientBilling {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)

  if (!data.billing_entity_name?.trim()) {
    throw new BillingConfigError('billing_entity_name is required — it appears on all invoices')
  }
  if (!data.billing_email?.trim()) {
    throw new BillingConfigError('billing_email is required')
  }
  if (!Number.isInteger(data.payment_terms_days) || data.payment_terms_days <= 0) {
    throw new BillingConfigError('payment_terms_days must be a positive integer')
  }
  if (!/^[A-Z]{3}$/.test(data.currency)) {
    throw new BillingConfigError('currency must be a 3-letter ISO 4217 code (e.g. "USD", "GBP")')
  }

  return provider.updateBilling(clientId, data)
}
