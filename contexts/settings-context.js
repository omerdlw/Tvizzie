'use client'

import { create } from 'zustand'

import { getStorageItem, setStorageItem } from '@/lib/utils/client-utils'

const STORAGE_KEYS = {
  SETTINGS: 'app_settings',
}

const DEFAULT_SETTINGS = {}

const getStoredSettings = () => {
  const stored = getStorageItem(STORAGE_KEYS.SETTINGS)
  if (!stored) return DEFAULT_SETTINGS

  const migrated = {}
  Object.keys(stored).forEach((key) => {
    migrated[key.toLowerCase()] = stored[key]
  })

  return { ...DEFAULT_SETTINGS, ...migrated }
}

const saveSettings = (settings) => {
  return setStorageItem(STORAGE_KEYS.SETTINGS, settings)
}

const getInitialState = () => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  const stored = getStoredSettings()

  if (stored.theme) {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(stored.theme)
  }
  return stored
}

export const useSettings = create((set, get) => ({
  settings: getInitialState(),
  isInitialized: typeof window !== 'undefined',

  initialize: () => {
    if (get().isInitialized) return
    const stored = getInitialState()
    set({ settings: stored, isInitialized: true })
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings }
      saveSettings(updated)

      if (newSettings.theme) {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(newSettings.theme)
      }

      return { settings: updated }
    })
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS })
    saveSettings(DEFAULT_SETTINGS)

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(DEFAULT_SETTINGS.theme)
  },
}))

export const useSetting = (key) => useSettings((state) => state.settings[key])

export function SettingsProvider({ children }) {
  useSettings.getState().initialize()
  return <>{children}</>
}
