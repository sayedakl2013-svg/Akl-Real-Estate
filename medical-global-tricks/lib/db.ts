import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

// One pool per server process. Keep `max` modest and put PgBouncer in front
// of Postgres when running many app instances (see docs/SCALING.md).
const globalForPool = globalThis as unknown as { __mgtPool?: Pool };

export const pool =
  globalForPool.__mgtPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  });
if (process.env.NODE_ENV !== 'production') globalForPool.__mgtPool = pool;

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query<T>(text, params as any[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
