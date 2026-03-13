'use client'

const STORAGE_KEY = 'tvizzie:pending-provider-link'
const PENDING_PROVIDER_TTL_MS = 10 * 60 * 1000

function canUseSessionStorage() {
  return (
    typeof window !== 'undefined' &&
    typeof window.sessionStorage !== 'undefined'
  )
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function readPendingProviderLink() {
  if (!canUseSessionStorage()) {
    return null
  }

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const payload = JSON.parse(rawValue)

    if (!payload?.provider || !payload?.email) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (
      payload.expiresAt &&
      Number(payload.expiresAt) > 0 &&
      Number(payload.expiresAt) <= Date.now()
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return payload
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function setPendingGoogleProviderLink(payload = {}) {
  if (!canUseSessionStorage()) {
    return
  }

  const email = normalizeEmail(payload.email)
  const idToken = String(payload.idToken || '').trim()
  const accessToken = String(payload.accessToken || '').trim()

  if (!email || (!idToken && !accessToken)) {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: accessToken || null,
      createdAt: Date.now(),
      email,
      expiresAt: Date.now() + PENDING_PROVIDER_TTL_MS,
      idToken: idToken || null,
      provider: 'google.com',
    })
  )
}

export function getPendingProviderLink(email = null) {
  const payload = readPendingProviderLink()

  if (!payload) {
    return null
  }

  if (!email) {
    return payload
  }

  return normalizeEmail(email) === normalizeEmail(payload.email) ? payload : null
}

export function clearPendingProviderLink() {
  if (!canUseSessionStorage()) {
    return
  }

  window.sessionStorage.removeItem(STORAGE_KEY)
}
