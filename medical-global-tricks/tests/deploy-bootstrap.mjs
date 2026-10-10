// Rehearses a fresh deployment the way an owner does it on Render: empty database, preview password on,
// first admin via /setup token, all content loaded through the admin panel (no shell access).
// Usage: BASE=... PREVIEW_PASSWORD=... BOOTSTRAP_TOKEN=... UPLOAD_DIR=<dir with binder.html, teaser.mp4, summaries/*.pdf> node tests/deploy-bootstrap.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3200';
const creds = { username: 'preview', password: process.env.PREVIEW_PASSWORD };
const UP = process.env.UPLOAD_DIR;
const PW = 'Owner-pass-2026';
const results = [];
async function step(name, fn) {
  try { await fn(); results.push(true); console.log('PASS', name); }
  catch (e) { results.push(false); console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 4).join('\n    ')); }
}

const browser = await chromium.launch();
const anon = await browser.newContext({ baseURL: BASE });

await step('site is private: pages ask for the preview password, health check stays open', async () => {
  assert.equal((await anon.request.get('/')).status(), 401);
  assert.equal((await anon.request.get('/api/courses/1/questions')).status(), 401);
  const h = await anon.request.get('/api/health');
  assert.equal(h.status(), 200);
  assert.deepEqual(await h.json(), { ok: true });
  assert.match((await anon.request.get('/')).headers()['x-robots-tag'], /noindex/);
});

const owner = await browser.newContext({ baseURL: BASE, httpCredentials: creds });
const o = await owner.newPage();

await step('fresh database was migrated and seeded on start (catalogue visible, no questions yet)', async () => {
  await o.goto('/courses');
  assert.match(await o.textContent('main'), /Aesthetic Medicine — Oral Exam Preparation/);
});

await step('owner registers and becomes admin with the bootstrap token (wrong token refused)', async () => {
  await o.goto('/register');
  await o.fill('#name', 'Owner'); await o.fill('#email', 'owner@example.test');
  await o.fill('#password', PW); await o.fill('#confirm', PW);
  await o.click('form button.btn-primary');
  await o.waitForURL('**/dashboard**');
  await o.goto('/setup');
  await o.fill('#tok', 'wrong-token-wrong-token-xx');
  await o.click('form button.btn-primary');
  await o.waitForSelector('text=Wrong token');
  await o.fill('#tok', process.env.BOOTSTRAP_TOKEN);
  await o.click('form button.btn-primary');
  await o.waitForURL('**/admin');
  await o.goto('/setup');
  assert.match(await o.textContent('main'), /Setup is closed/);
});

await step('admin imports the question bank by uploading the binder file', async () => {
  await o.goto('/admin/questions');
  await o.click('summary:has-text("Import question bank")');
  await o.setInputFiles('input[name=file][accept*=html]', path.join(UP, 'binder.html'));
  await o.locator('form:has(input[name=file]) select[name=status]').selectOption('published');
  await o.click('button:has-text("Import")');
  await o.waitForSelector('text=313 · new 313', { timeout: 60000 });
  await o.goto('/admin/questions');
  assert.match(await o.textContent('main'), /published: 313/);
});

await step('admin uploads 15 summary PDFs at once', async () => {
  await o.goto('/admin/media');
  await o.click('summary:has-text("Upload summary PDFs in bulk")');
  const files = fs.readdirSync(path.join(UP, 'summaries')).map((f) => path.join(UP, 'summaries', f));
  await o.setInputFiles('input[name=file][multiple]', files);
  await o.click('form:has(input[multiple]) button:has-text("Upload")');
  await o.waitForSelector('text=15 · new 15', { timeout: 60000 });
  assert.equal(await o.locator('td:has-text("— Summary")').count(), 15);
});

await step('admin uploads the teaser video and publishes it', async () => {
  await o.goto('/admin/media');
  await o.click('summary:has-text("Upload video file")');
  const form = o.locator('form:has(select[name=video_kind])');
  await form.locator('input[name=title_en]').fill('Medical Global Tricks — teaser');
  await form.locator('input[name=title_ar]').fill('فيديو تعريفي');
  await form.locator('select[name=video_kind]').selectOption('promo');
  await form.locator('select[name=access]').selectOption('public');
  await form.locator('input[name=file]').setInputFiles(path.join(UP, 'teaser.mp4'));
  await form.locator('button:has-text("Upload")').click();
  await o.waitForSelector('td:has-text("Medical Global Tricks — teaser")', { timeout: 60000 });
  await o.locator('tr:has-text("Medical Global Tricks — teaser") button:has-text("Publish")').click();
  await o.waitForSelector('tr:has-text("Medical Global Tricks — teaser") td:has-text("published")');
  await o.goto('/');
  assert.ok(await o.$('.video-poster-btn'), 'teaser shown on home');
});

await step('a student signs up, gets access from admin, studies, and opens a summary PDF', async () => {
  const sc = await browser.newContext({ baseURL: BASE, httpCredentials: creds });
  const s = await sc.newPage();
  await s.goto('/register');
  await s.fill('#name', 'First Student'); await s.fill('#email', 'student1@example.test');
  await s.fill('#password', PW); await s.fill('#confirm', PW);
  await s.click('form button.btn-primary');
  await s.waitForURL('**/dashboard**');
  await o.goto('/admin/students?q=student1');
  await o.click('a:has-text("Manage")');
  await o.click('button:has-text("Grant access")');
  await o.waitForSelector('td:has-text("admin_grant")');
  await s.goto('/learn/aesthetic-medicine-oral/practice');
  await s.click('button:has-text("Start practice")');
  await s.click('button:has-text("Reveal reference answer")');
  await s.click('.rate-bar button:has-text("I recalled it")');
  await s.goto('/learn/aesthetic-medicine-oral/summaries');
  const href = await s.locator('a[href^="/api/files/"]').first().getAttribute('href');
  const r = await s.request.get(href);
  assert.equal(r.status(), 200);
  assert.equal(r.headers()['content-type'], 'application/pdf');
  await sc.close();
});

await browser.close();
const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} deployment checks passed`);
process.exit(ok === results.length ? 0 : 1);
