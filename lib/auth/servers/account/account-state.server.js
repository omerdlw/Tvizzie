import { lookupAccountByEmail } from '@/lib/auth/servers/verification/password-account.server'
import { createAdminClient } from '@/lib/supabase/admin'

export const EMAIL_ACCOUNT_STATES = Object.freeze({
  AVAILABLE: 'available',
  EXISTING_GOOGLE_ONLY: 'existing_google_only',
  EXISTING_PASSWORD_ACCOUNT: 'existing_password_account',
  RECOVERABLE_PASSWORD_ORPHAN: 'recoverable_password_orphan',
})

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

async function getProfileState(userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    return {
      email: '',
      exists: false,
      hasUsername: false,
      id: null,
      raw: null,
      username: '',
    }
  }

  const profileResult = await createAdminClient()
    .from('profiles')
    .select('id, email, username')
    .eq('id', normalizedUserId)
    .maybeSingle()

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile state could not be loaded')
  }

  const profile = profileResult.data || null

  return {
    email: normalizeEmail(profile?.email),
    exists: Boolean(profile?.id),
    hasUsername: Boolean(normalizeValue(profile?.username)),
    id: normalizeValue(profile?.id) || null,
    raw: profile,
    username: normalizeValue(profile?.username),
  }
}

export async function resolveEmailAccountState(email) {
  const lookup = await lookupAccountByEmail(email)
  const normalizedEmail = normalizeEmail(lookup.email || email)

  if (!lookup.exists || !lookup.userId) {
    return {
      email: normalizedEmail,
      exists: false,
      lookup,
      profile: {
        email: '',
        exists: false,
        hasUsername: false,
        id: null,
        raw: null,
        username: '',
      },
      state: EMAIL_ACCOUNT_STATES.AVAILABLE,
      userId: null,
    }
  }

  const profile = await getProfileState(lookup.userId)
  const hasGoogleOnlyAccount =
    Array.isArray(lookup.providerIds) &&
    lookup.providerIds.includes('google.com') &&
    !lookup.supportsPasswordAuth

  let state = EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT

  if (hasGoogleOnlyAccount) {
    state = EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY
  } else if (lookup.supportsPasswordAuth && (!profile.exists || !profile.hasUsername)) {
    state = EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN
  }

  return {
    email: normalizedEmail,
    exists: Boolean(lookup.exists),
    lookup,
    profile,
    state,
    userId: lookup.userId || null,
  }
}
