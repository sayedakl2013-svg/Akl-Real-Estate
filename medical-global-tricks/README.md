# Medical Global Tricks

**Learn with clarity. Practise with confidence. — ذاكر بوضوح. وتدرّب بثقة.**

An exam-preparation platform for medical licensing exams (starting with UAE and Saudi tracks). It's bilingual (Arabic RTL / English LTR) and built with Next.js 16, React 19 and PostgreSQL.

This folder is self-contained. The files at the repository root belong to an earlier real-estate prototype; they were left untouched.

## What's in it

| Area | Implemented |
|---|---|
| Identity | Brand header (logo, user name, language switch, sound toggle), footer with automatic year, Manrope + Cairo fonts, navy / turquoise / white palette with violet and gold accents |
| Catalogue | Courses filtered by country, authority, professional track, specialty and status. *Available* and *planned* courses are clearly separated, and planned courses can't be bought. Built for around 100 independent courses |
| Studying | Dashboard, question library (search, domain filter, saved items), oral practice (reveal → reference answer, explanation, source → "I recalled it" / "Needs review"), timed exams (by domain, mixed or from review items; choose the question count and time limit; navigator; flag for review; autosave; resume), mistakes notebook with re-practice, history with per-domain self-assessment analysis, checkable study plan, summary PDFs, lesson videos |
| Honesty | Results are labelled everywhere as **self-assessment, not official scores**. There's no automatic medical marking. Verification notes from the source material are kept |
| Accounts | Email + password (scrypt), server-side sessions, email verification and password reset (tokens are hashed and expire), a 2-device limit with a replacement-request → admin-approval flow |
| Payments | Stripe Checkout for one-time purchases and subscriptions. **Access is granted only from signature-verified webhooks**, never from the success page. Handles renewals (`invoice.paid`), cancellation (keeps access to the end of the period), expiry and refunds. Idempotent, with amount and currency checks |
| Admin | Courses, domains, offers/prices, questions (draft → in review → published, with revisions), binder import, PDFs, videos, students, access grants and revocations, devices, device requests, orders and gateway events, email outbox, usage and sales reports, audit log |
| Security | Per-user data isolation in every query, access-checked file and video streaming, Origin check on all mutations, rate limiting, CSP and security headers, optional site-wide password gate and `noindex` for private previews |
| Motion & sound | Subtle entrance, reveal and progress animations, an animated hero, calm exam mode, `prefers-reduced-motion` respected. Short synthesised cues (tap / start / save / finish) that are **muted by default**. The preference is remembered, and audio failures are ignored |

See [`docs/STATUS.md`](docs/STATUS.md) for what is done and what still needs external accounts or decisions.

## Quick start (local)

```bash
cp .env.example .env.local          # set DATABASE_URL etc.
npm install
npm run db:migrate
npm run db:seed                      # catalogue, 15 domains, study plan template (idempotent)
node scripts/import-binder.mjs /path/to/aesthetic_medicine_study_binder.html   # question bank (not in git)
npm run pdf:build -- aesthetic-medicine-oral --publish                         # 15 summary PDFs
node scripts/add-video.mjs teaser.mp4 --title-en="…" --title-ar="…" --promo --public --publish
npm run build && npm start
```

Create your account on `/register`, then `npm run make-admin -- you@example.com`.

**Course content isn't committed.** This repository is public, so the question bank, PDFs and videos live only in the database and `STORAGE_DIR`. They're loaded through the import scripts above or through *Admin → Questions → Import*.

## Scripts

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Apply `db/migrations/*.sql` once each |
| `npm run db:seed` | Insert-only catalogue seed. Never overwrites edits or student data |
| `node scripts/import-binder.mjs <file>` | Import or refresh the oral question bank. Never overwrites questions edited in admin |
| `npm run pdf:build -- <slug> [--publish]` | Build the domain summary PDFs from published content |
| `node scripts/add-video.mjs <file> …` | Store a video privately and register it |
| `node scripts/maintenance.mjs` | Cron job: mark expired access and attempts, purge old sessions and tokens |
| `npm run backup` / `scripts/restore.sh` | Database + storage backup with verification; restore into an empty database |
| `npm run test:e2e` | Playwright end-to-end checks against a running server (33 checks) |
| `tests/load/exam-burst.js` | k6 load test for mass exam start, autosave and submit |

## Docs

- [`docs/STATUS.md`](docs/STATUS.md): delivery status (Arabic + English)
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md): Stripe setup for a SHAMS free-zone company, webhook events, PayTabs / Tap options
- [`docs/SCALING.md`](docs/SCALING.md): architecture for 25,000 concurrent examinees, and how to *prove* it
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md): deployment, privacy gate, backups, security checklist

© Medical Global Tricks. All rights reserved. Cited reference materials remain the property of their respective owners.
