import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const SUPABASE_ORIGIN = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_WS_ORIGIN = SUPABASE_ORIGIN.startsWith('https://')
  ? SUPABASE_ORIGIN.replace(/^https:\/\//i, 'wss://')
  : '';

const CSP_HEADER_KEY =
  process.env.CSP_ENFORCE === 'true' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
const CSP_VALUE = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '',
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://www.gstatic.com',
    'https://www.googleapis.com',
  ]
    .filter(Boolean)
    .join(' '),
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    'https://image.tmdb.org',
    'https://i.ytimg.com',
    'https://img.youtube.com',
    'https://m.media-amazon.com',
    'https://lh3.googleusercontent.com',
    'https://*.googleusercontent.com',
    'https://api.dicebear.com',
  ].join(' '),
  [
    "connect-src 'self'",
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://www.googleapis.com',
    SUPABASE_ORIGIN,
    SUPABASE_WS_ORIGIN,
    'https://*.googleapis.com',
    'wss://*.supabase.co',
  ]
    .filter(Boolean)
    .join(' '),
  "font-src 'self' data:",
  "frame-src 'self' https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: CSP_HEADER_KEY, value: CSP_VALUE },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '0' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const STATIC_CACHE_HEADERS = [
  {
    key: 'Cache-Control',
    value: 'public, max-age=31536000, immutable',
  },
];

const NEXT_CONFIG = {
  compress: true,
  output: 'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
  logging: {
    incomingRequests: {
      ignore: [
        /\/api\/collections(?:\?|$)/,
        /\/api\/follows(?:\?|$)/,
        /\/api\/account\/profile(?:\?|$)/,
        /\/api\/notifications(?:\?|$)/,
        /\/api\/auth\/session(?:\?|$)/,
      ],
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    qualities: [70, 72, 74, 75, 78, 82, 88, 90],
    deviceSizes: [480, 640, 768, 1024, 1280, 1536, 1920, 2048, 2560, 3200],
    imageSizes: [48, 56, 64, 80, 88, 92, 144, 160, 185, 208, 240, 288, 342, 400, 500, 780],
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
      { protocol: 'https', hostname: 'i.pinimg.com' },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
      {
        source: '/video.mp4',
        headers: STATIC_CACHE_HEADERS,
      },
      {
        source: '/icon.svg',
        headers: STATIC_CACHE_HEADERS,
      },
      {
        source: '/apple-icon.svg',
        headers: STATIC_CACHE_HEADERS,
      },
      {
        source: '/images/:path*',
        headers: STATIC_CACHE_HEADERS,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/callback',
        permanent: true,
      },
      {
        source: '/auth/oauth-callback',
        destination: '/callback',
        permanent: true,
      },
      {
        source: '/account/:username/likes/page/1',
        destination: '/account/:username/likes',
        permanent: true,
      },
      {
        source: '/account/:username/likes/page/:page',
        destination: '/account/:username/likes?page=:page',
        permanent: true,
      },
      {
        source: '/account/:username/likes/lists/page/1',
        destination: '/account/:username/likes?segment=lists',
        permanent: true,
      },
      {
        source: '/account/:username/likes/lists/page/:page',
        destination: '/account/:username/likes?segment=lists&page=:page',
        permanent: true,
      },
      {
        source: '/account/:username/lists/page/1',
        destination: '/account/:username/lists',
        permanent: true,
      },
      {
        source: '/account/:username/lists/page/:page',
        destination: '/account/:username/lists?page=:page',
        permanent: true,
      },
      {
        source: '/account/:username/watched/page/1',
        destination: '/account/:username/watched',
        permanent: true,
      },
      {
        source: '/account/:username/watched/page/:page',
        destination: '/account/:username/watched?page=:page',
        permanent: true,
      },
      {
        source: '/account/:username/watchlist/page/1',
        destination: '/account/:username/watchlist',
        permanent: true,
      },
      {
        source: '/account/:username/watchlist/page/:page',
        destination: '/account/:username/watchlist?page=:page',
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(NEXT_CONFIG);
