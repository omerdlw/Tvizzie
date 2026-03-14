import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  linkWithPopup,
  signOut as firebaseSignOut,
  updateEmail as firebaseUpdateEmail,
  unlink as firebaseUnlink,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'

import { createAuthAdapter } from './create-adapter'
import { getUserDocRef } from '@/services/firestore-media.service'
import { getDoc } from 'firebase/firestore'

const RESERVED_CLAIM_KEYS = new Set([
  'aud',
  'auth_time',
  'exp',
  'firebase',
  'iat',
  'iss',
  'sub',
  'user_id',
])

const AUTH_ERROR_MESSAGES = {
  'auth/cancelled-popup-request':
    'Another sign-in window is already open Please complete that flow first',
  'auth/network-request-failed':
    'Authentication failed because the network request did not complete',
  'auth/operation-not-supported-in-this-environment':
    'This browser environment does not support the selected sign-in flow',
  'auth/popup-blocked':
    'The sign-in popup was blocked by the browser Allow popups and try again',
  'auth/popup-closed-by-user':
    'The sign-in popup was closed before the flow completed',
  'auth/popup-initialization-failed':
    'Google popup could not be initialized. Allow popups and third-party cookies, then try again',
  LINK_WITH_PASSWORD_REQUIRED:
    'This Google account matches an existing email/password account. Sign in once with your password to link Google',
  GOOGLE_LINK_REQUIRED:
    'Google sign-in is only available after linking Google from your profile settings',
  GOOGLE_EMAIL_MISMATCH:
    'Google account email must match your current account email',
  GOOGLE_EMAIL_UNAVAILABLE:
    'Google account email could not be verified. Please try again with a Google account that has the same email as your account',
  GOOGLE_GMAIL_REQUIRED:
    'Google sign-in is available only for gmail.com accounts',
  UNLINK_PASSWORD_PROVIDER_REQUIRED:
    'Google can only be unlinked when email/password sign-in remains enabled',
  'auth/unauthorized-domain':
    'This domain is not authorized in Firebase Authentication Add the current domain in Firebase Console > Authentication > Settings > Authorized domains',
  'auth/web-storage-unsupported':
    'Authentication requires browser storage, but it is unavailable in this environment',
  'auth/provider-already-linked':
    'This provider is already linked to your account',
  'auth/no-such-provider': 'This provider is not linked to your account',
}

const GOOGLE_PROVIDER_ID = 'google.com'
const PASSWORD_PROVIDER_ID = 'password'
const PROVIDER_ID_BY_KEY = {
  google: GOOGLE_PROVIDER_ID,
  password: PASSWORD_PROVIDER_ID,
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function uniqueStrings(items) {
  const normalizedItems = toArray(items)

  return Array.from(
    new Set(
      normalizedItems
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  )
}

function toFirebaseAuthError(error, fallbackMessage) {
  const resolvedCode = error?.code || 'auth/unknown'
  const resolvedMessage =
    AUTH_ERROR_MESSAGES[resolvedCode] ||
    error?.message ||
    fallbackMessage ||
    'Firebase authentication request failed'

  if (error instanceof Error) {
    error.name = error.name || 'FirebaseAuthError'
    error.code = error.code || resolvedCode
    error.message = resolvedMessage
    return error
  }

  const normalizedError = new Error(resolvedMessage)

  normalizedError.name = 'FirebaseAuthError'
  normalizedError.code = resolvedCode
  normalizedError.data = error?.customData || null

  return normalizedError
}

function getProviderKey(payload = {}) {
  const provider =
    payload?.provider || payload?.strategy || payload?.authProvider || null

  return typeof provider === 'string' ? provider.trim().toLowerCase() : null
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

function getProviderIdsForUser(user) {
  return uniqueStrings(
    (user?.providerData || []).map((provider) => provider?.providerId)
  )
}

function createGoogleLinkRequiredError() {
  const error = new Error(AUTH_ERROR_MESSAGES.GOOGLE_LINK_REQUIRED)
  error.code = 'GOOGLE_LINK_REQUIRED'
  return error
}

function createGoogleEmailMismatchError() {
  const error = new Error(AUTH_ERROR_MESSAGES.GOOGLE_EMAIL_MISMATCH)
  error.code = 'GOOGLE_EMAIL_MISMATCH'
  return error
}

function createGoogleEmailUnavailableError() {
  const error = new Error(AUTH_ERROR_MESSAGES.GOOGLE_EMAIL_UNAVAILABLE)
  error.code = 'GOOGLE_EMAIL_UNAVAILABLE'
  return error
}

function createGoogleGmailRequiredError() {
  const error = new Error(AUTH_ERROR_MESSAGES.GOOGLE_GMAIL_REQUIRED)
  error.code = 'GOOGLE_GMAIL_REQUIRED'
  return error
}

function createExpectedEmailRequiredError() {
  const error = new Error('Expected email is required for Google sign-in')
  error.code = 'GOOGLE_EXPECTED_EMAIL_REQUIRED'
  return error
}

function normalizePopupFlowError(error) {
  const message = String(error?.message || '').trim()

  if (message.includes("reading 'getContext'")) {
    return toFirebaseAuthError(
      {
        code: 'auth/popup-initialization-failed',
        message,
      },
      AUTH_ERROR_MESSAGES['auth/popup-initialization-failed']
    )
  }

  return error
}

function resolveGoogleProfileEmail(providerCredential = null) {
  const profileEmail =
    providerCredential?.additionalUserInfo?.profile?.email ||
    providerCredential?.additionalUserInfo?.profile?.mail ||
    ''

  return normalizeEmail(profileEmail)
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function resolveEmailFromJwtToken(token) {
  const encodedToken = String(token || '').trim()

  if (!encodedToken) {
    return ''
  }

  const segments = encodedToken.split('.')
  if (segments.length < 2) {
    return ''
  }

  const payloadSegment = segments[1]
  const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')

  try {
    if (typeof atob !== 'function') {
      return ''
    }

    const decoded = atob(paddedBase64)
    const payload = parseJsonSafe(decoded)
    return normalizeEmail(payload?.email)
  } catch {
    return ''
  }
}

function resolveProviderEmailFromUser(user, providerId) {
  const normalizedProviderId = String(providerId || '').trim()

  if (!user || !normalizedProviderId) {
    return ''
  }

  const providerRecord = (user.providerData || []).find(
    (provider) => provider?.providerId === normalizedProviderId
  )

  return normalizeEmail(providerRecord?.email || '')
}

function resolveLinkedGoogleEmail(providerCredential = null) {
  const profileEmail = resolveGoogleProfileEmail(providerCredential)
  if (profileEmail) {
    return profileEmail
  }

  const credential = GoogleAuthProvider.credentialFromResult(providerCredential)
  const idTokenEmail = resolveEmailFromJwtToken(credential?.idToken)

  if (idTokenEmail) {
    return idTokenEmail
  }

  const providerEmailFromUser = resolveProviderEmailFromUser(
    providerCredential?.user,
    GOOGLE_PROVIDER_ID
  )

  return providerEmailFromUser
}

async function getProfileEmail(userId) {
  if (!userId) {
    return ''
  }

  try {
    const snapshot = await getDoc(getUserDocRef(userId))

    if (!snapshot.exists()) {
      return ''
    }

    return normalizeEmail(snapshot.data()?.email)
  } catch {
    return ''
  }
}

function getCustomClaims(claims = {}) {
  return Object.fromEntries(
    Object.entries(claims).filter(([key]) => !RESERVED_CLAIM_KEYS.has(key))
  )
}

function resolveAccessModel(claims = {}) {
  const customClaims = getCustomClaims(claims)
  const roles = uniqueStrings(customClaims.roles || customClaims.role)
  const permissions = uniqueStrings(customClaims.permissions)
  const capabilities = uniqueStrings([
    ...toArray(customClaims.capabilities),
    ...permissions,
  ])

  return {
    customClaims,
    permissions,
    capabilities,
    roles,
  }
}

async function waitForAuthState(auth) {
  if (typeof auth?.authStateReady === 'function') {
    await auth.authStateReady()
  }
}

async function reloadUserIfPossible(user) {
  if (!user || typeof user.reload !== 'function') {
    return
  }

  await user.reload().catch(() => null)
}

async function createSessionFromUser(user, options = {}) {
  const { forceRefresh = false, getMetadata } = options

  if (!user) return null

  const tokenResult = await user.getIdTokenResult(forceRefresh)
  const accessModel = resolveAccessModel(tokenResult?.claims || {})
  const providerIds = uniqueStrings(
    (user.providerData || []).map((provider) => provider?.providerId)
  )
  const metadata = {
    claims: accessModel.customClaims,
    creationTime: user.metadata?.creationTime || null,
    emailVerified: Boolean(user.emailVerified),
    lastSignInTime: user.metadata?.lastSignInTime || null,
    providerIds,
    ...(typeof getMetadata === 'function'
      ? getMetadata(user, tokenResult)
      : {}),
  }

  return {
    accessToken: tokenResult?.token || (await user.getIdToken(forceRefresh)),
    expiresAt: tokenResult?.expirationTime || null,
    metadata,
    provider: providerIds[0] || 'firebase',
    refreshToken: user.refreshToken || null,
    user: {
      avatarUrl: user.photoURL || null,
      metadata,
      email: user.email || null,
      name: user.displayName || null,
      permissions: accessModel.permissions,
      capabilities: accessModel.capabilities,
      roles: accessModel.roles,
      id: user.uid,
    },
  }
}

function resolvePopupProvider(providers, payload = {}) {
  const providerKey = getProviderKey(payload)
  if (!providerKey) return null

  const provider = providers[providerKey]

  if (!provider) {
    throw toFirebaseAuthError(
      {
        code: 'auth/provider-not-configured',
        message: `Firebase auth provider "${providerKey}" is not configured`,
      },
      'Authentication provider is not configured'
    )
  }

  return provider
}

function resolveProviderId(payload = {}) {
  const providerKey = getProviderKey(payload)
  return PROVIDER_ID_BY_KEY[providerKey] || null
}

async function signInWithResolvedProvider(auth, providers, payload) {
  const provider = resolvePopupProvider(providers, payload)
  if (!provider) return null

  const providerKey = getProviderKey(payload)
  let providerCredential = null

  try {
    providerCredential = await signInWithPopup(auth, provider)
  } catch (error) {
    const normalizedError = normalizePopupFlowError(error)

    if (
      providerKey === 'google' &&
      normalizedError?.code === 'auth/account-exists-with-different-credential'
    ) {
      throw createGoogleLinkRequiredError()
    }

    throw normalizedError
  }

  if (providerKey !== 'google') {
    return providerCredential
  }

  const providerIds = getProviderIdsForUser(providerCredential?.user)
  const requireLinkedPassword = Boolean(payload?.requireLinkedPassword)
  const expectedEmail = normalizeEmail(payload?.expectedEmail)
  const linkedGoogleEmail = resolveLinkedGoogleEmail(providerCredential)
  const fallbackGoogleEmail =
    normalizeEmail(providerCredential?.user?.email) ||
    resolveProviderEmailFromUser(providerCredential?.user, GOOGLE_PROVIDER_ID)
  const effectiveGoogleEmail = linkedGoogleEmail || fallbackGoogleEmail

  async function cleanupAndSignOut(reason) {
    try {
      const accessToken = await providerCredential?.user?.getIdToken?.()

      if (accessToken) {
        await fetch('/api/auth/provider/google/cleanup-temp-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            expectedEmail,
            reason,
          }),
        }).catch(() => null)
      }
    } finally {
      await firebaseSignOut(auth).catch(() => null)
    }
  }

  if (requireLinkedPassword && !expectedEmail) {
    await cleanupAndSignOut('missing-expected-email')
    throw createExpectedEmailRequiredError()
  }

  if (providerKey === 'google' && requireLinkedPassword && !effectiveGoogleEmail) {
    await cleanupAndSignOut('google-email-unavailable')
    throw createGoogleEmailUnavailableError()
  }

  if (
    providerKey === 'google' &&
    requireLinkedPassword &&
    (!isGmailEmail(expectedEmail) || !isGmailEmail(effectiveGoogleEmail))
  ) {
    await cleanupAndSignOut('google-gmail-required')
    throw createGoogleGmailRequiredError()
  }

  if (
    providerKey === 'google' &&
    requireLinkedPassword &&
    effectiveGoogleEmail &&
    expectedEmail &&
    effectiveGoogleEmail !== expectedEmail
  ) {
    await cleanupAndSignOut('google-email-mismatch')
    throw createGoogleEmailMismatchError()
  }

  if (providerIds.includes(PASSWORD_PROVIDER_ID)) {
    return providerCredential
  }

  if (requireLinkedPassword && providerIds.includes(GOOGLE_PROVIDER_ID)) {
    await cleanupAndSignOut('google-link-required')
    throw createGoogleLinkRequiredError()
  }

  return providerCredential
}

export function createFirebaseAuthAdapter(options = {}) {
  const { auth, providers = {}, getMetadata } = options
  let isProviderSignInInFlight = false

  if (!auth) {
    throw new Error(
      'createFirebaseAuthAdapter requires a Firebase auth instance'
    )
  }

  return createAuthAdapter({
    name: 'firebase',
    async confirmPasswordReset(payload = {}) {
      const oobCode = payload?.oobCode || payload?.code
      const newPassword = payload?.newPassword || payload?.password

      if (!oobCode || !newPassword) {
        throw toFirebaseAuthError(
          {
            code: 'auth/invalid-password-reset-payload',
            message:
              'confirmPasswordReset requires "oobCode" and "newPassword"',
          },
          'Password reset confirmation failed'
        )
      }

      await firebaseConfirmPasswordReset(auth, oobCode, newPassword)
      return { success: true }
    },
    async getSession() {
      await waitForAuthState(auth)
      await reloadUserIfPossible(auth.currentUser)
      return createSessionFromUser(auth.currentUser, { getMetadata })
    },
    onAuthStateChange(listener) {
      return onIdTokenChanged(auth, async (user) => {
        if (isProviderSignInInFlight) {
          return
        }

        try {
          const session = await createSessionFromUser(user, { getMetadata })
          listener(session)
        } catch (error) {
          console.error('[Auth] Firebase auth state sync failed:', error)
          listener(null)
        }
      })
    },
    async refreshSession() {
      await waitForAuthState(auth)
      await reloadUserIfPossible(auth.currentUser)
      return createSessionFromUser(auth.currentUser, {
        forceRefresh: true,
        getMetadata,
      })
    },
    async reauthenticate(payload = {}) {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw toFirebaseAuthError(
          {
            code: 'auth/no-current-user',
            message: 'No authenticated Firebase user is available',
          },
          'Reauthentication failed'
        )
      }

      const password = String(
        payload?.password || payload?.currentPassword || ''
      )
      const email = normalizeEmail(payload?.email || currentUser.email)

      if (!password || !email) {
        throw toFirebaseAuthError(
          {
            code: 'auth/missing-credentials',
            message: 'reauthenticate requires current email and password',
          },
          'Reauthentication failed'
        )
      }

      try {
        const credential = EmailAuthProvider.credential(email, password)
        await reauthenticateWithCredential(currentUser, credential)

        return createSessionFromUser(currentUser, {
          forceRefresh: true,
          getMetadata,
        })
      } catch (error) {
        throw toFirebaseAuthError(error, 'Reauthentication failed')
      }
    },
    async requestPasswordReset(payload = {}) {
      if (!payload?.email) {
        throw toFirebaseAuthError(
          {
            code: 'auth/missing-email',
            message: 'requestPasswordReset requires an "email" field',
          },
          'Password reset request failed'
        )
      }

      await sendPasswordResetEmail(
        auth,
        payload.email,
        payload.actionCodeSettings
      )

      return { success: true }
    },
    async linkProvider(payload = {}) {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw toFirebaseAuthError(
          {
            code: 'auth/no-current-user',
            message: 'No authenticated Firebase user is available',
          },
          'Provider linking failed'
        )
      }

      const provider = resolvePopupProvider(providers, payload)

      if (!provider) {
        throw toFirebaseAuthError(
          {
            code: 'auth/provider-not-configured',
            message: 'Requested provider is not configured',
          },
          'Provider linking failed'
        )
      }

      const providerKey = getProviderKey(payload)

      if (providerKey === 'google') {
        const currentEmail =
          normalizeEmail(currentUser.email) ||
          (await getProfileEmail(currentUser.uid))

        if (!isGmailEmail(currentEmail)) {
          throw createGoogleGmailRequiredError()
        }
      }

      try {
        const linkCredential = await linkWithPopup(currentUser, provider)

        if (providerKey === 'google') {
          const profileEmail = await getProfileEmail(currentUser.uid)
          const currentEmail = normalizeEmail(currentUser.email) || profileEmail
          const linkedGoogleEmail = resolveLinkedGoogleEmail(linkCredential)

          if (!linkedGoogleEmail) {
            await firebaseUnlink(currentUser, GOOGLE_PROVIDER_ID).catch(() => null)
            throw createGoogleEmailUnavailableError()
          }

          if (!isGmailEmail(currentEmail) || !isGmailEmail(linkedGoogleEmail)) {
            await firebaseUnlink(currentUser, GOOGLE_PROVIDER_ID).catch(() => null)
            throw createGoogleGmailRequiredError()
          }

          if (
            currentEmail &&
            linkedGoogleEmail &&
            linkedGoogleEmail !== currentEmail
          ) {
            await firebaseUnlink(currentUser, GOOGLE_PROVIDER_ID).catch(() => null)
            throw createGoogleEmailMismatchError()
          }
        }
      } catch (error) {
        const normalizedError = normalizePopupFlowError(error)

        if (normalizedError?.code === 'auth/provider-already-linked') {
          return createSessionFromUser(currentUser, {
            forceRefresh: true,
            getMetadata,
          })
        }

        throw normalizedError
      }

      return createSessionFromUser(currentUser, {
        forceRefresh: true,
        getMetadata,
      })
    },
    async unlinkProvider(payload = {}) {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw toFirebaseAuthError(
          {
            code: 'auth/no-current-user',
            message: 'No authenticated Firebase user is available',
          },
          'Provider unlinking failed'
        )
      }

      const providerId = resolveProviderId(payload)

      if (!providerId) {
        throw toFirebaseAuthError(
          {
            code: 'auth/provider-not-configured',
            message: 'Requested provider is not configured',
          },
          'Provider unlinking failed'
        )
      }

      const providerIds = getProviderIdsForUser(currentUser)

      if (!providerIds.includes(providerId)) {
        return createSessionFromUser(currentUser, {
          forceRefresh: true,
          getMetadata,
        })
      }

      if (
        providerId === GOOGLE_PROVIDER_ID &&
        !providerIds.includes(PASSWORD_PROVIDER_ID)
      ) {
        const error = new Error(
          AUTH_ERROR_MESSAGES.UNLINK_PASSWORD_PROVIDER_REQUIRED
        )
        error.code = 'UNLINK_PASSWORD_PROVIDER_REQUIRED'
        throw error
      }

      if (providerIds.length <= 1) {
        const error = new Error(
          'At least one sign-in method must stay linked to this account'
        )
        error.code = 'UNLINK_LAST_PROVIDER_FORBIDDEN'
        throw error
      }

      const unlinkedUser = await firebaseUnlink(currentUser, providerId)

      return createSessionFromUser(unlinkedUser || currentUser, {
        forceRefresh: true,
        getMetadata,
      })
    },
    async signIn(payload = {}) {
      try {
        let providerCredential = null
        const providerKey = getProviderKey(payload)

        if (providerKey) {
          isProviderSignInInFlight = true
        }

        try {
          providerCredential = await signInWithResolvedProvider(
            auth,
            providers,
            payload
          )
        } finally {
          if (providerKey) {
            isProviderSignInInFlight = false
          }
        }

        if (providerCredential?.user) {
          return createSessionFromUser(providerCredential.user, { getMetadata })
        }

        if (!payload?.email || !payload?.password) {
          throw {
            code: 'auth/missing-credentials',
            message: 'signIn requires "email" and "password"',
          }
        }

        const credential = await signInWithEmailAndPassword(
          auth,
          payload.email,
          payload.password
        )

        return createSessionFromUser(credential.user, { getMetadata })
      } catch (error) {
        throw toFirebaseAuthError(error, 'Sign in failed')
      }
    },
    async signOut() {
      try {
        await firebaseSignOut(auth)
        return null
      } catch (error) {
        throw toFirebaseAuthError(error, 'Sign out failed')
      }
    },
    async signUp(payload = {}) {
      try {
        if (!payload?.email || !payload?.password) {
          throw {
            code: 'auth/missing-credentials',
            message: 'signUp requires "email" and "password"',
          }
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          payload.email,
          payload.password
        )

        const nextProfile = {
          displayName:
            payload?.displayName ||
            payload?.name ||
            payload?.profile?.displayName,
          photoURL: payload?.photoURL || payload?.profile?.photoURL || null,
        }

        if (nextProfile.displayName || nextProfile.photoURL) {
          await firebaseUpdateProfile(credential.user, nextProfile)
        }

        return createSessionFromUser(credential.user, { getMetadata })
      } catch (error) {
        throw toFirebaseAuthError(error, 'Sign up failed')
      }
    },
    async updateProfile(payload = {}) {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw toFirebaseAuthError(
          {
            code: 'auth/no-current-user',
            message: 'No authenticated Firebase user is available',
          },
          'Profile update failed'
        )
      }

      try {
        const profilePayload = {
          displayName:
            payload?.displayName ||
            payload?.name ||
            payload?.profile?.displayName,
          photoURL: payload?.photoURL || payload?.profile?.photoURL || null,
        }

        if (profilePayload.displayName || profilePayload.photoURL) {
          await firebaseUpdateProfile(currentUser, profilePayload)
        }

        if (payload?.email && payload.email !== currentUser.email) {
          await firebaseUpdateEmail(currentUser, payload.email)
        }

        if (payload?.newPassword || payload?.password) {
          await firebaseUpdatePassword(
            currentUser,
            payload.newPassword || payload.password
          )
        }

        return createSessionFromUser(currentUser, {
          forceRefresh: true,
          getMetadata,
        })
      } catch (error) {
        throw toFirebaseAuthError(error, 'Profile update failed')
      }
    },
  })
}
