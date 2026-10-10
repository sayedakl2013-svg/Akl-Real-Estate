// Records a guided demo of the running platform (desktop EN/AR + mobile AR) with on-screen captions.
// Usage: BASE=http://localhost:3100 OUT=<dir> node tests/demo-video.mjs
// Needs a demo student with course access (sara.demo@example.test) and an admin (admin.demo@example.test),
// password Demo-pass-2026. Produces one WebM per scene in OUT; stitch them with ffmpeg.
import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const OUT = process.env.OUT ?? 'demo-video';
const PW = 'Demo-pass-2026';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__demo_caption');
    if (!el) {
      el = document.createElement('div');
      el.id = '__demo_caption';
      el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:92%;' +
        'background:rgba(5,14,28,.9);color:#fff;border:1px solid rgba(94,234,212,.6);border-radius:999px;padding:10px 22px;' +
        "font:600 17px/1.35 Manrope,Cairo,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);text-align:center;direction:ltr;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
async function scroll(page, px, steps = 8) {
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await wait(90); }
}
// Sign in once and reuse the session, so every scene counts as the same device (accounts are limited to 2).
const STATE = `${OUT}/student-state.json`;
{
  const c = await browser.newContext({ baseURL: BASE });
  const pg = await c.newPage();
  await pg.goto('/login'); await pg.fill('#email', 'sara.demo@example.test'); await pg.fill('#password', PW);
  await pg.click('form button.btn-primary'); await pg.waitForURL('**/dashboard**');
  await c.storageState({ path: STATE }); await c.close();
}

async function scene(name, opts, fn) {
  const ctx = await browser.newContext({ baseURL: BASE, recordVideo: { dir: OUT, size: opts.size ?? { width: 1280, height: 720 } }, ...opts.ctx,
    ...(opts.student ? { storageState: STATE } : {}) });
  if (opts.lang) await ctx.addCookies([{ name: 'mgt_lang', value: opts.lang, url: BASE }]);
  const page = await ctx.newPage();
  try { await fn(page); } catch (e) { console.error('scene', name, 'error:', e.message); }
  const v = page.video();
  await ctx.close();
  fs.renameSync(await v.path(), `${OUT}/${name}.webm`);
  console.log('recorded', name);
}
async function login(page, email) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await page.click('form button.btn-primary');
  await page.waitForURL('**/dashboard**');
}

const desktop = { size: { width: 1280, height: 720 }, ctx: { viewport: { width: 1280, height: 720 } } };

await scene('01-home', { ...desktop, lang: 'en' }, async (p) => {
  await p.goto('/');
  await caption(p, 'Medical Global Tricks — Learn with clarity. Practise with confidence.');
  await wait(3500);
  await scroll(p, 620); await caption(p, 'Course catalogue: available vs planned courses (UAE & Saudi tracks)'); await wait(3000);
  await scroll(p, 560); await caption(p, 'How studying works — and a clear self-assessment notice'); await wait(3000);
  await scroll(p, 700); await caption(p, 'Teaser video plays only when you press play'); await wait(2500);
  await p.click('.video-poster-btn').catch(() => {}); await wait(4000);
  await scroll(p, 900); await caption(p, 'Footer: automatic year, independence notice, legal pages'); await wait(3000);
});

await scene('02-arabic', { ...desktop, lang: 'en' }, async (p) => {
  await p.goto('/');
  await caption(p, 'One click switches to Arabic (right-to-left, Cairo font)');
  await wait(1800);
  await p.click('header button:has-text("العربية")');
  await p.waitForFunction(() => document.documentElement.dir === 'rtl');
  await caption(p, 'الواجهة العربية — ذاكر بوضوح. وتدرّب بثقة.'); await wait(3500);
  await scroll(p, 620); await wait(2500);
  await p.goto('/courses'); await caption(p, 'الكورسات مرتبة حسب البلد والجهة والمسار والتخصص'); await wait(3000);
  await p.click('header button:has-text("English")'); await wait(1500);
});

await scene('03-catalogue', { ...desktop, lang: 'en' }, async (p) => {
  await p.goto('/courses');
  await caption(p, 'Filter courses by country, authority, track, specialty and status'); await wait(2500);
  await p.selectOption('#f-status', 'planned'); await p.click('form[role=search] button[type=submit]');
  await p.waitForLoadState('networkidle'); await caption(p, 'Planned courses are clearly marked and are not for sale'); await wait(3000);
  await p.goto('/courses/aesthetic-medicine-oral');
  await caption(p, 'Available course: Aesthetic Medicine oral exam — 313 questions, 15 domains'); await wait(3000);
  await scroll(p, 500); await wait(3000);
});

await scene('04-student', { ...desktop, lang: 'en', student: true }, async (p) => {
  await p.goto('/login');
  await caption(p, 'Students sign in with email + password (each account works on up to 2 devices)'); await wait(2500);
  await p.goto('/dashboard');
  await caption(p, 'My learning'); await wait(2200);
  await p.goto('/learn/aesthetic-medicine-oral');
  await caption(p, 'Course dashboard: progress by domain, review points, attempts, plan'); await wait(3500);
  await scroll(p, 500); await wait(2500);

  await p.goto('/learn/aesthetic-medicine-oral/library');
  await caption(p, 'Question library — search and filter by domain');
  await p.waitForSelector('.q-item'); await wait(1500);
  await p.fill('#lib-q', 'hyaluronidase'); await wait(2200);
  await p.click('.q-item >> nth=0 >> button.q-head'); await wait(1200);
  await caption(p, 'Reference answer, explanation and source — save questions for later');
  await scroll(p, 300); await wait(3000);
  await p.click('.q-item >> nth=0 >> button:has-text("Save")').catch(() => {}); await wait(1800);

  await p.goto('/learn/aesthetic-medicine-oral/practice');
  await caption(p, 'Oral practice: choose a domain and start');
  const dom = await p.locator('#p-d option', { hasText: 'Hyaluronidase' }).getAttribute('value');
  await p.selectOption('#p-d', dom); await wait(1500);
  await p.click('button:has-text("Start practice")');
  await p.waitForSelector('.study-card');
  await caption(p, 'Read the question, answer aloud, then reveal'); await wait(3000);
  await p.click('button:has-text("Reveal reference answer")');
  await caption(p, 'Rate yourself honestly: “I recalled it” or “Needs review”'); await wait(1500);
  await scroll(p, 350); await wait(2500);
  await p.click('.rate-bar button:has-text("I recalled it")'); await wait(1500);
  await p.keyboard.press('Space'); await caption(p, 'Keyboard friendly: Space = reveal · 1 / 2 = rate'); await wait(2500);
  await p.keyboard.press('2'); await wait(2000);
});

await scene('05-exam', { ...desktop, lang: 'en', student: true }, async (p) => {
  await p.goto('/learn/aesthetic-medicine-oral/exams');
  await caption(p, 'Timed exams: mixed, one domain, or your review items'); await wait(2500);
  await p.fill('#ex-n', '5'); await p.fill('#ex-m', '10'); await wait(1500);
  await p.click('button:has-text("Start exam")');
  await p.waitForURL(/\/exams\/[0-9a-f-]{36}$/);
  await caption(p, 'Server-side timer, notes, reveal and self-rating — saved automatically'); await wait(3000);
  await p.click('button:has-text("Reveal reference answer")'); await wait(1500);
  await p.click('.rate-bar button:has-text("I recalled it")'); await wait(1500);
  await p.click('button:has-text("Next")'); await wait(1000);
  await p.click('button:has-text("Mark for review")');
  await caption(p, 'Mark questions for review and jump with the navigator'); await wait(1500);
  await p.fill('textarea[id^=note-]', 'Key points I said aloud…'); await wait(1200);
  await p.click('button:has-text("Reveal reference answer")'); await wait(1000);
  await p.click('.rate-bar button:has-text("Needs review")'); await wait(1500);
  await scroll(p, 700); await wait(2500);
  await caption(p, 'Leave and come back any time before the timer ends — it resumes'); await p.reload(); await wait(3000);
  p.once('dialog', (d) => d.accept());
  await p.click('button:has-text("Submit exam")');
  await p.waitForURL(/\/result/);
  await caption(p, 'Result: self-assessment by domain (not an official score)'); await wait(3500);
  await scroll(p, 600); await wait(3000);
});

await scene('06-review', { ...desktop, lang: 'en', student: true }, async (p) => {
  await p.goto('/learn/aesthetic-medicine-oral/mistakes');
  await caption(p, 'Mistakes notebook — re-practise everything marked “Needs review”'); await wait(3500);
  await p.goto('/learn/aesthetic-medicine-oral/history');
  await caption(p, 'History & analysis: attempts and self-assessment by domain'); await wait(3000);
  await scroll(p, 500); await wait(2500);
  await p.goto('/learn/aesthetic-medicine-oral/plan');
  await caption(p, 'Study plan — tick items as you go'); await wait(1500);
  await p.locator('.plan-item input[type=checkbox]').nth(1).check(); await wait(800);
  await p.locator('.plan-item input[type=checkbox]').nth(2).check(); await wait(2200);
  await p.goto('/learn/aesthetic-medicine-oral/summaries');
  await caption(p, '15 summary PDFs (English) — only for students with access'); await wait(3500);
  await p.goto('/account');
  await caption(p, 'Account: course access, devices (2 max), password'); await wait(2500);
  await scroll(p, 600); await wait(2500);
});

await scene('07-admin', { ...desktop, lang: 'en' }, async (p) => {
  await login(p, 'admin.demo@example.test');
  await p.goto('/admin');
  await caption(p, 'Admin panel: payment & email status, content and usage reports'); await wait(3500);
  await scroll(p, 600); await wait(2500);
  await p.goto('/admin/questions');
  await caption(p, 'Questions: draft → in review → published, with revision history'); await wait(3500);
  await p.goto('/admin/courses');
  await caption(p, 'Courses, domains, prices and study plans'); await wait(3000);
  await p.goto('/admin/students');
  await caption(p, 'Students: grant or revoke access, verify email, manage devices'); await wait(3000);
  await p.goto('/admin/devices');
  await caption(p, 'Device replacement requests — approve or reject'); await wait(2500);
  await p.goto('/admin/media');
  await caption(p, 'PDFs & videos: bulk upload, publish / unpublish'); await wait(3000);
});

const iphone = devices['iPhone 13'];
await scene('08-mobile', { size: { width: 390, height: 844 }, lang: 'ar', student: true, ctx: { ...iphone } }, async (p) => {
  await p.goto('/');
  await caption(p, 'Mobile · Arabic'); await wait(3000);
  await p.click('button.menu-toggle'); await wait(2000); await p.click('button.menu-toggle'); await wait(800);
  const dom = await (async () => { await p.goto('/learn/aesthetic-medicine-oral/practice'); return p.locator('#p-d option').nth(4).getAttribute('value'); })();
  await p.goto(`/learn/aesthetic-medicine-oral/practice?domain=${dom}`);
  await p.waitForSelector('.study-card');
  await caption(p, 'Oral practice on the phone'); await wait(2500);
  await p.click('button:has-text("اكشف الإجابة المرجعية")'); await wait(1500);
  await scroll(p, 500); await wait(2500);
  await p.click('.rate-bar button >> nth=0'); await wait(2000);
});

await browser.close();
console.log('done');
