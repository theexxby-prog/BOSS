// BOSS HQ — Integration Service
// Manages how leads are delivered and accepted for each client.
// Stage 3. acceptance_source is immutable after creation — it is the enforcement
// authority for all leads under the client's campaigns.

import type { DataProvider } from '../providers/DataProvider'
import type { ClientIntegration } from '../providers/types'
import { ClientNotFoundError } from './clientService'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class IntegrationError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Return the integration config for a client.
 * Throws if the client doesn't exist.
 * Returns null if no integration has been configured yet.
 */
export function getIntegration(
  provider: DataProvider,
  clientId: string
): ClientIntegration | null {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)
  return provider.getIntegrationByClient(clientId)
}

/**
 * Create the integration config for a client.
 * Rules:
 *   - Client must exist
 *   - delivery_method and acceptance_source are required
 *   - acceptance_source is IMMUTABLE after this call — it cannot be changed
 *   - Throws if an integration config already exists for this client
 *
 * Why immutable: acceptance_source becomes the enforcement rule for all leads
 * under this client's campaigns. Changing it mid-flight would invalidate
 * historical acceptance decisions and create billing disputes.
 */
export function createIntegration(
  provider: DataProvider,
  data: ClientIntegration
): ClientIntegration {
  const client = provider.getClient(data.client_id)
  if (!client) throw new ClientNotFoundError(data.client_id)

  const existing = provider.getIntegrationByClient(data.client_id)
  if (existing) {
    throw new IntegrationError(
      `Integration config already exists for client "${data.client_id}" ` +
      `(acceptance_source: "${existing.acceptance_source}"). ` +
      `acceptance_source is immutable — contact support to change it.`
    )
  }

  return provider.createIntegration(data)
}

/**
 * Update mutable integration fields (delivery_method, config).
 * acceptance_source is excluded from the patch type — it cannot be updated.
 * Rules:
 *   - Client and integration must exist
 */
export function updateIntegrationConfig(
  provider: DataProvider,
  clientId: string,
  patch: Pick<ClientIntegration, 'delivery_method' | 'config'>
): ClientIntegration {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)

  const existing = provider.getIntegrationByClient(clientId)
  if (!existing) {
    throw new IntegrationError(
      `No integration config found for client "${clientId}". ` +
      `Create one first with createIntegration().`
    )
  }

  return provider.updateIntegrationConfig(clientId, patch)!
}

/**
 * Validate that a given acceptance source is permitted for a client.
 * Used by other services to check before performing acceptance actions.
 * Returns the integration config if valid, throws if source is not permitted.
 */
export function assertClientAcceptanceSource(
  provider: DataProvider,
  clientId: string,
  source: ClientIntegration['acceptance_source']
): void {
  const integration = provider.getIntegrationByClient(clientId)
  if (!integration) return  // no config set — no restriction enforced yet

  if (source !== integration.acceptance_source) {
    throw new IntegrationError(
      `Source "${source}" is not permitted for client "${clientId}". ` +
      `This client requires acceptance via "${integration.acceptance_source}".`
    )
  }
}
