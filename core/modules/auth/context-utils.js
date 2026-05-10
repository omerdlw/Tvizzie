import { normalizeSession } from './utils';

export const FALLBACK_AUTH_ACTIONS = Object.freeze({
  clearError: () => {},
  initialize: async () => null,
  linkProvider: async () => null,
  reauthenticate: async () => null,
  refreshSession: async () => null,
  requestPasswordReset: async () => null,
  signIn: async () => null,
  signOut: async () => null,
  signUp: async () => null,
  unlinkProvider: async () => null,
  updateProfile: async () => null,
});

export const AUTH_FLOW_STATUS = Object.freeze({
  login: Object.freeze({
    priority: 110,
    statusType: 'LOGIN',
    themeType: 'LOGIN',
  }),
  logout: Object.freeze({
    priority: 110,
    statusType: 'LOGOUT',
    themeType: 'LOGOUT',
  }),
});

export function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  const normalizedError = new Error(error?.message || fallbackMessage || 'Authentication request failed');

  normalizedError.name = error?.name || 'AuthError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;

  return normalizedError;
}

export function createAdapterContext(config, storage, session) {
  return {
    config,
    storage,
    session: normalizeSession(session),
  };
}

export function normalizeAuthFlowValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function createAuthEventPayload(payload = {}) {
  return {
    timestamp: Date.now(),
    ...payload,
  };
}

export function createSessionEventPayload(session, payload = {}) {
  return {
    session: session || null,
    user: session?.user || null,
    ...payload,
  };
}
