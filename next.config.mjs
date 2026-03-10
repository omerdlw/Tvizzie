import { ZONES_CONFIG } from './config/zones.config.mjs'

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '0' },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const NEXT_CONFIG = {
  devIndicators: false,
  env: {
    BUILD_DATE: new Date().toISOString().split('T')[0],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
  async rewrites() {
    if (!ZONES_CONFIG.enabled) return []

    const zones = ZONES_CONFIG.apps.map((app) => ({
      source: `${app.path}/:path*`,
      destination: `${app.destination}/:path*`,
    }))

    return zones
  },
}

export default NEXT_CONFIG
