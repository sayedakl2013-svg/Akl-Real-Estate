/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: https:",
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
      "connect-src 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  // Docker/VPS builds set NEXT_STANDALONE=1; managed hosts (Render) use `next start`.
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
  poweredByHeader: false,
  // Admin uploads (PDF / lesson video) pass through the proxy; larger videos should go straight to object storage.
  experimental: { proxyClientMaxBodySize: '250mb' },
  serverExternalPackages: ['pg', 'sanitize-html', 'nodemailer', 'stripe'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
