export const ZONES_CONFIG = {
  enabled: false,
  apps: [
    {
      name: 'auth',
      path: '/auth',
      destination: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001/auth',
    },
    {
      name: 'docs',
      path: '/docs',
      destination: process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3002/docs',
    },
  ],
}
