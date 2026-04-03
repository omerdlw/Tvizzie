export const SETTINGS_STORAGE_TARGETS = Object.freeze({
  LOCAL_STORAGE: 'localStorage',
  COOKIE: 'cookie',
})

export const DEFAULT_SETTINGS_STORAGE_KEY = 'APP_SETTINGS'

export const DEFAULT_COOKIE_ATTRIBUTES = Object.freeze({
  path: '/',
  sameSite: 'Lax',
  maxAge: 60 * 60 * 24 * 365,
})

export const DEFAULT_SETTINGS_CONFIG = Object.freeze({
  storageKey: DEFAULT_SETTINGS_STORAGE_KEY,
  definitions: {},
  initialSettings: {},
  syncExternalChanges: true,
  storage: {
    localStorage: {
      enabled: true,
      legacyKeys: [],
      cleanupLegacyKeys: true,
    },
    cookie: {
      enabled: true,
      attributes: DEFAULT_COOKIE_ATTRIBUTES,
    },
  },
})
