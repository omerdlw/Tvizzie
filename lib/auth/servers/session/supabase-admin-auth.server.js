import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  resolveProviderDescriptors,
} from '@/lib/auth/capabilities'

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function toProviderData(user = null) {
  return resolveProviderDescriptors({
    identities: Array.isArray(user?.identities) ? user.identities : [],
    email: user?.email || null,
    userId: user?.id || null,
  }).map((provider) => ({
    email: provider.email,
    providerId: provider.id,
    uid: provider.uid,
  }))
}

function toFirebaseLikeUserRecord(user = null) {
  if (!user?.id) {
    return null
  }

  const identities = Array.isArray(user?.identities) ? user.identities : []

  return {
    app_metadata: user?.app_metadata || {},
    disabled: user?.banned_until != null,
    email: normalizeEmail(user?.email) || null,
    emailVerified:
      user?.email_confirmed_at != null ||
      user?.confirmed_at != null ||
      false,
    metadata: {
      creationTime: user?.created_at || null,
      lastSignInTime: user?.last_sign_in_at || null,
    },
    photoURL:
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar ||
      null,
    identityCount: identities.length,
    providerData: toProviderData(user),
    uid: normalizeValue(user?.id),
    user_metadata: user?.user_metadata || {},
  }
}

export async function listAllUsers() {
  const admin = createAdminClient()
  const users = []
  let page = 1

  while (true) {
    const result = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (result.error) {
      throw new Error(result.error.message || 'Users could not be listed')
    }

    const rows = result.data?.users || []
    users.push(...rows)

    if (rows.length < 1000) {
      break
    }

    page += 1
  }

  return users
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    throw new Error('Email is required')
  }

  const users = await listAllUsers()
  const user = users.find((item) => normalizeEmail(item?.email) === normalizedEmail)

  if (!user) {
    const error = new Error('User not found')
    error.code = 'auth/user-not-found'
    throw error
  }

  return toFirebaseLikeUserRecord(user)
}

export async function getUserById(userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('User ID is required')
  }

  const admin = createAdminClient()
  const result = await admin.auth.admin.getUserById(normalizedUserId)

  if (result.error) {
    throw new Error(result.error.message || 'User could not be loaded')
  }

  return toFirebaseLikeUserRecord(result.data?.user || null)
}

export async function createUser(payload = {}) {
  const admin = createAdminClient()
  const result = await admin.auth.admin.createUser({
    app_metadata: payload.appMetadata || {},
    email: normalizeEmail(payload.email),
    email_confirm: Boolean(payload.emailVerified),
    password:
      payload.password !== undefined ? String(payload.password || '') : undefined,
    user_metadata: payload.userMetadata || {},
  })

  if (result.error) {
    throw new Error(result.error.message || 'User could not be created')
  }

  return toFirebaseLikeUserRecord(result.data?.user || null)
}

export async function updateUser(userId, payload = {}) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('User ID is required')
  }

  const admin = createAdminClient()
  const updatePayload = {}

  if (payload.email !== undefined) {
    updatePayload.email = normalizeEmail(payload.email)
  }

  if (payload.emailVerified !== undefined) {
    updatePayload.email_confirm = Boolean(payload.emailVerified)
  }

  if (payload.password !== undefined) {
    updatePayload.password = String(payload.password || '')
  }

  if (payload.appMetadata !== undefined) {
    updatePayload.app_metadata = payload.appMetadata || {}
  }

  if (payload.userMetadata !== undefined) {
    updatePayload.user_metadata = payload.userMetadata || {}
  }

  const result = await admin.auth.admin.updateUserById(
    normalizedUserId,
    updatePayload
  )

  if (result.error) {
    throw new Error(result.error.message || 'User could not be updated')
  }

  return toFirebaseLikeUserRecord(result.data?.user || null)
}

export async function deleteUser(userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('User ID is required')
  }

  const admin = createAdminClient()
  const result = await admin.auth.admin.deleteUser(normalizedUserId)

  if (result.error) {
    throw new Error(result.error.message || 'User could not be deleted')
  }

  return true
}

export async function revokeRefreshTokens(userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('User ID is required')
  }

  // Supabase admin signOut expects a session JWT, not a user id. We keep this
  // method as a no-op compatibility shim until a session-aware revocation path
  // is introduced for these flows.
  return false
}

export function createAdminAuthFacade() {
  return {
    createUser,
    deleteUser,
    getUser: getUserById,
    getUserByEmail,
    revokeRefreshTokens,
    updateUser,
  }
}
