// Usage: node scripts/add-video.mjs <file.mp4> --title-en="..." --title-ar="..." [--promo] [--public] [--course=slug] [--publish]
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const file = process.argv[2];
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const flag = (k) => process.argv.includes(`--${k}`);
if (!file || !fs.existsSync(file)) { console.error('usage: add-video.mjs <file.mp4> --title-en=... --title-ar=...'); process.exit(1); }
const storage = path.resolve(process.env.STORAGE_DIR ?? './storage');
const key = `videos/${randomUUID()}.mp4`;
fs.mkdirSync(path.join(storage, 'videos'), { recursive: true });
fs.copyFileSync(file, path.join(storage, key));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const course = arg('course') ? (await db.query('SELECT id FROM courses WHERE slug = $1', [arg('course')])).rows[0]?.id ?? null : null;
const { rows: [v] } = await db.query(
  `INSERT INTO videos(course_id, title_en, title_ar, kind, source_type, storage_key, mime, access, status)
   VALUES ($1,$2,$3,$4,'file',$5,'video/mp4',$6,$7) RETURNING id`,
  [course, arg('title-en') ?? 'Video', arg('title-ar') ?? 'فيديو', flag('promo') ? 'promo' : 'lesson', key, flag('public') ? 'public' : 'enrolled', flag('publish') ? 'published' : 'draft']);
console.log(`video ${v.id} stored as ${key}`);
await db.end();
