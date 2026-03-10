'use client'

export { AuthProvider, useAuth, useAuthActions, useAuthState } from './context'
export { AuthGate, AnonymousGate, useAuthorization } from './guards'
export {
  createApiAuthAdapter,
  createAuthAdapter,
  createFirebaseAuthAdapter,
} from './adapters'
export {
  canAccess,
  getAccessToken,
  hasAnyCapability,
  hasAllCapabilities,
  hasAnyRole,
  hasCapability,
  hasRole,
  isSessionExpired,
  mergeUserIntoSession,
  normalizeSession,
} from './utils'
export { AUTH_STATUS, DEFAULT_AUTH_CONFIG } from './config'
