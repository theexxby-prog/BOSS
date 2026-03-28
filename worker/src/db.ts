// D1 query helpers — thin wrappers for clean route code

import type { D1Database } from '@cloudflare/workers-types';

export async function dbAll<T>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.prepare(query).bind(...params).all<T>();
  return result.results;
}

export async function dbFirst<T>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  return db.prepare(query).bind(...params).first<T>();
}

export async function dbRun(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<{ success: boolean; lastRowId: number | null; rowsAffected: number }> {
  const result = await db.prepare(query).bind(...params).run();
  return {
    success: result.success,
    lastRowId: result.meta?.last_row_id ?? null,
    rowsAffected: result.meta?.changes ?? 0,
  };
}

// Pagination helper — returns {limit, offset} from URL params
export function paginate(url: URL): { limit: number; offset: number; page: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  return { limit, offset: (page - 1) * limit, page };
}

// Touch updated_at on any table row
export async function touchUpdated(db: D1Database, table: string, id: number): Promise<void> {
  await db
    .prepare(`UPDATE ${table} SET updated_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run();
}
