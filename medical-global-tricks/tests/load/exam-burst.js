// k6 load test for the exam hot path: mass start → steady autosaves → submit.
// Run against a STAGING copy (never production) sized like production:
//   k6 run -e BASE=https://staging.example.com -e USERS_FILE=users.json tests/load/exam-burst.js
// users.json: [{ "email": "...", "password": "..." }, ...] — pre-created test accounts with course access.
// This script is the evidence-gathering tool for the 25,000-concurrent target; passing it at that scale is
// what demonstrates capacity, not server specifications. See docs/SCALING.md.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE = __ENV.BASE;
const COURSE_ID = Number(__ENV.COURSE_ID ?? 1);
const users = new SharedArray('users', () => JSON.parse(open(__ENV.USERS_FILE)));

export const options = {
  scenarios: {
    exam: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP ?? '2m', target: Number(__ENV.VUS ?? 1000) }, // mass start window
        { duration: __ENV.HOLD ?? '15m', target: Number(__ENV.VUS ?? 1000) },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.005'],
    'http_req_duration{name:save}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{name:start}': ['p(95)<1500'],
    'http_req_duration{name:submit}': ['p(95)<1000'],
  },
};

const H = { 'Content-Type': 'application/json', Origin: BASE };

export default function () {
  const u = users[(__VU - 1) % users.length];
  const jar = http.cookieJar();
  const login = http.post(`${BASE}/api/auth/login`, JSON.stringify(u), { headers: H, tags: { name: 'login' } });
  check(login, { 'login ok': (r) => r.status === 200 });
  const start = http.post(`${BASE}/api/courses/${COURSE_ID}/exams`, JSON.stringify({ mode: 'mixed', count: 30, minutes: 45 }), { headers: H, tags: { name: 'start' } });
  check(start, { 'start ok': (r) => r.status === 200 });
  const id = start.json('id');
  for (let pos = 1; pos <= 30; pos++) {
    sleep(15 + Math.random() * 30); // think time per question
    http.patch(`${BASE}/api/exams/${id}/items/${pos}`, JSON.stringify({ revealed: true }), { headers: H, tags: { name: 'save' } });
    const r = http.patch(`${BASE}/api/exams/${id}/items/${pos}`, JSON.stringify({ rating: Math.random() < 0.6 ? 'recalled' : 'review' }), { headers: H, tags: { name: 'save' } });
    check(r, { 'save ok': (x) => x.status === 200 });
  }
  const sub = http.post(`${BASE}/api/exams/${id}/submit`, '{}', { headers: H, tags: { name: 'submit' } });
  check(sub, { 'submit ok': (r) => r.status === 200 });
  jar.clear(BASE);
}
