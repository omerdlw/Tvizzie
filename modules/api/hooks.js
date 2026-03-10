'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { useToast } from '@/modules/notification/hooks'

import { apiCache } from './cache'
import { apiClient } from './client'
import { ApiError } from './types'

export function useApi(options = {}) {
  const {
    successMessage = 'Operation successful',
    showSuccessToast = false,
    showErrorToast = true,
    errorMessage,
    onSuccess,
    onError,
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const execute = useCallback(
    async (apiCall) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiCall()
        if (showSuccessToast) toastRef.current.success(successMessage)
        onSuccess?.(result)
        return result
      } catch (err) {
        const apiError =
          err instanceof ApiError ? err : new ApiError(err.message, 0)
        setError(apiError)
        if (showErrorToast && !apiError.isNotFound()) {
          toastRef.current.error(
            errorMessage || apiError.message || 'An error occurred'
          )
        }
        onError?.(apiError)
        throw apiError
      } finally {
        setLoading(false)
      }
    },
    [
      showSuccessToast,
      successMessage,
      showErrorToast,
      errorMessage,
      onSuccess,
      onError,
    ]
  )

  return { execute, loading, error }
}

export function useQuery(endpoint, options = {}) {
  const {
    cacheTime = 5 * 60 * 1000,
    refetchOnMount = true,
    refetchOnFocus = true,
    showErrorToast = true,
    refetchInterval,
    enabled = true,
    params = {},
    onSuccess,
    onError,
  } = options

  const cacheKey = endpoint ? `${endpoint}:${JSON.stringify(params)}` : null

  const cachedData = useSyncExternalStore(
    useCallback(
      (notify) => {
        if (!cacheKey) return () => {}
        return apiCache.subscribe(cacheKey, notify)
      },
      [cacheKey]
    ),
    () => (cacheKey ? apiCache.get(cacheKey) : null),
    () => null
  )

  const [loading, setLoading] = useState(enabled && !cachedData)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const serializedParams = JSON.stringify(params)

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled || !endpoint) return

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsFetching(true)
      if (!cachedData) setLoading(true)
      setError(null)

      try {
        const currentParams = JSON.parse(serializedParams)
        const queryString = new URLSearchParams(currentParams).toString()
        const url = queryString ? `${endpoint}?${queryString}` : endpoint

        const data = force
          ? await apiClient.get(url, { signal: controller.signal })
          : await apiCache.fetchOrGet(
              cacheKey,
              () => apiClient.get(url, { signal: controller.signal }),
              cacheTime
            )

        if (force && cacheKey) {
          apiCache.set(cacheKey, data, cacheTime)
        }

        onSuccess?.(data)
      } catch (err) {
        if (err.name === 'AbortError') return

        const apiError =
          err instanceof ApiError ? err : new ApiError(err.message, 0)
        setError(apiError)
        if (showErrorToast && !apiError.isNotFound())
          toastRef.current.error(apiError.message || 'Error loading data')
        onError?.(apiError)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setIsFetching(false)
        }
      }
    },
    [
      showErrorToast,
      serializedParams,
      cachedData,
      cacheTime,
      onSuccess,
      endpoint,
      cacheKey,
      onError,
      enabled,
    ]
  )

  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData()
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, refetchOnMount, fetchData])

  useEffect(() => {
    if (!refetchInterval || !enabled) return
    const interval = setInterval(() => fetchData(true), refetchInterval)
    return () => clearInterval(interval)
  }, [refetchInterval, enabled, fetchData])

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return
    const handleFocus = () => {
      if (document.visibilityState === 'visible') fetchData(false)
    }
    window.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refetchOnFocus, enabled, fetchData])

  const invalidate = useCallback(() => {
    if (cacheKey) apiCache.delete(cacheKey)
  }, [cacheKey])

  return {
    isSuccess: !!cachedData && !error,
    refetch: () => fetchData(true),
    isError: !!error,
    data: cachedData,
    isFetching,
    invalidate,
    loading,
    error,
  }
}

export function useMutation(options = {}) {
  const {
    invalidateQueries = [],
    showSuccessToast = true,
    showErrorToast = true,
    successMessage,
    errorMessage,
    onSettled,
    onSuccess,
    onError,
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const mutate = useCallback(
    async (mutationFn, mutationOptions = {}) => {
      const opts = { ...options, ...mutationOptions }
      setLoading(true)
      setError(null)

      let previousData = null

      try {
        if (opts.onMutate) {
          previousData = await opts.onMutate()
        }

        const result = await mutationFn()
        setData(result)

        const queriesToInvalidate = [
          ...invalidateQueries,
          ...(opts.invalidateQueries || []),
        ]
        queriesToInvalidate.forEach((key) => {
          if (key.includes('*')) {
            apiCache.invalidatePattern(key.replace('*', '.*'))
          } else {
            apiCache.delete(key)
          }
        })

        if (opts.showSuccessToast ?? showSuccessToast) {
          toastRef.current.success(
            opts.successMessage || successMessage || 'Saved!'
          )
        }

        ;(opts.onSuccess || onSuccess)?.(result)
        return result
      } catch (err) {
        const apiError =
          err instanceof ApiError ? err : new ApiError(err.message, 0)
        setError(apiError)

        if (previousData !== null) {
          ;(opts.onError || onError)?.(apiError, previousData)
        } else {
          ;(opts.onError || onError)?.(apiError)
        }

        if ((opts.showErrorToast ?? showErrorToast) && !apiError.isNotFound()) {
          toastRef.current.error(
            opts.errorMessage || errorMessage || apiError.message || 'Error'
          )
        }

        throw apiError
      } finally {
        setLoading(false)
        ;(opts.onSettled || onSettled)?.()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      invalidateQueries,
      showSuccessToast,
      showErrorToast,
      successMessage,
      errorMessage,
      onSettled,
      onSuccess,
      onError,
    ]
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return {
    isSuccess: data !== null && !error,
    isError: !!error,
    loading,
    mutate,
    error,
    reset,
    data,
  }
}
