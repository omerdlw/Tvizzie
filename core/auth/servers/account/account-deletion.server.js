import { createAdminClient } from '@/core/clients/supabase/admin'
import {
  resolveAuthCapabilities,
  resolveProviderIds,
} from '@/core/auth/capabilities'

function normalizeValue(value) {
  return String(value || '').trim()
}

function hasDatabaseError(result) {
  return Boolean(result?.error)
}

async function executeDelete(query, fallbackMessage) {
  const result = await query

  if (hasDatabaseError(result)) {
    throw new Error(result.error.message || fallbackMessage)
  }
}

export function hasPasswordProvider(userRecord) {
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  })

  return resolveAuthCapabilities({
    providerIds,
    email: userRecord?.email || null,
  }).passwordEnabled
}

export async function purgeAccountData({ userId }) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required')
  }

  const admin = createAdminClient()

  await executeDelete(
    admin.from('review_likes').delete().eq('user_id', normalizedUserId),
    'Review likes could not be deleted'
  )
  await executeDelete(
    admin.from('list_likes').delete().eq('user_id', normalizedUserId),
    'List likes could not be deleted'
  )
  await executeDelete(
    admin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${normalizedUserId},following_id.eq.${normalizedUserId}`),
    'Follow relations could not be deleted'
  )
  await executeDelete(
    admin
      .from('notifications')
      .delete()
      .eq('user_id', normalizedUserId),
    'Notifications could not be deleted'
  )
  await executeDelete(
    admin.from('profiles').delete().eq('id', normalizedUserId),
    'Profile could not be deleted'
  )
}

export function assertPasswordProviderLinked(userRecord) {
  if (!hasPasswordProvider(userRecord)) {
    throw new Error('This account does not have email/password sign-in enabled')
  }
}
