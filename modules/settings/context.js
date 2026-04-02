'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'

import { isObject } from '@/lib/utils'

import { DEFAULT_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS_CONFIG } from './config'
import {
  createLocalStorageDriver,
  createSettingsStorage,
  createCookieDriver,
} from './storage'
import {
  normalizeSettingsDefinitions,
  resolveSettingsSnapshot,
  createSettingsBaseline,
  sanitizeSettingsState,
  mergeSettingsObjects,
  removeSettingValue,
  getSettingValue,
  setSettingValue,
} from './utils'

const SettingsStateContext = createContext(null)
const SettingsActionsContext = createContext(null)
const EMPTY_OBJECT = Object.freeze({})

function createResolvedConfig(
  config = EMPTY_OBJECT,
  initialSettings = EMPTY_OBJECT
) {
  const providedStorage = isObject(config.storage) ? config.storage : {}
  const providedLocalStorage = isObject(providedStorage.localStorage)
    ? providedStorage.localStorage
    : {}
  const providedCookie = isObject(providedStorage.cookie)
    ? providedStorage.cookie
    : {}

  return {
    ...DEFAULT_SETTINGS_CONFIG,
    ...config,
    storageKey:
      typeof config.storageKey === 'string' && config.storageKey.trim()
        ? config.storageKey
        : DEFAULT_SETTINGS_STORAGE_KEY,
    definitions: normalizeSettingsDefinitions(config.definitions),
    initialSettings: mergeSettingsObjects(
      DEFAULT_SETTINGS_CONFIG.initialSettings,
      isObject(config.initialSettings) ? config.initialSettings : {},
      isObject(initialSettings) ? initialSettings : {}
    ),
    storage: {
      ...DEFAULT_SETTINGS_CONFIG.storage,
      ...providedStorage,
      localStorage: {
        ...DEFAULT_SETTINGS_CONFIG.storage.localStorage,
        ...providedLocalStorage,
      },
      cookie: {
        ...DEFAULT_SETTINGS_CONFIG.storage.cookie,
        ...providedCookie,
        attributes: {
          ...DEFAULT_SETTINGS_CONFIG.storage.cookie.attributes,
          ...(isObject(providedCookie.attributes)
            ? providedCookie.attributes
            : {}),
        },
      },
    },
  }
}

function createProviderStorage(config) {
  const drivers = []

  if (config.storage?.localStorage?.enabled !== false) {
    drivers.push(
      createLocalStorageDriver({
        key: config.storageKey,
        ...config.storage.localStorage,
      })
    )
  }

  if (config.storage?.cookie?.enabled !== false) {
    drivers.push(
      createCookieDriver({
        key: config.storageKey,
        ...config.storage.cookie,
      })
    )
  }

  return createSettingsStorage({
    key: config.storageKey,
    drivers,
    sync: config.syncExternalChanges !== false,
  })
}

export function SettingsProvider({
  children,
  config = EMPTY_OBJECT,
  initialSettings = EMPTY_OBJECT,
}) {
  const resolvedConfig = useMemo(
    () => createResolvedConfig(config, initialSettings),
    [config, initialSettings]
  )
  const storage = useMemo(
    () => createProviderStorage(resolvedConfig),
    [resolvedConfig]
  )
  const definitionsRef = useRef(resolvedConfig.definitions)
  const initialSettingsRef = useRef(resolvedConfig.initialSettings)
  const [definitions, setDefinitions] = useState(definitionsRef.current)
  const [settings, setSettings] = useState(() =>
    createSettingsBaseline(definitionsRef.current, initialSettingsRef.current)
  )
  const [isHydrated, setIsHydrated] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const settingsRef = useRef(settings)

  settingsRef.current = settings

  const replaceSettings = useCallback((nextSettings) => {
    settingsRef.current = nextSettings
    setSettings(nextSettings)
    setLastUpdatedAt(Date.now())
    return nextSettings
  }, [])

  const commitSettings = useCallback(
    (nextSettings, activeDefinitions = definitionsRef.current) => {
      const sanitizedSettings = sanitizeSettingsState(
        nextSettings,
        activeDefinitions
      )

      replaceSettings(sanitizedSettings)
      storage.write(sanitizedSettings, {
        definitions: activeDefinitions,
      })

      return sanitizedSettings
    },
    [replaceSettings, storage]
  )

  const hydrateSettings = useCallback(
    ({ persist = false } = {}) => {
      const nextSettings = resolveSettingsSnapshot({
        definitions: definitionsRef.current,
        initialSettings: initialSettingsRef.current,
        storedSettings: storage.read({
          definitions: definitionsRef.current,
        }),
      })

      replaceSettings(nextSettings)

      if (persist && Object.keys(nextSettings).length > 0) {
        storage.write(nextSettings, {
          definitions: definitionsRef.current,
        })
      }

      setIsHydrated(true)
      return nextSettings
    },
    [replaceSettings, storage]
  )

  useEffect(() => {
    definitionsRef.current = resolvedConfig.definitions
    initialSettingsRef.current = resolvedConfig.initialSettings
    setDefinitions(resolvedConfig.definitions)

    const shouldPersist = Object.keys(storage.read()).length > 0
    hydrateSettings({ persist: shouldPersist })
  }, [hydrateSettings, resolvedConfig, storage])

  useEffect(() => {
    if (resolvedConfig.syncExternalChanges === false) {
      return undefined
    }

    return storage.subscribe((snapshot, meta = {}) => {
      if (meta.instanceId && meta.instanceId === storage.instanceId) {
        return
      }

      const nextSettings = resolveSettingsSnapshot({
        definitions: definitionsRef.current,
        initialSettings: initialSettingsRef.current,
        storedSettings: snapshot,
      })

      replaceSettings(nextSettings)
      setIsHydrated(true)
    })
  }, [replaceSettings, resolvedConfig.syncExternalChanges, storage])

  const getSetting = useCallback((path, fallback = undefined) => {
    return getSettingValue(settingsRef.current, path, fallback)
  }, [])

  const setSetting = useCallback(
    (path, value) => {
      const currentValue = getSettingValue(settingsRef.current, path)
      const resolvedValue =
        typeof value === 'function' ? value(currentValue) : value
      const nextSettings = setSettingValue(
        settingsRef.current,
        path,
        resolvedValue
      )

      return commitSettings(nextSettings)
    },
    [commitSettings]
  )

  const updateSettings = useCallback(
    (patch) => {
      const resolvedPatch =
        typeof patch === 'function' ? patch(settingsRef.current) : patch
      const nextSettings = mergeSettingsObjects(
        settingsRef.current,
        isObject(resolvedPatch) ? resolvedPatch : {}
      )

      return commitSettings(nextSettings)
    },
    [commitSettings]
  )

  const removeSetting = useCallback(
    (path) => {
      const nextSettings = removeSettingValue(settingsRef.current, path)
      return commitSettings(nextSettings)
    },
    [commitSettings]
  )

  const resetSettings = useCallback(
    (paths) => {
      const baseline = createSettingsBaseline(
        definitionsRef.current,
        initialSettingsRef.current
      )

      if (!paths || (Array.isArray(paths) && paths.length === 0)) {
        return commitSettings(baseline)
      }

      const targetPaths = Array.isArray(paths) ? paths : [paths]
      let nextSettings = settingsRef.current

      targetPaths.forEach((path) => {
        const fallbackValue = getSettingValue(baseline, path)

        if (fallbackValue === undefined) {
          nextSettings = removeSettingValue(nextSettings, path)
          return
        }

        nextSettings = setSettingValue(nextSettings, path, fallbackValue)
      })

      return commitSettings(nextSettings)
    },
    [commitSettings]
  )

  const clearSettings = useCallback(() => {
    storage.clear()

    const baseline = createSettingsBaseline(
      definitionsRef.current,
      initialSettingsRef.current
    )

    replaceSettings(baseline)
    return baseline
  }, [replaceSettings, storage])

  const registerSettings = useCallback(
    (nextDefinitions, { replace = false } = {}) => {
      const normalizedDefinitions =
        normalizeSettingsDefinitions(nextDefinitions)
      const mergedDefinitions = replace
        ? normalizedDefinitions
        : {
            ...definitionsRef.current,
            ...normalizedDefinitions,
          }

      definitionsRef.current = mergedDefinitions
      setDefinitions(mergedDefinitions)

      const nextSettings = mergeSettingsObjects(
        createSettingsBaseline(mergedDefinitions, initialSettingsRef.current),
        settingsRef.current
      )

      return commitSettings(nextSettings, mergedDefinitions)
    },
    [commitSettings]
  )

  const stateValue = useMemo(
    () => ({
      definitions,
      isHydrated,
      lastUpdatedAt,
      settings,
      storageKey: resolvedConfig.storageKey,
    }),
    [
      definitions,
      isHydrated,
      lastUpdatedAt,
      settings,
      resolvedConfig.storageKey,
    ]
  )

  const actionsValue = useMemo(
    () => ({
      clearSettings,
      getSetting,
      hydrateSettings,
      registerSettings,
      removeSetting,
      resetSettings,
      setSetting,
      updateSettings,
    }),
    [
      clearSettings,
      getSetting,
      hydrateSettings,
      registerSettings,
      removeSetting,
      resetSettings,
      setSetting,
      updateSettings,
    ]
  )

  return (
    <SettingsActionsContext.Provider value={actionsValue}>
      <SettingsStateContext.Provider value={stateValue}>
        {children}
      </SettingsStateContext.Provider>
    </SettingsActionsContext.Provider>
  )
}

export function useSettingsState() {
  const context = useContext(SettingsStateContext)

  if (!context) {
    throw new Error('useSettingsState must be used within a SettingsProvider')
  }

  return context
}

export function useSettingsActions() {
  const context = useContext(SettingsActionsContext)

  if (!context) {
    throw new Error('useSettingsActions must be used within a SettingsProvider')
  }

  return context
}

export function useSettings() {
  const state = useSettingsState()
  const actions = useSettingsActions()

  return useMemo(() => ({ ...state, ...actions }), [actions, state])
}

export function useSetting(path, fallback = undefined) {
  const { settings } = useSettingsState()

  return useMemo(
    () => getSettingValue(settings, path, fallback),
    [fallback, path, settings]
  )
}

export function useRegisterSettings(definitions, options) {
  const { registerSettings } = useSettingsActions()

  useEffect(() => {
    registerSettings(definitions, options)
  }, [definitions, options, registerSettings])
}
