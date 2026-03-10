'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { PROJECT_CONFIG } from '@/config/project.config'

const FeaturesContext = createContext(null)

function createDefaultFeatures(config, initialFeatures) {
  return {
    ...(config?.features || {}),
    devTools: process.env.NODE_ENV === 'development',
    debugMode: false,
    ...initialFeatures,
  }
}

export function FeaturesProvider({ initialFeatures = {}, children }) {
  const config = PROJECT_CONFIG
  const [features, setFeatures] = useState(() =>
    createDefaultFeatures(config, initialFeatures)
  )

  const isEnabled = useCallback(
    (featureKey) => {
      return Boolean(features[featureKey])
    },
    [features]
  )

  const enable = useCallback((featureKey) => {
    setFeatures((prev) => ({ ...prev, [featureKey]: true }))
  }, [])

  const disable = useCallback((featureKey) => {
    setFeatures((prev) => ({ ...prev, [featureKey]: false }))
  }, [])

  const toggle = useCallback((featureKey) => {
    setFeatures((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }))
  }, [])

  const setFeature = useCallback((featureKey, value) => {
    setFeatures((prev) => ({ ...prev, [featureKey]: value }))
  }, [])

  const resetFeatures = useCallback(() => {
    setFeatures(createDefaultFeatures(config, initialFeatures))
  }, [config, initialFeatures])

  const value = useMemo(
    () => ({
      resetFeatures,
      setFeature,
      isEnabled,
      features,
      disable,
      enable,
      toggle,
    }),
    [features, isEnabled, enable, disable, toggle, setFeature, resetFeatures]
  )

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  )
}

export function useFeatures() {
  const context = useContext(FeaturesContext)
  if (!context) {
    throw new Error('useFeatures must be used within a FeaturesProvider')
  }
  return context
}

export function useFeature(featureKey) {
  const { isEnabled, enable, disable, toggle } = useFeatures()

  return useMemo(
    () => ({
      isEnabled: isEnabled(featureKey),
      disable: () => disable(featureKey),
      enable: () => enable(featureKey),
      toggle: () => toggle(featureKey),
    }),
    [featureKey, isEnabled, enable, disable, toggle]
  )
}
