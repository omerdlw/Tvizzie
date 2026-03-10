'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { apiClient } from '@/modules/api'
import { useNavRegistryActions } from '@/modules/registry/context'

export function usePollingNav({
  pauseOnHidden = true,
  baseConfig = {},
  interval = 30000,
  enabled = true,
  params = {},
  transform,
  onSuccess,
  endpoint,
  onError,
  navKey,
}) {
  const { register, unregister } = useNavRegistryActions()
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const abortControllerRef = useRef(null)
  const isVisibleRef = useRef(true)
  const intervalRef = useRef(null)

  const buildUrl = useCallback(() => {
    if (!endpoint) return null

    const queryString = new URLSearchParams(params).toString()
    return queryString ? `${endpoint}?${queryString}` : endpoint
  }, [endpoint, params])

  const fetchData = useCallback(async () => {
    const url = buildUrl()
    if (!url || !enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setError(null)

      const response = await apiClient.get(url, {
        signal: controller.signal,
        deduplicate: false,
        retry: false,
      })

      if (controller.signal.aborted) return

      setData(response.data)
      setLastUpdated(new Date())
      setLoading(false)
      onSuccess?.(response.data)
    } catch (err) {
      if (err.name === 'AbortError') return

      console.error(`[usePollingNav] Error fetching ${url}:`, err)
      setError(err)
      setLoading(false)
      onError?.(err)
    }
  }, [buildUrl, enabled, onSuccess, onError])

  useEffect(() => {
    if (!pauseOnHidden) return

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'

      if (isVisibleRef.current && enabled) {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseOnHidden, enabled, fetchData])

  useEffect(() => {
    if (!enabled || !endpoint) return

    fetchData()

    intervalRef.current = setInterval(() => {
      if (!pauseOnHidden || isVisibleRef.current) {
        fetchData()
      }
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, endpoint, interval, pauseOnHidden, fetchData])

  useEffect(() => {
    if (!navKey) return

    let navConfig = {
      pollingInterval: interval,
      isPolling: true,
      name: navKey,
      ...baseConfig,
    }

    if (data && transform) {
      try {
        const transformed = transform(data)
        navConfig = { ...navConfig, ...transformed }
      } catch (transformError) {
        console.error('[usePollingNav] Transform error:', transformError)
      }
    }

    if (loading) {
      navConfig.isLoading = true
    }

    if (error) {
      navConfig.hasError = true
      navConfig.description = navConfig.description || 'Error loading data'
    }

    register(navKey, navConfig, 'dynamic')

    return () => {
      unregister(navKey, 'dynamic')
    }
  }, [
    navKey,
    data,
    loading,
    error,
    transform,
    baseConfig,
    interval,
    register,
    unregister,
  ])

  useEffect(() => {
    return () => {
      if (navKey) {
        unregister(navKey, 'dynamic')
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [navKey, unregister])

  return {
    refetch: fetchData,
    lastUpdated,
    loading,
    error,
    data,
    pause: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    },
    resume: () => {
      if (!intervalRef.current && enabled) {
        fetchData()
        intervalRef.current = setInterval(() => {
          if (!pauseOnHidden || isVisibleRef.current) {
            fetchData()
          }
        }, interval)
      }
    },
  }
}

export function useNavPollingUpdate({
  interval = 30000,
  enabled = true,
  fetchFn,
  navKey,
}) {
  const { register } = useNavRegistryActions()
  const intervalRef = useRef(null)

  const update = useCallback(async () => {
    try {
      const updates = await fetchFn()
      if (updates && navKey) {
        register(navKey, updates, 'dynamic')
      }
    } catch (err) {
      console.error(`[useNavPollingUpdate] Error updating ${navKey}:`, err)
    }
  }, [navKey, fetchFn, register])

  useEffect(() => {
    if (!enabled || !navKey) return

    update()

    intervalRef.current = setInterval(update, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, navKey, interval, update])

  return { update }
}

export default usePollingNav
