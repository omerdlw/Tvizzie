'use client';

export { DEFAULT_AUTH_CONFIG, AUTH_STATUS } from './auth-config';
export { useAuthActions, AuthProvider, useAuthState, useAuth } from './auth-context';
export { useAuthSessionReady } from './session-ready';
export { useAuthorization, AnonymousGate, AuthGate } from './auth-guards';

export {
  mergeUserIntoSession,
  hasAllCapabilities,
  hasAnyCapability,
  isSessionExpired,
  normalizeSession,
  hasCapability,
  hasAnyRole,
  canAccess,
  hasRole,
} from './auth-utils';

export { createSupabaseAuthAdapter } from './adapters/supabase-adapter';
export { createApiAuthAdapter } from './adapters/api-adapter';
export { clearCanonicalSessionPayloadCache } from './session-client';
