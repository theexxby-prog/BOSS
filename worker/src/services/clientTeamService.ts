// BOSS HQ — Client Team Service
// Manages team members (ClientUser) per client.
// No auth system — this is a data structure only. Role is informational.

import type { DataProvider } from '../providers/DataProvider'
import type { ClientUser, ClientUserRole } from '../providers/types'
import { ClientNotFoundError } from './clientService'

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ClientTeamError extends Error {
  constructor(message: string) { super(message) }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_ROLES: ClientUserRole[] = ['admin', 'campaign_manager', 'finance', 'viewer']

function assertValidRole(role: string): asserts role is ClientUserRole {
  if (!VALID_ROLES.includes(role as ClientUserRole)) {
    throw new ClientTeamError(
      `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`
    )
  }
}

function assertValidEmail(email: string): void {
  if (!email || !email.includes('@')) {
    throw new ClientTeamError(`Invalid email: "${email}"`)
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Return all team members for a client.
 * Throws if the client doesn't exist.
 */
export function getUsersByClient(
  provider: DataProvider,
  clientId: string
): ClientUser[] {
  const client = provider.getClient(clientId)
  if (!client) throw new ClientNotFoundError(clientId)
  return provider.getUsersByClient(clientId)
}

/**
 * Add a team member to a client.
 * Rules:
 *   - Client must exist
 *   - name, email, and role are required
 *   - email must be unique within the client's team
 *   - role must be a valid ClientUserRole
 */
export function addUserToClient(
  provider: DataProvider,
  data: Omit<ClientUser, 'id' | 'created_at'>
): ClientUser {
  const client = provider.getClient(data.client_id)
  if (!client) throw new ClientNotFoundError(data.client_id)

  if (!data.name?.trim()) {
    throw new ClientTeamError('User name is required')
  }

  assertValidEmail(data.email)
  assertValidRole(data.role)

  // Enforce email uniqueness within this client's team
  const existing = provider.getUsersByClient(data.client_id)
  const duplicate = existing.find(u => u.email.toLowerCase() === data.email.toLowerCase())
  if (duplicate) {
    throw new ClientTeamError(
      `A team member with email "${data.email}" already exists for client "${data.client_id}"`
    )
  }

  return provider.addUserToClient(data)
}
