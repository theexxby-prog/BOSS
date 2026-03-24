// BOSS HQ — Client Service
// Identity and lifecycle management for clients.
// Stage 1: core CRUD only. No billing logic (Stage 2). No integration config (Stage 3).

import type { DataProvider } from '../providers/DataProvider'
import type { BillingClient, BillingCampaign } from '../providers/types'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ClientNotFoundError extends Error {
  constructor(id: string) { super(`Client not found: ${id}`) }
}

export class ClientValidationError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Return all clients, optionally filtered by status.
 */
export function listClients(
  provider: DataProvider,
  status?: BillingClient['status']
): BillingClient[] {
  const all = provider.listClients()
  return status ? all.filter(c => c.status === status) : all
}

/**
 * Return a single client. Throws if not found.
 */
export function getClient(provider: DataProvider, id: string): BillingClient {
  const client = provider.getClient(id)
  if (!client) throw new ClientNotFoundError(id)
  return client
}

/**
 * Create a new client.
 * Rules:
 *   - name is required and must be non-empty
 *   - domain must be non-empty
 *   - primary_contact.email must be present
 */
export function createClient(
  provider: DataProvider,
  data: Omit<BillingClient, 'id' | 'created_at'>
): BillingClient {
  if (!data.name?.trim()) {
    throw new ClientValidationError('Client name is required')
  }
  if (!data.domain?.trim()) {
    throw new ClientValidationError('Client domain is required')
  }
  if (!data.primary_contact?.email?.trim()) {
    throw new ClientValidationError('Primary contact email is required')
  }
  return provider.createClient(data)
}

/**
 * Update mutable client fields.
 * Rules:
 *   - Client must exist
 *   - id and created_at are immutable (excluded from patch type)
 */
export function updateClient(
  provider: DataProvider,
  id: string,
  patch: Partial<Omit<BillingClient, 'id' | 'created_at'>>
): BillingClient {
  const existing = provider.getClient(id)
  if (!existing) throw new ClientNotFoundError(id)
  return provider.updateClient(id, patch)!
}

/**
 * Return all campaigns for a client.
 */
export function getCampaignsByClient(
  provider: DataProvider,
  clientId: string
): BillingCampaign[] {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)
  return provider.listCampaigns(clientId)
}
