'use client';

export const AUTH_STATUS = Object.freeze({
  AUTHENTICATED: 'authenticated',
  REFRESHING: 'refreshing',
  ANONYMOUS: 'anonymous',
  LOADING: 'loading',
  ERROR: 'error',
  IDLE: 'idle',
});

export const DEFAULT_AUTH_CONFIG = Object.freeze({
  clearSessionOnUnauthorized: true,
  refreshOnWindowFocus: true,
  hydrateFromStorage: true,
  refreshLeewayMs: 60 * 1000,
  initialSession: null,
  persistSession: true,
  storageKey: 'app_auth_session',
  adapter: null,
  enabled: true,
  debug: false,
});

export const DEFAULT_AUTH_STATE = Object.freeze({
  lastUpdatedAt: null,
  status: AUTH_STATUS.IDLE,
  session: null,
  isAuthenticated: false,
  isReady: false,
  error: null,
  user: null,
});
