// End-to-end checks against a running server.
// Usage: BASE=http://localhost:3100 STRIPE_WEBHOOK_SECRET=whsec_... node tests/e2e.mjs
// Needs DATABASE_URL (for test setup such as promoting an admin and forcing a timer to expire).
import '../scripts/env.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import Stripe from 'stripe';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const SHOTS = process.env.SHOTS ?? 'tests/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const run = Date.now().toString(36);
// Repeated local runs come from one IP; start each run with fresh rate-limit windows.
await db.query('DELETE FROM rate_limits');
const PW = 'Study-pass-2026';
const results = [];
async function step(name, fn) {
  try { await fn(); results.push(['PASS', name]); console.log('PASS', name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 4).join('\n    ')); }
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
const noOverflow = async (page) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(o <= 1, `horizontal overflow of ${o}px`);
};

const browser = await chromium.launch();
const ctx = (opts = {}) => browser.newContext({ baseURL: BASE, ...opts });

async function register(page, name, email) {
  await page.goto('/register');
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await page.fill('#confirm', PW);
  await page.click('button[type=submit], form button.btn-primary');
  await page.waitForURL('**/dashboard**');
}
async function login(page, email) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await page.click('form button.btn-primary');
}

const course = (await db.query(`SELECT id, slug FROM courses WHERE slug = 'aesthetic-medicine-oral'`)).rows[0];
const emailA = `student.a.${run}@example.test`, emailB = `student.b.${run}@example.test`, emailAdmin = `admin.${run}@example.test`;

// ───────── Public pages, language, sound, accessibility ─────────
const pub = await ctx({ locale: 'en-GB' });
const p = await pub.newPage();
const consoleErrors = [];
p.on('pageerror', (e) => consoleErrors.push(e.message));

await step('home renders in English with brand, tagline, footer year and independence notice', async () => {
  await p.goto('/');
  assert.equal(await p.getAttribute('html', 'dir'), 'ltr');
  const text = await p.textContent('body');
  assert.match(text, /Medical Global Tricks/);
  assert.match(text, /Learn with clarity\./);
  assert.match(text, new RegExp(`© ${new Date().getFullYear()} Medical Global Tricks\\. All rights reserved\\.`));
  assert.match(text, /not affiliated with, endorsed by or approved by MOHAP, DHA, DOH, SCFHS/);
  await shot(p, '01-home-en-desktop');
});

await step('teaser video does not autoplay or preload; plays only after pressing play', async () => {
  const before = await p.evaluate(() => { const v = document.querySelector('video'); return v ? { paused: v.paused, sources: v.querySelectorAll('source').length, preload: v.preload } : null; });
  assert.ok(before, 'teaser video element exists');
  assert.deepEqual(before, { paused: true, sources: 0, preload: 'none' });
  const req = p.waitForRequest((r) => r.url().includes('/api/videos/'), { timeout: 5000 });
  await p.click('.video-poster-btn');
  await req;
});

await step('catalogue separates available and planned courses; planned course cannot be bought', async () => {
  await p.goto('/courses');
  const cards = await p.$$eval('.course-card', (els) => els.map((e) => e.textContent));
  assert.ok(cards.some((c) => /Available/.test(c) && /Aesthetic Medicine — Oral Exam Preparation/.test(c)));
  assert.ok(cards.filter((c) => /Planned/.test(c)).length >= 3);
  await p.goto('/courses?status=planned');
  assert.ok(!(await p.textContent('main')).includes('Oral Exam Preparation'));
  await p.goto('/courses/aesthetic-medicine-scfhs');
  assert.match(await p.textContent('main'), /planned and not yet available\. It cannot be purchased/);
  assert.equal(await p.$('button:has-text("Get access")'), null);
});

await step('keyboard: first Tab focuses the skip link', async () => {
  await p.goto('/');
  await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement?.className), 'skip-link');
});

await step('sound is muted by default, toggle persists, and a broken AudioContext does not break the UI', async () => {
  await p.goto('/');
  const btn = p.locator('header button[aria-pressed]');
  assert.equal(await btn.getAttribute('aria-pressed'), 'false');
  await btn.click();
  assert.equal(await btn.getAttribute('aria-pressed'), 'true');
  assert.equal(await p.evaluate(() => localStorage.getItem('mgt_sound')), 'on');
  await p.reload();
  assert.equal(await p.locator('header button[aria-pressed]').getAttribute('aria-pressed'), 'true');
  const broken = await ctx();
  await broken.addInitScript(() => { window.AudioContext = function () { throw new Error('no audio'); }; localStorage.setItem('mgt_sound', 'on'); });
  const bp = await broken.newPage();
  const errs = []; bp.on('pageerror', (e) => errs.push(e.message));
  await bp.goto('/');
  await bp.click('header button[aria-pressed]');
  await bp.click('header button[aria-pressed]');
  assert.deepEqual(errs, []);
  await broken.close();
});

await step('Arabic: RTL layout, Cairo font, Arabic tagline and footer', async () => {
  await p.click('header button:has-text("العربية")');
  await p.waitForFunction(() => document.documentElement.dir === 'rtl');
  assert.equal(await p.getAttribute('html', 'lang'), 'ar');
  const text = await p.textContent('body');
  assert.match(text, /ذاكر بوضوح\./);
  assert.match(text, /جميع الحقوق محفوظة/);
  assert.match(await p.evaluate(() => getComputedStyle(document.body).fontFamily), /Cairo/);
  await shot(p, '02-home-ar-desktop');
  await p.click('header button:has-text("English")');
  await p.waitForFunction(() => document.documentElement.dir === 'ltr');
});

await step('legal pages exist (privacy, terms, refund, disclaimer)', async () => {
  for (const pg of ['privacy', 'terms', 'refund', 'disclaimer']) {
    const r = await p.goto(`/legal/${pg}`);
    assert.equal(r.status(), 200, pg);
  }
});

// ───────── Accounts ─────────
const ctxA = await ctx();
const a = await ctxA.newPage();
const ctxB = await ctx();
const b = await ctxB.newPage();
const ctxAdmin = await ctx();
const admin = await ctxAdmin.newPage();

await step('registration creates accounts and sessions; weak passwords are rejected', async () => {
  await a.goto('/register');
  await a.fill('#name', 'Weak'); await a.fill('#email', `weak.${run}@example.test`); await a.fill('#password', 'short'); await a.fill('#confirm', 'short');
  await a.evaluate(() => document.querySelector('#password').removeAttribute('minlength'));
  await a.click('form button.btn-primary');
  await a.waitForSelector('.alert-error');
  await register(a, 'Student A', emailA);
  await register(b, 'Student B', emailB);
  await register(admin, 'Admin User', emailAdmin);
  const n = (await db.query('SELECT count(*)::int AS n FROM users WHERE email = ANY($1)', [[emailA, emailB, emailAdmin]])).rows[0].n;
  assert.equal(n, 3);
  const hash = (await db.query('SELECT password_hash FROM users WHERE email = $1', [emailA])).rows[0].password_hash;
  assert.match(hash, /^scrypt\$/);
});

await step('email delivery is not faked: verification mail kept in outbox as not_configured', async () => {
  const r = (await db.query(`SELECT status FROM email_outbox WHERE to_email = $1 ORDER BY id DESC LIMIT 1`, [emailA])).rows[0];
  assert.equal(r.status, 'not_configured');
  await a.goto('/dashboard');
  assert.match(await a.textContent('main'), /Email delivery is not configured yet/);
});

await step('without access, course content and files are blocked', async () => {
  await a.goto(`/learn/${course.slug}`);
  await a.waitForURL(`**/courses/${course.slug}?access=required`);
  assert.match(await a.textContent('main'), /need access/i);
  const api = await a.request.get(`/api/courses/${course.id}/questions`);
  assert.equal(api.status(), 403);
  const anon = await pub.request.get(`/api/courses/${course.id}/questions`);
  assert.equal(anon.status(), 401);
  const fileId = (await db.query(`SELECT id FROM course_files WHERE course_id = $1 AND status = 'published' LIMIT 1`, [course.id])).rows[0].id;
  assert.equal((await a.request.get(`/api/files/${fileId}`)).status(), 403);
});

await step('admin routes are protected from students', async () => {
  const r = await a.request.post('/api/admin/action', { data: { action: 'enrollment.grant', user_id: 'x', course_id: course.id }, headers: { Origin: BASE } });
  assert.equal(r.status(), 403);
  await a.goto('/admin');
  await a.waitForURL('**/dashboard');
});

await step('cross-site POST is rejected (Origin check)', async () => {
  const r = await a.request.post('/api/account/password', { data: { current: PW, password: 'Another-pass-1' }, headers: { Origin: 'https://evil.example' } });
  assert.equal(r.status(), 403);
});

await step('admin grants course access to Student A from the admin panel', async () => {
  await db.query(`UPDATE users SET role = 'admin', email_verified_at = now() WHERE email = $1`, [emailAdmin]);
  const idA = (await db.query('SELECT id FROM users WHERE email = $1', [emailA])).rows[0].id;
  await admin.goto(`/admin/students/${idA}`);
  await admin.selectOption('select[name=course_id]', String(course.id));
  await admin.fill('input[name=days]', '90');
  await admin.fill('input[name=note]', 'e2e trial grant');
  await admin.click('button:has-text("Grant access")');
  await admin.waitForSelector('td:has-text("admin_grant")');
  await admin.click('button:has-text("Mark email as verified")');
  await admin.waitForSelector('text=email verified');
  await shot(admin, '10-admin-student');
});

// ───────── Studying ─────────
await step('dashboard shows course, domains and self-assessment note', async () => {
  await a.goto(`/learn/${course.slug}`);
  const t = await a.textContent('main');
  assert.match(t, /Anatomy/); assert.match(t, /Hyaluronidase/);
  assert.match(t, /self-assessment\. They are not official exam scores/);
  await shot(a, '03-learn-dashboard');
});

await step('library: search + domain filter + save question', async () => {
  await a.goto(`/learn/${course.slug}/library`);
  await a.fill('#lib-q', 'hyaluronidase');
  await a.waitForFunction(() => /^[1-9]\d* results/.test(document.querySelector('p[aria-live=polite]')?.textContent ?? ''));
  const count = Number((await a.textContent('p[aria-live=polite]')).match(/(\d+)/)[1]);
  assert.ok(count > 5, `search results ${count}`);
  await a.click('.q-item >> nth=0 >> button.q-head');
  await a.click('.q-item >> nth=0 >> button:has-text("Save")');
  await a.waitForSelector('.q-item >> nth=0 >> text=Saved');
  const saved = (await db.query(`SELECT count(*)::int AS n FROM bookmarks b JOIN users u ON u.id = b.user_id WHERE u.email = $1`, [emailA])).rows[0].n;
  assert.equal(saved, 1);
  await shot(a, '04-library');
});

await step('oral practice: reveal with Space, rate with keyboard, ratings saved to the database', async () => {
  await a.goto(`/learn/${course.slug}/practice`);
  const domainId = (await db.query(`SELECT id FROM domains WHERE course_id = $1 AND code = 'K'`, [course.id])).rows[0].id; // 4 questions
  await a.selectOption('#p-d', String(domainId));
  await a.click('button:has-text("Start practice")');
  await a.waitForSelector('.study-card');
  await a.keyboard.press('Space');
  await a.waitForSelector('.answer-panel');
  assert.match(await a.textContent('.answer-panel'), /Reference answer/);
  await shot(a, '05-practice-revealed');
  await a.keyboard.press('1');
  await a.keyboard.press('Space'); await a.keyboard.press('2');
  await a.click('button:has-text("Reveal reference answer")'); await a.click('button:has-text("Needs review")');
  await a.keyboard.press('Space'); await a.keyboard.press('1');
  await a.waitForSelector('text=Session complete');
  await a.waitForTimeout(500);
  const rows = (await db.query(`SELECT last_rating, count(*)::int AS n FROM question_progress qp JOIN users u ON u.id = qp.user_id WHERE u.email = $1 GROUP BY 1`, [emailA])).rows;
  const by = Object.fromEntries(rows.map((r) => [r.last_rating, r.n]));
  assert.deepEqual(by, { recalled: 2, review: 2 });
});

await step('mistakes notebook lists "needs review" items and offers re-practice', async () => {
  await a.goto(`/learn/${course.slug}/mistakes`);
  await a.waitForSelector('.q-item');
  assert.equal(await a.locator('.q-item').count(), 2);
  assert.ok(await a.$('a:has-text("Re-practise these")'));
});

let attemptId;
await step('timed exam: start, reveal, rate, flag, autosave, resume after reload', async () => {
  await a.goto(`/learn/${course.slug}/exams`);
  await a.fill('#ex-n', '5');
  await a.fill('#ex-m', '10');
  await a.click('button:has-text("Start exam")');
  await a.waitForURL(/\/exams\/[0-9a-f-]{36}$/);
  attemptId = a.url().split('/').pop();
  await a.click('button:has-text("Reveal reference answer")');
  await a.click('.rate-bar button:has-text("I recalled it")');
  await a.click('button:has-text("Next")');
  await a.click('button:has-text("Mark for review")');
  await a.fill('textarea[id^=note-]', 'My spoken answer notes');
  await a.click('button:has-text("Reveal reference answer")');
  await a.click('.rate-bar button:has-text("Needs review")');
  await a.waitForSelector('text=Saved');
  await shot(a, '06-exam-runner');
  await a.reload();
  await a.waitForSelector('.nav-grid');
  const cls = await a.$$eval('.nav-grid button', (bs) => bs.map((x) => x.className));
  assert.match(cls[0], /recalled/); assert.match(cls[1], /review/); assert.match(cls[1], /flagged/);
  const note = (await db.query('SELECT note FROM exam_attempt_items WHERE attempt_id = $1 AND position = 2', [attemptId])).rows[0].note;
  assert.equal(note, 'My spoken answer notes');
});

await step('data isolation: Student B cannot read or modify Student A attempt', async () => {
  const r1 = await b.request.patch(`/api/exams/${attemptId}/items/1`, { data: { rating: 'review' }, headers: { Origin: BASE } });
  assert.equal(r1.status(), 404);
  const r2 = await b.request.post(`/api/exams/${attemptId}/submit`, { headers: { Origin: BASE } });
  assert.equal(r2.status(), 404);
});

await step('submit exam → result with per-domain self-assessment; attempt appears in history', async () => {
  a.once('dialog', (d) => d.accept());
  await a.click('button:has-text("Submit exam")');
  await a.waitForURL(/\/result/);
  const t = await a.textContent('main');
  assert.match(t, /Attempt result/); assert.match(t, /Self-assessment by domain/);
  const row = (await db.query('SELECT status, recalled, review, unrated FROM exam_attempts WHERE id = $1', [attemptId])).rows[0];
  assert.deepEqual(row, { status: 'submitted', recalled: 1, review: 1, unrated: 3 });
  await shot(a, '07-exam-result');
  await a.goto(`/learn/${course.slug}/history`);
  assert.equal(await a.locator(`a[href$="${attemptId}/result"]`).count(), 1);
  const r = await a.request.patch(`/api/exams/${attemptId}/items/3`, { data: { rating: 'recalled' }, headers: { Origin: BASE } });
  assert.equal(r.status(), 409, 'closed attempt rejects changes');
});

await step('timer is enforced server-side: an attempt past its deadline is auto-closed', async () => {
  const res = await a.request.post(`/api/courses/${course.id}/exams`, { data: { mode: 'mixed', count: 3, minutes: 1 }, headers: { Origin: BASE } });
  const { id } = await res.json();
  await db.query(`UPDATE exam_attempts SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id]);
  const r = await a.request.patch(`/api/exams/${id}/items/1`, { data: { rating: 'recalled' }, headers: { Origin: BASE } });
  assert.equal(r.status(), 409);
  assert.equal((await db.query('SELECT status FROM exam_attempts WHERE id = $1', [id])).rows[0].status, 'expired');
});

await step('study plan items can be ticked and persist', async () => {
  await a.goto(`/learn/${course.slug}/plan`);
  await a.locator('.plan-item input[type=checkbox]').first().check();
  await a.waitForTimeout(400);
  await a.reload();
  assert.equal(await a.locator('.plan-item input[type=checkbox]').first().isChecked(), true);
});

await step('summaries: 15 PDFs listed; enrolled student can open, others cannot', async () => {
  await a.goto(`/learn/${course.slug}/summaries`);
  assert.equal(await a.locator('a[href^="/api/files/"]').count(), 15);
  const href = await a.locator('a[href^="/api/files/"]').first().getAttribute('href');
  const ok = await a.request.get(href);
  assert.equal(ok.status(), 200);
  assert.equal(ok.headers()['content-type'], 'application/pdf');
  assert.equal((await b.request.get(href)).status(), 403);
  assert.equal((await pub.request.get(href)).status(), 401);
});

// ───────── Device limit ─────────
await step('device limit: 3rd device is blocked, replacement request → admin approval → new device works, old one signed out', async () => {
  const c2 = await ctx(); const d2 = await c2.newPage();
  await login(d2, emailA); await d2.waitForURL('**/dashboard');
  const c3 = await ctx(); const d3 = await c3.newPage();
  await login(d3, emailA);
  await d3.waitForSelector('text=Device limit reached');
  await shot(d3, '08-device-limit');
  await d3.locator('input[type=radio][name=replace]').last().check();
  await d3.fill('#reason', 'Changed my laptop');
  await d3.click('button:has-text("Request device replacement")');
  await d3.waitForSelector('text=Request sent');
  await admin.goto('/admin/devices');
  await admin.click('button:has-text("Approve")');
  await admin.waitForSelector('td:has-text("approved")');
  await login(d3, emailA); await d3.waitForURL('**/dashboard');
  const active = (await db.query(`SELECT count(*)::int AS n FROM devices d JOIN users u ON u.id = d.user_id WHERE u.email = $1 AND d.revoked_at IS NULL`, [emailA])).rows[0].n;
  assert.equal(active, 2);
  // Whichever of the first two devices was replaced must now be signed out.
  const s1 = (await a.request.get(`/api/courses/${course.id}/questions?limit=1`)).status();
  const s2 = (await d2.request.get(`/api/courses/${course.id}/questions?limit=1`)).status();
  assert.deepEqual([s1, s2].sort(), [200, 401]);
  await c2.close(); await c3.close();
});

// ───────── Payments (signed webhooks only) ─────────
const stripe = new Stripe('sk_test_local_dummy');
const secret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_local_test';
const send = (event, sig) => {
  const payload = JSON.stringify(event);
  const header = sig ?? stripe.webhooks.generateTestHeaderString({ payload, secret });
  return pub.request.post('/api/webhooks/stripe', { data: payload, headers: { 'Content-Type': 'application/json', 'stripe-signature': header } });
};
const idB = (await db.query('SELECT id FROM users WHERE email = $1', [emailB])).rows[0].id;
const offer = (await db.query(`INSERT INTO course_offers(course_id, kind, label_en, label_ar, currency, amount_minor, access_days) VALUES ($1,'one_time','E2E test offer','عرض اختبار','aed',100,30) RETURNING id`, [course.id])).rows[0];
const order = (await db.query(`INSERT INTO orders(user_id, course_id, offer_id, kind, amount_minor, currency, gateway_session_id) VALUES ($1,$2,$3,'one_time',100,'aed',$4) RETURNING id`, [idB, course.id, offer.id, `cs_test_${run}`])).rows[0];
const evt = (id, type, object) => ({ id, object: 'event', type, data: { object }, api_version: '2024-09-30.acacia', created: Math.floor(Date.now() / 1000) });
const hasAccess = async () => (await b.request.get(`/api/courses/${course.id}/questions?limit=1`)).status() === 200;

await step('returning to the success URL alone does not grant access', async () => {
  await b.goto(`/courses/${course.slug}?checkout=success`);
  assert.match(await b.textContent('main'), /activates as soon as the gateway confirms/);
  assert.equal(await hasAccess(), false);
});

await step('webhook with a bad signature is rejected', async () => {
  const r = await send(evt(`evt_bad_${run}`, 'checkout.session.completed', {}), 't=1,v1=deadbeef');
  assert.equal(r.status(), 400);
});

await step('webhook with mismatched amount does not activate', async () => {
  const r = await send(evt(`evt_amt_${run}`, 'checkout.session.completed', { id: `cs_test_${run}`, object: 'checkout.session', payment_status: 'paid', amount_total: 1, currency: 'aed', metadata: { order_id: order.id }, payment_intent: `pi_${run}` }));
  assert.equal(r.status(), 500);
  assert.equal(await hasAccess(), false);
});

await step('signed checkout.session.completed (paid) activates access exactly once', async () => {
  const e = evt(`evt_paid_${run}`, 'checkout.session.completed', { id: `cs_test_${run}`, object: 'checkout.session', payment_status: 'paid', amount_total: 100, currency: 'aed', metadata: { order_id: order.id }, client_reference_id: order.id, payment_intent: `pi_${run}` });
  assert.equal((await send(e)).status(), 200);
  assert.equal((await send(e)).status(), 200); // duplicate delivery
  assert.equal(await hasAccess(), true);
  const en = (await db.query('SELECT count(*)::int AS n, max(expires_at) > now() + interval \'29 days\' AS ok FROM enrollments WHERE order_id = $1', [order.id])).rows[0];
  assert.deepEqual(en, { n: 1, ok: true });
});

await step('full refund from the gateway ends access', async () => {
  const r = await send(evt(`evt_refund_${run}`, 'charge.refunded', { id: `ch_${run}`, object: 'charge', amount: 100, amount_refunded: 100, payment_intent: `pi_${run}` }));
  assert.equal(r.status(), 200);
  assert.equal(await hasAccess(), false);
  assert.equal((await db.query('SELECT status FROM orders WHERE id = $1', [order.id])).rows[0].status, 'refunded');
});

await step('subscription: invoice.paid sets the paid period; cancellation keeps access to period end; deletion expires it', async () => {
  const sub = (await db.query(`INSERT INTO course_offers(course_id, kind, label_en, label_ar, currency, amount_minor, interval) VALUES ($1,'subscription','E2E monthly','شهري','usd',900,'month') RETURNING id`, [course.id])).rows[0];
  const o = (await db.query(`INSERT INTO orders(user_id, course_id, offer_id, kind, amount_minor, currency) VALUES ($1,$2,$3,'subscription',900,'usd') RETURNING id`, [idB, course.id, sub.id])).rows[0];
  const end = Math.floor(Date.now() / 1000) + 30 * 86400;
  const subId = `sub_${run}`;
  assert.equal((await send(evt(`evt_inv_${run}`, 'invoice.paid', { id: `in_${run}`, object: 'invoice', subscription: subId, subscription_details: { metadata: { order_id: o.id } }, lines: { data: [{ period: { start: end - 30 * 86400, end } }] } }))).status(), 200);
  assert.equal(await hasAccess(), true);
  const exp = (await db.query('SELECT extract(epoch from expires_at)::bigint AS e FROM enrollments WHERE gateway_subscription_id = $1', [subId])).rows[0].e;
  assert.equal(Number(exp), end);
  await send(evt(`evt_cancel_${run}`, 'customer.subscription.updated', { id: subId, object: 'subscription', status: 'active', cancel_at_period_end: true, current_period_end: end }));
  assert.equal(await hasAccess(), true, 'cancelled subscription keeps access until period end');
  await send(evt(`evt_del_${run}`, 'customer.subscription.deleted', { id: subId, object: 'subscription', status: 'canceled', cancel_at_period_end: false, current_period_end: end }));
  assert.equal(await hasAccess(), false);
  await db.query('UPDATE course_offers SET active = false WHERE id = ANY($1)', [[offer.id, sub.id]]);
});

// ───────── Mobile & reduced motion ─────────
const iphone = await ctx({ ...devices['iPhone 13'] });
await iphone.addCookies([{ name: 'mgt_lang', value: 'ar', url: BASE }]);
const m = await iphone.newPage();
await step('mobile (Arabic): home, course, practice and exam fit the screen with no horizontal scroll', async () => {
  await m.goto('/');
  await noOverflow(m); await shot(m, '11-mobile-home-ar');
  await m.click('button.menu-toggle');
  await m.waitForSelector('#mobile-nav');
  await shot(m, '12-mobile-menu-ar');
  await m.goto(`/courses/${course.slug}`); await noOverflow(m);
  await login(m, emailAdmin); await m.waitForURL('**/dashboard');
  await m.goto(`/learn/${course.slug}/practice?domain=${(await db.query(`SELECT id FROM domains WHERE course_id = $1 AND code = 'T'`, [course.id])).rows[0].id}`);
  await m.waitForSelector('.study-card');
  await m.click('button:has-text("اكشف الإجابة المرجعية")');
  await m.waitForSelector('.answer-panel');
  await noOverflow(m); await shot(m, '13-mobile-practice-ar');
  await m.goto(`/learn/${course.slug}/exams`);
  await m.click('button:has-text("ابدأ الامتحان")');
  await m.waitForURL(/\/exams\/[0-9a-f-]{36}$/);
  await noOverflow(m); await shot(m, '14-mobile-exam-ar');
});

await step('reduced-motion preference disables animations', async () => {
  const rc = await ctx({ reducedMotion: 'reduce' });
  const rp = await rc.newPage();
  await rp.goto('/');
  const dur = await rp.evaluate(() => getComputedStyle(document.querySelector('.enter')).animationDuration);
  assert.ok(parseFloat(dur) < 0.01, `animation duration ${dur}`);
  const orb = await rp.evaluate(() => getComputedStyle(document.querySelector('.orb')).display);
  assert.equal(orb, 'none');
  await rc.close();
});

await step('no uncaught page errors on public pages', async () => { assert.deepEqual(consoleErrors, []); });

await browser.close();
await db.end();
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
