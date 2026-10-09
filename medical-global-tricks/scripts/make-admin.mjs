// Usage: npm run make-admin -- someone@example.com   (or set ADMIN_EMAIL)
// The account must already exist (register through the site first).
import './env.mjs';
import pg from 'pg';

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? '').toLowerCase();
if (!email) { console.error('usage: make-admin <email>'); process.exit(1); }
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const r = await db.query(`UPDATE users SET role = 'admin', email_verified_at = COALESCE(email_verified_at, now()) WHERE email = $1 RETURNING id`, [email]);
console.log(r.rowCount ? `${email} is now an admin` : `no account found for ${email}`);
await db.end();
