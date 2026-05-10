import 'server-only';

import { cookies } from 'next/headers';

import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';

function buildCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) {
        return cookieStore.get(name);
      },
    },
    headers: {
      get(name) {
        if (String(name || '').toLowerCase() !== 'cookie') {
          return '';
        }

        return cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ');
      },
    },
  };
}

export async function getViewerSessionContext() {
  const cookieStore = await cookies();
  const request = buildCookieRequest(cookieStore);

  return readSessionFromRequest(request).catch(() => null);
}
