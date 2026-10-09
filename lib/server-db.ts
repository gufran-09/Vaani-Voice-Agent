import { Pool, QueryResult } from 'pg';

const globalForDb = globalThis as unknown as { pool?: Pool };
const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return pool.query<T>(text, values);
}
