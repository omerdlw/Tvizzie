'use client'

const STORAGE_KEY = 'tvizzie:pending-profile-bootstrap'
const PENDING_PROFILE_TTL_MS = 10 * 60 * 1000

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

function readPendingProfile() {
  if (!canUseSessionStorage()) {
    return null
  }

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const payload = JSON.parse(rawValue)

    if (!payload?.email || !payload?.username) {
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

export function setPendingProfileBootstrap(payload = {}) {
  if (!canUseSessionStorage()) {
    return
  }

  const email = normalizeEmail(payload.email)
  const username = String(payload.username || '').trim()
  const displayName = String(payload.displayName || '').trim() || username

  if (!email || !username) {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      createdAt: Date.now(),
      displayName,
      email,
      expiresAt: Date.now() + PENDING_PROFILE_TTL_MS,
      username,
    })
  )
}

export function getPendingProfileBootstrap(user = null) {
  const payload = readPendingProfile()

  if (!payload) {
    return null
  }

  if (!user?.email) {
    return payload
  }

  return normalizeEmail(user.email) === normalizeEmail(payload.email)
    ? payload
    : null
}

export function clearPendingProfileBootstrap() {
  if (!canUseSessionStorage()) {
    return
  }

  window.sessionStorage.removeItem(STORAGE_KEY)
}
