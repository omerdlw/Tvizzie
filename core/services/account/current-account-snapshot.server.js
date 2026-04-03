import 'server-only'

import { cookies } from 'next/headers'

import { readSessionFromRequest } from '@/core/auth/servers/session/session.server'
import { getEditableAccountSnapshotByUserId } from '@/core/services/account/account.server'

function createCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) {
        return cookieStore.get(name)
      },
    },
    headers: {
      get(name) {
        if (String(name || '').toLowerCase() !== 'cookie') {
          return ''
        }

        return cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ')
      },
    },
  }
}

export async function getCurrentEditableAccountSnapshot() {
  const cookieStore = await cookies()
  const request = createCookieRequest(cookieStore)
  const sessionContext = await readSessionFromRequest(request).catch(() => null)

  if (!sessionContext?.userId) {
    return null
  }

  return getEditableAccountSnapshotByUserId(sessionContext.userId)
}
