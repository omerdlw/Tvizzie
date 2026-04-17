'use client';

export { DEFAULT_AUTH_CONFIG, AUTH_STATUS } from './config';
export { useAuthActions, AuthProvider, useAuthState, useAuth } from './context';
export { useAuthSessionReady } from './session-ready';
export { useAuthorization, AnonymousGate, AuthGate } from './guards';

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
} from './utils';

export { createSupabaseAuthAdapter } from './adapters/supabase-adapter';
export { createApiAuthAdapter } from './adapters/api-adapter';
