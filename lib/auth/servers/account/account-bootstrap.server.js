import { createAdminClient } from '@/lib/supabase/admin'
import { isReservedAccountSegment } from '@/lib/account/route-segments'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function validateUsername(value) {
  const username = normalizeValue(value).toLowerCase()

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Username can only contain lowercase letters, numbers, and hyphens'
    )
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved')
  }

  return username
}

async function claimUsernameForProfile({
  avatarUrl = null,
  displayName,
  email = null,
  failIfProfileHasUsername = false,
  preserveExisting = false,
  userId,
  username,
}) {
  const admin = createAdminClient()
  const { error } = await admin.rpc('claim_username', {
    p_avatar_url: normalizeValue(avatarUrl) || null,
    p_display_name: normalizeValue(displayName) || username,
    p_email: normalizeEmail(email) || null,
    p_fail_if_profile_has_username: Boolean(failIfProfileHasUsername),
    p_preserve_existing: Boolean(preserveExisting),
    p_user_id: normalizeValue(userId),
    p_username: validateUsername(username),
  })

  if (error) {
    throw new Error(error.message || 'Username could not be claimed')
  }
}

export async function ensurePasswordAccountProfile({
  avatarUrl = null,
  displayName,
  email,
  userId,
  username,
}) {
  const normalizedUserId = normalizeValue(userId)
  const normalizedEmail = normalizeEmail(email)
  const normalizedUsername = validateUsername(username)
  const resolvedDisplayName =
    normalizeValue(displayName) || normalizedUsername

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required to create the account profile')
  }

  await claimUsernameForProfile({
    avatarUrl,
    displayName: resolvedDisplayName,
    email: normalizedEmail,
    preserveExisting: false,
    userId: normalizedUserId,
    username: normalizedUsername,
  })

  const profileResult = await createAdminClient()
    .from('profiles')
    .select('id, email, username')
    .eq('id', normalizedUserId)
    .maybeSingle()

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded')
  }

  const profile = profileResult.data || null

  if (!profile?.id || !normalizeValue(profile?.username)) {
    throw new Error('Profile could not be bootstrapped')
  }

  return profile
}
