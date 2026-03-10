'use client'

export const AUTH_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  REFRESHING: 'refreshing',
  ERROR: 'error',
}

export const DEFAULT_AUTH_CONFIG = {
  refreshLeewayMs: 60 * 1000,
  clearSessionOnUnauthorized: true,
  hydrateFromStorage: true,
  refreshOnWindowFocus: true,
  persistSession: true,
  storageKey: 'app_auth_session',
  initialSession: null,
  adapter: null,
  enabled: true,
  debug: false,
}

export const DEFAULT_AUTH_STATE = {
  lastUpdatedAt: null,
  status: AUTH_STATUS.IDLE,
  session: null,
  isReady: false,
  error: null,
  user: null,
}
