import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim();
}

/** Same-origin check for state-changing requests (cookies are SameSite=Lax as well). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) throw new HttpError(403, 'bad_origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let ok = false;
  try {
    const o = new URL(origin);
    ok = o.host === host || (!!process.env.APP_BASE_URL && o.origin === new URL(process.env.APP_BASE_URL).origin);
  } catch {}
  if (!ok) throw new HttpError(403, 'bad_origin');
}

export async function readJson<T = any>(req: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

/** Wraps a route handler: origin check for mutations + uniform error responses. */
export function handler<C = any>(fn: (req: NextRequest, ctx: C) => Promise<Response>, opts: { skipOrigin?: boolean } = {}) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (!opts.skipOrigin && !['GET', 'HEAD'].includes(req.method)) assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
      console.error('[api]', req.method, req.nextUrl.pathname, e);
      return json({ error: 'server_error' }, 500);
    }
  };
}

export const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const int = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
