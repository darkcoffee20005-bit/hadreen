import type { NextConfig } from 'next';

// Later rules win when two rules set the same header, so specific routes come last.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The app has two root layouts ((site) and (invite)), so unmatched URLs need a global 404.
  experimental: { globalNotFound: true },
  // Loaded by Node directly: it instantiates its own WebAssembly at import time.
  serverExternalPackages: ['harfbuzzjs'],
  // The OG route reads TTFs from disk; make sure they ship with the serverless function.
  outputFileTracingIncludes: { '/i/[slug]/opengraph-image*': ['./src/assets/fonts/**'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
      {
        // Invitations are framed by the admin preview and the marketing phone.
        source: '/i/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)',
          },
        ],
      },
      {
        source: '/admin/preview',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }],
      },
      {
        source: '/d/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
