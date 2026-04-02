'use client'

import { isBrowser, isObject, isString } from '@/lib/utils'

import {
  DEFAULT_SETTINGS_STORAGE_KEY,
  DEFAULT_COOKIE_ATTRIBUTES,
  SETTINGS_STORAGE_TARGETS,
} from './config'
import {
  createPersistedSettingsSnapshot,
  createCookieSettingsSnapshot,
  mergeSettingsObjects,
} from './utils'

let storageInstanceCount = 0

function parseStoredSettings(rawValue) {
  if (!rawValue || !isString(rawValue)) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue)
    return isObject(parsed) ? parsed : {}
  } catch (error) {
    console.error('[settings] Failed to parse settings payload:', error)
    return {}
  }
}

function serializeStoredSettings(value) {
  return JSON.stringify(isObject(value) ? value : {})
}

function getCookieValue(cookieString, key) {
  const cookies = String(cookieString || '').split(';')
  const prefix = `${encodeURIComponent(key)}=`

  for (const cookie of cookies) {
    const normalizedCookie = cookie.trim()

    if (normalizedCookie.startsWith(prefix)) {
      return normalizedCookie.slice(prefix.length)
    }
  }

  return null
}

function serializeCookie(key, value, attributes = {}) {
  const cookieParts = [`${encodeURIComponent(key)}=${value}`]

  if (attributes.path) {
    cookieParts.push(`Path=${attributes.path}`)
  }

  if (attributes.domain) {
    cookieParts.push(`Domain=${attributes.domain}`)
  }

  if (attributes.sameSite) {
    cookieParts.push(`SameSite=${attributes.sameSite}`)
  }

  if (attributes.secure) {
    cookieParts.push('Secure')
  }

  if (Number.isFinite(attributes.maxAge)) {
    cookieParts.push(`Max-Age=${Math.max(0, Math.floor(attributes.maxAge))}`)
  }

  if (attributes.expires instanceof Date) {
    cookieParts.push(`Expires=${attributes.expires.toUTCString()}`)
  }

  return cookieParts.join('; ')
}

export function createLocalStorageDriver({
  key = DEFAULT_SETTINGS_STORAGE_KEY,
  legacyKeys = [],
  cleanupLegacyKeys = true,
  storage,
} = {}) {
  const resolveStorage = () => {
    if (storage) {
      return storage
    }

    if (!isBrowser()) {
      return null
    }

    try {
      return window.localStorage
    } catch (error) {
      console.error('[settings] localStorage is unavailable:', error)
      return null
    }
  }

  const readFromStorageKey = (resolvedStorage, storageKey) => {
    try {
      return parseStoredSettings(resolvedStorage.getItem(storageKey))
    } catch (error) {
      console.error(
        `[settings] Failed to read localStorage (${storageKey}):`,
        error
      )
      return {}
    }
  }

  return {
    name: SETTINGS_STORAGE_TARGETS.LOCAL_STORAGE,
    key,
    isAvailable() {
      return Boolean(resolveStorage())
    },
    read() {
      const resolvedStorage = resolveStorage()

      if (!resolvedStorage) {
        return {}
      }

      const legacySnapshots = legacyKeys.map((legacyKey) =>
        readFromStorageKey(resolvedStorage, legacyKey)
      )
      const currentSnapshot = readFromStorageKey(resolvedStorage, key)

      return mergeSettingsObjects(...legacySnapshots, currentSnapshot)
    },
    write(snapshot, context = {}) {
      const resolvedStorage = resolveStorage()

      if (!resolvedStorage) {
        return false
      }

      try {
        const payload = createPersistedSettingsSnapshot(
          snapshot,
          context.definitions
        )
        resolvedStorage.setItem(key, serializeStoredSettings(payload))

        if (cleanupLegacyKeys) {
          legacyKeys.forEach((legacyKey) => {
            resolvedStorage.removeItem(legacyKey)
          })
        }

        return true
      } catch (error) {
        console.error(
          `[settings] Failed to write localStorage (${key}):`,
          error
        )
        return false
      }
    },
    clear() {
      const resolvedStorage = resolveStorage()

      if (!resolvedStorage) {
        return false
      }

      try {
        resolvedStorage.removeItem(key)
        legacyKeys.forEach((legacyKey) => {
          resolvedStorage.removeItem(legacyKey)
        })
        return true
      } catch (error) {
        console.error(
          `[settings] Failed to clear localStorage (${key}):`,
          error
        )
        return false
      }
    },
  }
}

export function createCookieDriver({
  key = DEFAULT_SETTINGS_STORAGE_KEY,
  attributes = DEFAULT_COOKIE_ATTRIBUTES,
  cookieSource,
  select,
} = {}) {
  const resolveCookieString = () => {
    if (isString(cookieSource)) {
      return cookieSource
    }

    if (!isBrowser()) {
      return ''
    }

    return document.cookie || ''
  }

  const cookieAttributes = {
    ...DEFAULT_COOKIE_ATTRIBUTES,
    ...(isObject(attributes) ? attributes : {}),
  }

  if (cookieAttributes.secure === undefined && isBrowser()) {
    cookieAttributes.secure = window.location.protocol === 'https:'
  }

  const clearCookie = () => {
    if (!isBrowser()) {
      return false
    }

    try {
      document.cookie = serializeCookie(key, '', {
        ...cookieAttributes,
        maxAge: 0,
      })
      return true
    } catch (error) {
      console.error(`[settings] Failed to clear cookie (${key}):`, error)
      return false
    }
  }

  return {
    name: SETTINGS_STORAGE_TARGETS.COOKIE,
    key,
    isAvailable() {
      return isBrowser() && typeof document.cookie === 'string'
    },
    read() {
      const rawCookieValue = getCookieValue(resolveCookieString(), key)

      if (!rawCookieValue) {
        return {}
      }

      try {
        return parseStoredSettings(decodeURIComponent(rawCookieValue))
      } catch (error) {
        console.error(`[settings] Failed to read cookie (${key}):`, error)
        return {}
      }
    },
    write(snapshot, context = {}) {
      if (!isBrowser()) {
        return false
      }

      try {
        const payload =
          typeof select === 'function'
            ? select(snapshot, context)
            : createCookieSettingsSnapshot(snapshot, context.definitions)

        if (!isObject(payload) || Object.keys(payload).length === 0) {
          return clearCookie()
        }

        document.cookie = serializeCookie(
          key,
          encodeURIComponent(serializeStoredSettings(payload)),
          cookieAttributes
        )

        return true
      } catch (error) {
        console.error(`[settings] Failed to write cookie (${key}):`, error)
        return false
      }
    },
    clear: clearCookie,
  }
}

export function createSettingsStorage({
  key = DEFAULT_SETTINGS_STORAGE_KEY,
  drivers,
  sync = true,
} = {}) {
  const resolvedDrivers =
    Array.isArray(drivers) && drivers.length > 0
      ? drivers
      : [createLocalStorageDriver({ key }), createCookieDriver({ key })]

  const instanceId = `settings-storage-${storageInstanceCount + 1}`
  storageInstanceCount += 1
  const changeEventName = `settings:changed:${key}`

  const getActiveDrivers = (targets) =>
    resolvedDrivers.filter((driver) => {
      if (!driver || typeof driver !== 'object') {
        return false
      }

      if (targets?.length && !targets.includes(driver.name)) {
        return false
      }

      return typeof driver.isAvailable !== 'function' || driver.isAvailable()
    })

  const notifyChange = (reason) => {
    if (
      !sync ||
      !isBrowser() ||
      typeof window.dispatchEvent !== 'function' ||
      typeof window.CustomEvent !== 'function'
    ) {
      return
    }

    window.dispatchEvent(
      new CustomEvent(changeEventName, {
        detail: {
          instanceId,
          key,
          reason,
        },
      })
    )
  }

  const api = {
    key,
    instanceId,
    read(context = {}) {
      const snapshots = getActiveDrivers(context.targets).map((driver) => {
        try {
          return driver.read(context)
        } catch (error) {
          console.error(
            `[settings] Failed to read ${driver.name} (${key}):`,
            error
          )
          return {}
        }
      })

      return mergeSettingsObjects(...snapshots.reverse())
    },
    write(snapshot, context = {}) {
      const results = getActiveDrivers(context.targets).map((driver) => {
        try {
          return driver.write(snapshot, context)
        } catch (error) {
          console.error(
            `[settings] Failed to write ${driver.name} (${key}):`,
            error
          )
          return false
        }
      })

      const hasWritten = results.some(Boolean)

      if (hasWritten) {
        notifyChange('write')
      }

      return hasWritten
    },
    clear(context = {}) {
      const results = getActiveDrivers(context.targets).map((driver) => {
        try {
          return driver.clear(context)
        } catch (error) {
          console.error(
            `[settings] Failed to clear ${driver.name} (${key}):`,
            error
          )
          return false
        }
      })

      const hasCleared = results.some(Boolean)

      if (hasCleared) {
        notifyChange('clear')
      }

      return hasCleared
    },
    subscribe(listener) {
      if (!sync || !isBrowser() || typeof listener !== 'function') {
        return () => {}
      }

      const handleStorage = (event) => {
        if (event.key && event.key !== key) {
          return
        }

        listener(api.read(), {
          type: 'storage',
          key,
          reason: 'storage',
        })
      }

      const handleCustom = (event) => {
        if (event.detail?.key !== key) {
          return
        }

        listener(api.read(), {
          type: 'custom',
          ...event.detail,
        })
      }

      window.addEventListener('storage', handleStorage)
      window.addEventListener(changeEventName, handleCustom)

      return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(changeEventName, handleCustom)
      }
    },
  }

  return api
}
