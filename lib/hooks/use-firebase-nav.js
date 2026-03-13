'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useSettings } from '@/contexts/settings-context'
import { NAV_EVENT_HANDLERS } from '@/modules/nav/events'
import { useNavRegistryActions } from '@/modules/registry/context'
import { subscribeToPath } from '@/services/firebase-realtime.service'

export function useFirebaseNav({
  onDataChange,
  settingsKey,
  transform,
  sourceId,
  onSelect,
  path,
}) {
  const { register, unregister } = useNavRegistryActions()
  const { settings, updateSettings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const registeredKeysRef = useRef(new Set())
  const id = sourceId || path

  const selectedValue = settings[settingsKey]

  const handleSelect = useCallback(
    (key, itemData) => {
      updateSettings({ [settingsKey]: key })
      NAV_EVENT_HANDLERS.selectDataSource(settingsKey, key, 'firebase')
      onSelect?.(key, itemData)
    },
    [settingsKey, updateSettings, onSelect]
  )

  useEffect(() => {
    if (!path) return
    setLoading(true)
    setError(null)
    const unsubscribe = subscribeToPath(path, (newData, err) => {
      setLoading(false)
      if (err) {
        setError(err)
        console.error(`[useFirebaseNav] Error subscribing to ${path}:`, err)
        return
      }
      setData(newData)
      onDataChange?.(newData)
    })

    return () => {
      unsubscribe()
    }
  }, [path, onDataChange])

  useEffect(() => {
    if (!loading) return
    const loadingKey = `${id}-loading`
    register(
      loadingKey,
      {
        dataSourceType: 'firebase',
        icon: 'solar:refresh-circle-bold',
        description: 'Fetching data',
        title: 'Loading',
        isDataSource: true,
        name: loadingKey,
        isLoading: true,
      },
      'dynamic'
    )

    return () => {
      unregister(loadingKey, 'dynamic')
    }
  }, [loading, id, register, unregister])

  const dataRef = useRef(data)
  dataRef.current = data
  const selectedValueRef = useRef(selectedValue)
  selectedValueRef.current = selectedValue
  const prevSelectedRef = useRef(selectedValue)

  useEffect(() => {
    if (!data || !transform) return

    const currentKeys = new Set()

    Object.entries(data).forEach(([key, itemData]) => {
      const isSelected = selectedValueRef.current === key
      const navKey = `${id}-${key}`

      try {
        const navConfig = transform(key, itemData, isSelected)
        if (!navConfig) return

        const fullConfig = {
          ...navConfig,
          onClick: () => handleSelect(key, itemData),
          dataSourceType: 'firebase',
          isDataSource: true,
          dataSourceKey: key,
          isSelected,
        }

        register(navKey, fullConfig, 'dynamic')
        currentKeys.add(navKey)
        registeredKeysRef.current.add(navKey)
      } catch (transformError) {
        console.error(
          `[useFirebaseNav] Transform error for key ${key}:`,
          transformError
        )
      }
    })

    registeredKeysRef.current.forEach((navKey) => {
      if (!currentKeys.has(navKey)) {
        unregister(navKey, 'dynamic')
        registeredKeysRef.current.delete(navKey)
      }
    })

    prevSelectedRef.current = selectedValueRef.current
  }, [data, transform, register, unregister, id, handleSelect])

  useEffect(() => {
    if (!dataRef.current || !transform) return

    const prev = prevSelectedRef.current
    const curr = selectedValue

    if (prev === curr) return

    const updateItem = (key, selected) => {
      const itemData = dataRef.current[key]
      if (!itemData) return

      const navKey = `${id}-${key}`
      try {
        const navConfig = transform(key, itemData, selected)
        if (!navConfig) return

        const fullConfig = {
          ...navConfig,
          onClick: () => handleSelect(key, itemData),
          dataSourceType: 'firebase',
          isDataSource: true,
          dataSourceKey: key,
          isSelected: selected,
        }
        register(navKey, fullConfig, 'dynamic')
      } catch (err) {
        console.error(
          `[useFirebaseNav] Selection update error for key ${key}:`,
          err
        )
      }
    }

    if (prev) updateItem(prev, false)

    if (curr) updateItem(curr, true)

    prevSelectedRef.current = curr
  }, [selectedValue, transform, register, id, handleSelect])

  useEffect(() => {
    const keysSnapshot = registeredKeysRef.current
    return () => {
      keysSnapshot.forEach((navKey) => {
        unregister(navKey, 'dynamic')
      })
      keysSnapshot.clear()
    }
  }, [unregister])

  return {
    refresh: () => {
      setLoading(true)
      setData(null)
    },
    select: handleSelect,
    selectedValue,
    loading,
    error,
    data,
  }
}

export function useSelectedDataSource(settingsKey) {
  const { settings } = useSettings()
  return settings[settingsKey] || null
}

export function useSelectedFirebaseData({ settingsKey, path }) {
  const [selectedData, setSelectedData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { settings } = useSettings()

  const selectedKey = settings[settingsKey]

  useEffect(() => {
    if (!path || !selectedKey) {
      setSelectedData(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeToPath(
      `${path}/${selectedKey}`,
      (data, err) => {
        setLoading(false)

        if (err) {
          setError(err)
          return
        }

        setSelectedData(data)
      }
    )

    return unsubscribe
  }, [path, selectedKey])

  return {
    selectedData,
    selectedKey,
    loading,
    error,
  }
}

export default useFirebaseNav
