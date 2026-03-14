import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function normalizeEnvValue(value) {
  const normalized = String(value || '').trim()

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1).trim()
  }

  return normalized
}

function normalizePrivateKey(value) {
  const normalized = normalizeEnvValue(value)
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')

  if (!normalized) {
    return ''
  }

  if (normalized.includes('BEGIN PRIVATE KEY')) {
    return normalized
  }

  // Some environments store only base64 PKCS#8 body without PEM guards.
  const looksLikeBase64Body =
    normalized.length > 256 && /^[A-Za-z0-9+/=]+$/.test(normalized)

  if (!looksLikeBase64Body) {
    return normalized
  }

  const wrappedBody = normalized.match(/.{1,64}/g)?.join('\n') || normalized

  return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`
}

function getAdminCredentials() {
  const projectId = normalizeEnvValue(
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  if (!projectId) {
    throw new Error(
      'FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is required'
    )
  }

  if (clientEmail && privateKey) {
    try {
      return cert({
        clientEmail,
        privateKey,
        projectId,
      })
    } catch {
      throw new Error(
        'Invalid FIREBASE_ADMIN_PRIVATE_KEY format. Use the full PEM key from service-account JSON (including BEGIN/END lines) or a full base64 PKCS#8 body'
      )
    }
  }

  return applicationDefault()
}

function getOrCreateAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  return initializeApp({
    credential: getAdminCredentials(),
  })
}

export function getFirebaseAdminAuth() {
  return getAuth(getOrCreateAdminApp())
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getOrCreateAdminApp())
}
