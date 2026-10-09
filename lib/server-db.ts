import { Pool, QueryResult } from 'pg';

const globalForDb = globalThis as unknown as { pool?: Pool; currentUrl?: string };

function getPool(): Pool {
  const currentUrl = process.env.DATABASE_URL;
  if (!currentUrl) throw new Error('DATABASE_URL is not configured');

  if (!globalForDb.pool || globalForDb.currentUrl !== currentUrl) {
    if (globalForDb.pool) {
      globalForDb.pool.end().catch(() => {});
    }
    globalForDb.pool = new Pool({
      connectionString: currentUrl,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    globalForDb.currentUrl = currentUrl;
  }
  return globalForDb.pool;
}

export function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, values);
}
