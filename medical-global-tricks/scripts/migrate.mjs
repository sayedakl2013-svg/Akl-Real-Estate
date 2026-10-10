// Applies db/migrations/*.sql in order, once each, inside a transaction.
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
const dir = path.join(process.cwd(), 'db/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
for (const f of files) {
  if (done.has(f)) continue;
  console.log('applying', f);
  await client.query('BEGIN');
  try {
    await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('failed', f, e.message);
    process.exit(1);
  }
}
console.log('migrations up to date');
await client.end();
