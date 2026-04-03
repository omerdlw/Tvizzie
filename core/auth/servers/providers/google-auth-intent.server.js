import {
  resolveProviderDescriptors as resolveAuthProviderDescriptors,
  resolveProviderIds,
} from '@/core/auth/capabilities'
import { createAdminClient } from '@/core/clients/supabase/admin'

const GOOGLE_PROVIDER_ID = 'google.com'
const PASSWORD_PROVIDER_ID = 'password'
const PROFILE_SELECT = ['email', 'id'].join(',')

export const GOOGLE_AUTH_INTENTS = Object.freeze({
  LINK: 'link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
})

export const GOOGLE_AUTH_RESULTS = Object.freeze({
  ALLOW_LINK: 'allow-link',
  ALLOW_SIGNIN: 'allow-signin',
  ALLOW_SIGNUP: 'allow-signup',
  EMAIL_MISMATCH: 'email-mismatch',
  PROVIDER_COLLISION: 'provider-collision',
  REDIRECT_SIGNUP: 'redirect-signup',
  REQUIRE_PASSWORD_LOGIN: 'require-password-login',
})

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function normalizeIntent(value) {
  const normalizedIntent = normalizeValue(value).toLowerCase()

  if (Object.values(GOOGLE_AUTH_INTENTS).includes(normalizedIntent)) {
    return normalizedIntent
  }

  return GOOGLE_AUTH_INTENTS.SIGN_IN
}

function resolveUserId(userRecord = null, decodedToken = null) {
  return normalizeValue(userRecord?.uid || decodedToken?.uid || decodedToken?.sub)
}

function resolveProviderDescriptors(userRecord = null, decodedToken = null) {
  return resolveAuthProviderDescriptors({
    providerData: Array.isArray(userRecord?.providerData)
      ? userRecord.providerData
      : [],
    email: userRecord?.email || decodedToken?.email || null,
    userId: userRecord?.uid || decodedToken?.uid || decodedToken?.sub || null,
  })
}

function buildResult(result, metadata = {}) {
  return {
    ...metadata,
    result,
  }
}

async function getProfileRecord(userId) {
  if (!userId) {
    return {
      exists: false,
      id: null,
      email: '',
      raw: null,
    }
  }

  const profileResult = await createAdminClient()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded')
  }

  const raw = profileResult.data || null

  if (!raw) {
    return {
      exists: false,
      id: null,
      email: '',
      raw: null,
    }
  }

  return {
    exists: true,
    id: normalizeValue(raw?.id || userId) || userId,
    email: normalizeEmail(raw?.email),
    raw,
  }
}

export async function resolveGoogleAuthIntent({
  currentUserId = null,
  decodedToken = null,
  pageIntent = GOOGLE_AUTH_INTENTS.SIGN_IN,
  userRecord = null,
} = {}) {
  const intent = normalizeIntent(pageIntent)
  const userId = resolveUserId(userRecord, decodedToken)
  const providerDescriptors = resolveProviderDescriptors(userRecord, decodedToken)
  const providerIds = resolveProviderIds({
    providerData: Array.isArray(userRecord?.providerData)
      ? userRecord.providerData
      : [],
    appMetadata: userRecord?.app_metadata || {},
    tokenClaims: decodedToken || {},
  })
  const googleProvider = providerDescriptors.find(
    (provider) => provider.id === GOOGLE_PROVIDER_ID
  )
  const googleEmail = normalizeEmail(
    googleProvider?.email || userRecord?.email || decodedToken?.email
  )
  const emailVerified = Boolean(
    userRecord?.emailVerified || decodedToken?.email_verified
  )
  const hasGoogleProvider = providerIds.includes(GOOGLE_PROVIDER_ID)
  const hasPasswordProvider = providerIds.includes(PASSWORD_PROVIDER_ID)
  const profile = await getProfileRecord(userId)
  const profileMatchesUser =
    !profile.exists || !profile.id || profile.id === normalizeValue(userId)
  const profileMatchesGoogleEmail =
    !profile.exists || !profile.email || profile.email === googleEmail

  const baseMetadata = {
    emailVerified,
    googleEmail,
    hasGoogleProvider,
    hasPasswordProvider,
    profileEmail: profile.email,
    profileExists: profile.exists,
    providerDescriptors,
    userId,
  }

  if (!userId || !hasGoogleProvider || !googleEmail || !emailVerified) {
    return buildResult(GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION, baseMetadata)
  }

  if (!profileMatchesUser) {
    return buildResult(GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION, baseMetadata)
  }

  if (intent === GOOGLE_AUTH_INTENTS.LINK) {
    const normalizedCurrentUserId = normalizeValue(currentUserId)

    if (!normalizedCurrentUserId || normalizedCurrentUserId !== userId) {
      return buildResult(GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION, baseMetadata)
    }

    if (!profile.exists || !profile.email || profile.email !== googleEmail) {
      return buildResult(GOOGLE_AUTH_RESULTS.EMAIL_MISMATCH, baseMetadata)
    }

    return buildResult(GOOGLE_AUTH_RESULTS.ALLOW_LINK, baseMetadata)
  }

  if (profile.exists) {
    if (!profileMatchesGoogleEmail) {
      return hasPasswordProvider
        ? buildResult(GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN, baseMetadata)
        : buildResult(GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION, baseMetadata)
    }

    return buildResult(GOOGLE_AUTH_RESULTS.ALLOW_SIGNIN, baseMetadata)
  }

  if (intent === GOOGLE_AUTH_INTENTS.SIGN_UP) {
    return buildResult(GOOGLE_AUTH_RESULTS.ALLOW_SIGNUP, baseMetadata)
  }

  return buildResult(GOOGLE_AUTH_RESULTS.REDIRECT_SIGNUP, baseMetadata)
}
