import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { one, q, tx } from './db';
import { randomToken, sha256 } from './crypto';
import { HttpError } from './http';

export const SESSION_COOKIE = 'mgt_session';
export const DEVICE_COOKIE = 'mgt_device';
export const MAX_DEVICES = 2;
const SESSION_DAYS = 30;

export type Role = 'student' | 'editor' | 'admin';
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: 'en' | 'ar';
  emailVerified: boolean;
  sessionId: string;
  deviceId: string | null;
}

const secure = () => process.env.NODE_ENV === 'production';

/** Long-lived random id that identifies this browser for the 2-device rule. */
export async function getOrCreateDeviceKey(): Promise<string> {
  const jar = await cookies();
  let key = jar.get(DEVICE_COOKIE)?.value;
  if (!key || key.length < 32) {
    key = randomToken(32);
    jar.set(DEVICE_COOKIE, key, { httpOnly: true, sameSite: 'lax', secure: secure(), path: '/', maxAge: 60 * 60 * 24 * 730 });
  }
  return key;
}

export function deviceLabel(ua: string): string {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${br} on ${os}`;
}

export type DeviceCheck =
  | { ok: true; deviceId: string | null }
  | { ok: false; code: 'device_limit'; devices: { id: string; label: string; last_seen_at: string }[] };

/** Registers the current browser as one of the user's devices, unless the limit is reached. */
export async function claimDevice(userId: string, role: Role, deviceKey: string, ua: string): Promise<DeviceCheck> {
  const keyHash = sha256(deviceKey);
  return tx(async (c) => {
    // Serialise device claims per user so two parallel logins cannot both take the last slot.
    await c.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const existing = await c.query(
      'SELECT id, revoked_at FROM devices WHERE user_id = $1 AND device_key_hash = $2', [userId, keyHash]);
    if (existing.rows[0] && !existing.rows[0].revoked_at) {
      await c.query('UPDATE devices SET last_seen_at = now() WHERE id = $1', [existing.rows[0].id]);
      return { ok: true, deviceId: existing.rows[0].id };
    }
    if (role !== 'student') return { ok: true, deviceId: null }; // staff accounts are not device-limited
    const active = await c.query(
      'SELECT id, label, last_seen_at FROM devices WHERE user_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at DESC', [userId]);
    if (active.rows.length >= MAX_DEVICES) return { ok: false, code: 'device_limit', devices: active.rows };
    if (existing.rows[0]) {
      // A device revoked earlier is only re-admitted while a free slot exists.
      await c.query('UPDATE devices SET revoked_at = NULL, last_seen_at = now(), label = $2 WHERE id = $1', [existing.rows[0].id, deviceLabel(ua)]);
      return { ok: true, deviceId: existing.rows[0].id };
    }
    const ins = await c.query(
      'INSERT INTO devices(user_id, device_key_hash, label) VALUES ($1,$2,$3) RETURNING id', [userId, keyHash, deviceLabel(ua)]);
    return { ok: true, deviceId: ins.rows[0].id };
  });
}

export async function createSession(userId: string, deviceId: string | null, ip: string, ua: string) {
  const token = randomToken(32);
  await q(
    `INSERT INTO sessions(user_id, device_id, token_hash, ip, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + make_interval(days => $6))`,
    [userId, deviceId, sha256(token), ip, ua.slice(0, 300), SESSION_DAYS],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: secure(), path: '/', maxAge: 60 * 60 * 24 * SESSION_DAYS });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user from the session cookie. Revoked devices end their sessions. */
export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one(
    `SELECT s.id AS session_id, s.device_id, s.last_seen_at, u.id, u.email, u.name, u.role, u.locale, u.email_verified_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN devices d ON d.id = s.device_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
        AND u.disabled_at IS NULL
        AND (s.device_id IS NULL OR d.revoked_at IS NULL)`,
    [sha256(token)],
  );
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    // Touch at most every 5 minutes to keep write load low.
    await q(`UPDATE sessions SET last_seen_at = now(), expires_at = now() + make_interval(days => $2) WHERE id = $1`, [row.session_id, SESSION_DAYS]);
    if (row.device_id) await q('UPDATE devices SET last_seen_at = now() WHERE id = $1', [row.device_id]);
  }
  return {
    id: row.id, email: row.email, name: row.name, role: row.role, locale: row.locale,
    emailVerified: !!row.email_verified_at, sessionId: row.session_id, deviceId: row.device_id,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, 'unauthenticated');
  return u;
}

export async function requireStaff(minRole: 'editor' | 'admin' = 'editor'): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role === 'admin' || (minRole === 'editor' && u.role === 'editor')) return u;
  throw new HttpError(403, 'forbidden');
}

/** For server-rendered pages: redirect to login instead of throwing. */
export async function pageUser(next: string): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function pageStaff(next: string, minRole: 'editor' | 'admin' = 'editor'): Promise<SessionUser> {
  const u = await pageUser(next);
  if (!(u.role === 'admin' || (minRole === 'editor' && u.role === 'editor'))) redirect('/dashboard');
  return u;
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim(),
    ua: h.get('user-agent') ?? '',
  };
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return 'password_too_short';
  if (pw.length > 200) return 'password_too_long';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'password_too_weak';
  return null;
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
