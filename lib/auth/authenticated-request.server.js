import { getFirebaseAdminAuth } from '@/lib/auth/firebase-admin.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

function getAuthorizationHeader(request) {
  return normalizeValue(request?.headers?.get('authorization'))
}

function getBearerToken(request) {
  const header = getAuthorizationHeader(request)

  if (!header.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return normalizeValue(header.slice(7))
}

function normalizeFirebaseError(error) {
  const code = normalizeValue(error?.code).toLowerCase()

  if (
    code === 'auth/id-token-expired' ||
    code === 'auth/invalid-id-token' ||
    code === 'auth/argument-error'
  ) {
    return new Error('Invalid or expired authentication token')
  }

  if (code === 'auth/id-token-revoked') {
    return new Error('Authentication token has been revoked')
  }

  return error
}

export async function requireAuthenticatedRequest(
  request,
  { requireRecentAuthMs = 0 } = {}
) {
  const token = getBearerToken(request)

  if (!token) {
    throw new Error('Authorization token is required')
  }

  try {
    const adminAuth = getFirebaseAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(token, true)
    const userId = normalizeValue(decodedToken?.uid)

    if (!userId) {
      throw new Error('Invalid authentication token')
    }

    if (requireRecentAuthMs > 0) {
      const authTimeSeconds = Number(decodedToken?.auth_time || 0)

      if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) {
        throw new Error('Recent authentication is required')
      }

      const elapsedMs = Date.now() - authTimeSeconds * 1000

      if (elapsedMs > Number(requireRecentAuthMs)) {
        throw new Error('Recent authentication is required')
      }
    }

    const userRecord = await adminAuth.getUser(userId)
    const email = normalizeValue(userRecord?.email || decodedToken?.email).toLowerCase()

    if (!email) {
      throw new Error('Authenticated user does not have an email address')
    }

    return {
      adminAuth,
      decodedToken,
      email,
      token,
      userId,
      userRecord,
    }
  } catch (error) {
    throw normalizeFirebaseError(error)
  }
}
