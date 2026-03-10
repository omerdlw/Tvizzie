import { createApiAuthAdapter, createFirebaseAuthAdapter } from '@/modules/auth'
import {
  auth,
  googleAuthProvider,
  isFirebaseConfigured,
} from '@/services/firebase.service'

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || ''
const FIREBASE_AUTH_ENABLED = Boolean(isFirebaseConfigured && auth)
const API_AUTH_ENABLED = Boolean(AUTH_API_URL)

const API_ADAPTER = API_AUTH_ENABLED
  ? createApiAuthAdapter({
      baseUrl: AUTH_API_URL,
      endpoints: {
        confirmPasswordReset: '/password/confirm-reset',
        requestPasswordReset: '/password/request-reset',
        refresh: '/refresh',
        profile: '/profile',
        session: '/session',
        signIn: '/sign-in',
        signOut: '/sign-out',
        signUp: '/sign-up',
      },
    })
  : null

const FIREBASE_ADAPTER = FIREBASE_AUTH_ENABLED
  ? createFirebaseAuthAdapter({
      auth,
      providers: {
        google: googleAuthProvider,
      },
    })
  : null

export const AUTH_CONFIG = {
  clearSessionOnUnauthorized: true,
  hydrateFromStorage: !FIREBASE_AUTH_ENABLED,
  refreshOnWindowFocus: !FIREBASE_AUTH_ENABLED,
  persistSession: !FIREBASE_AUTH_ENABLED,
  storageKey: 'app_auth_session',
  refreshLeewayMs: 60 * 1000,
  enabled: FIREBASE_AUTH_ENABLED || API_AUTH_ENABLED,
  adapter: FIREBASE_ADAPTER || API_ADAPTER,
}
