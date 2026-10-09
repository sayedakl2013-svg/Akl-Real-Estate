import { NextResponse, type NextRequest } from 'next/server';

// Trial privacy gate: when SITE_ACCESS_PASSWORD is set, the whole site sits behind a shared
// password (HTTP Basic auth) and is marked noindex. Payment webhooks stay reachable for the gateway.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const password = process.env.SITE_ACCESS_PASSWORD;
  if (password && !req.nextUrl.pathname.startsWith('/api/webhooks/')) {
    const user = process.env.SITE_ACCESS_USER || 'preview';
    const header = req.headers.get('authorization') ?? '';
    let ok = false;
    if (header.startsWith('Basic ')) {
      try {
        const [u, ...rest] = atob(header.slice(6)).split(':');
        ok = safeEqual(u, user) && safeEqual(rest.join(':'), password);
      } catch {}
    }
    if (!ok) {
      return new NextResponse('Private preview', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Medical Global Tricks preview", charset="UTF-8"', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
  }
  const res = NextResponse.next();
  if (process.env.SITE_NOINDEX !== 'false') res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
