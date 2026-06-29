import type { NextConfig } from 'next';

// Backend origin. In dev this is the NestJS server; everything under /api/* is
// proxied to it so the browser only ever talks to the frontend's own origin.
// That keeps the JWT httpOnly cookie same-origin (SameSite=Lax handles CSRF).
const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
