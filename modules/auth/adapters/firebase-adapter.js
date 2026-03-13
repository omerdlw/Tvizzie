import {
  createUserWithEmailAndPassword,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  signOut as firebaseSignOut,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'

import { createAuthAdapter } from './create-adapter'

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
  'auth/unauthorized-domain':
    'This domain is not authorized in Firebase Authentication Add the current domain in Firebase Console > Authentication > Settings > Authorized domains',
  'auth/web-storage-unsupported':
    'Authentication requires browser storage, but it is unavailable in this environment',
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

async function signInWithResolvedProvider(auth, providers, payload) {
  const provider = resolvePopupProvider(providers, payload)
  if (!provider) return null

  return signInWithPopup(auth, provider)
}

export function createFirebaseAuthAdapter(options = {}) {
  const { auth, providers = {}, getMetadata } = options

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
      return createSessionFromUser(auth.currentUser, { getMetadata })
    },
    onAuthStateChange(listener) {
      return onIdTokenChanged(auth, async (user) => {
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
      return createSessionFromUser(auth.currentUser, {
        forceRefresh: true,
        getMetadata,
      })
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
    async signIn(payload = {}) {
      try {
        const providerCredential = await signInWithResolvedProvider(
          auth,
          providers,
          payload
        )

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
