# Operations

## Deploying

Requirements: Node 20+, PostgreSQL 14+, a persistent volume (or object storage) for `STORAGE_DIR`, and HTTPS in front.

```bash
npm ci && npm run build
npm run db:migrate && npm run db:seed
# standalone output: copy static assets next to the server, then run it
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
NODE_ENV=production PORT=3000 node .next/standalone/server.js
```

Run `node scripts/maintenance.mjs` every 5–15 minutes, and `npm run backup` nightly (cron or your platform's scheduler).

### Keeping the preview private

Set `SITE_ACCESS_PASSWORD` (and optionally `SITE_ACCESS_USER`). The whole site then asks for a shared password before anything loads. The Stripe webhook path stays reachable so payments can still be confirmed. `SITE_NOINDEX=true` (the default) sends `noindex, nofollow` on every response. Set `SITE_NOINDEX=false` and remove the password only at public launch.

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` from your transactional email provider, and configure SPF/DKIM for the sending domain. Until then, verification and reset emails are **not sent**: they sit in *Admin → Email outbox* marked `not_configured`, and admins confirm accounts manually from *Admin → Students*. The UI says so; nothing pretends an email was sent.

### First admin

Register normally, then run `npm run make-admin -- you@example.com`. Admins can promote other users to `editor` (they can write content and submit it for review) or `admin` (they can publish, sell, and manage students) in *Admin → Students*.

## Backups and restore

- `scripts/backup.sh` writes a custom-format `pg_dump` plus a tarball of `STORAGE_DIR`. It verifies the dump with `pg_restore --list` and prunes copies older than `RETAIN_DAYS`. Encrypt the output and copy it off the server, for example to object storage with versioning or object lock.
- In production, also turn on your managed database's **point-in-time recovery**. Nightly dumps are a second line of defence.
- `scripts/restore.sh` restores into an **empty** database and prints row counts. Check it, then repoint `DATABASE_URL`. Never restore over the live database.
- Rehearse a restore every month. The round trip was tested during development (313 questions, users and attempts restored).

## Security checklist

- [x] Passwords hashed with scrypt; session and email tokens stored only as SHA-256 hashes
- [x] HttpOnly, SameSite=Lax, Secure (in production) cookies; server-side session revocation
- [x] Password change signs out other sessions; password reset signs out all of them
- [x] 2-device limit enforced under a row lock; replacing a device signs out the old one
- [x] Every study query filters by the signed-in user. Attempts and items are checked for ownership (the e2e test checks cross-user access is refused)
- [x] Course content, PDFs and videos are served only after an access check. Storage paths are never exposed
- [x] Admin APIs check the role on the server for every action. Editors can't publish, sell or manage students
- [x] Origin check on every state-changing request; rate limits on sign-in, registration, reset and exam start
- [x] CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy
- [x] Question HTML sanitised to a small tag allow-list on import and on edit
- [x] Audit log of admin actions, sign-ins and payments
- [ ] Rotate any secrets that were ever committed (see the repository root: `next-env.d.ts` and `.env.local` there contain a Supabase key)
- [ ] Add an uptime monitor and error alerting
- [ ] Get the legal pages reviewed (they show a "draft" banner until `LEGAL_DRAFT=false`)
