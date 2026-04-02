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

import { useRegistryState, REGISTRY_TYPES } from '../registry/context'

const LoadingActionsContext = createContext(null)
const LoadingStateContext = createContext(null)

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const [skeleton, setSkeleton] = useState(null)
  const [minDuration, setMinDuration] = useState(0)

  const startTimeRef = useRef(null)
  const stopTimerRef = useRef(null)

  const { get } = useRegistryState()
  const registryLoading = get(REGISTRY_TYPES.LOADING, 'page-loading')

  const clearStopTimer = useCallback(() => {
    if (!stopTimerRef.current) return
    clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
  }, [])

  const resetState = useCallback(() => {
    clearStopTimer()
    setIsLoading(false)
    setSkeleton(null)
    setMinDuration(0)
    startTimeRef.current = null
  }, [clearStopTimer])

  const startLoading = useCallback(
    (options = {}) => {
      clearStopTimer()

      const duration = options.minDuration || 0

      startTimeRef.current = Date.now()
      setIsLoading(true)
      setMinDuration(duration)

      if (options.skeleton) {
        setSkeleton(options.skeleton)
      }
    },
    [clearStopTimer]
  )

  const stopLoading = useCallback(() => {
    const startTime = startTimeRef.current

    if (!startTime || minDuration === 0) {
      resetState()
      return
    }

    const elapsed = Date.now() - startTime
    const remaining = minDuration - elapsed

    if (remaining <= 0) {
      resetState()
      return
    }

    clearStopTimer()

    stopTimerRef.current = setTimeout(() => {
      resetState()
    }, remaining)
  }, [clearStopTimer, minDuration, resetState])

  const setLoading = useCallback(
    (value) => {
      if (value) startLoading()
      else stopLoading()
    },
    [startLoading, stopLoading]
  )

  const setIsLoadingAction = setLoading

  useEffect(() => {
    return () => {
      clearStopTimer()
    }
  }, [clearStopTimer])

  useEffect(() => {
    if (!registryLoading) {
      resetState()
      return
    }

    if (registryLoading.isLoading) {
      startLoading(registryLoading)
    } else {
      stopLoading()
    }

    if (registryLoading.skeleton) {
      setSkeleton(registryLoading.skeleton)
    }
  }, [registryLoading, resetState, startLoading, stopLoading])

  const stateValue = useMemo(
    () => ({
      isLoading,
      skeleton,
      minDuration,
    }),
    [isLoading, skeleton, minDuration]
  )

  const actionsValue = useMemo(
    () => ({
      startLoading,
      stopLoading,
      setIsLoading: setIsLoadingAction,
      setLoading,
      setSkeleton,
    }),
    [startLoading, stopLoading, setIsLoadingAction, setLoading]
  )

  return (
    <LoadingActionsContext.Provider value={actionsValue}>
      <LoadingStateContext.Provider value={stateValue}>
        {children}
      </LoadingStateContext.Provider>
    </LoadingActionsContext.Provider>
  )
}

export function useLoadingState() {
  const ctx = useContext(LoadingStateContext)
  if (!ctx) throw new Error('useLoadingState must be within LoadingProvider')
  return ctx
}

export function useLoadingActions() {
  const ctx = useContext(LoadingActionsContext)
  if (!ctx) throw new Error('useLoadingActions must be within LoadingProvider')
  return ctx
}
