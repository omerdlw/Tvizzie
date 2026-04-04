import { headers } from 'next/headers';

export async function getRequestOrigin() {
  const headerStore = await headers();
  const protocol = headerStore.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || null;

  if (!host) {
    return `http://localhost:${process.env.PORT || 3000}`;
  }

  return `${protocol}://${host}`;
}

export async function getServerAppUrl(path = '') {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  return `${await getRequestOrigin()}${normalizedPath}`;
}
