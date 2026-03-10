'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { REGISTRY_TYPES, useRegistryState } from '../registry/context'

const LoadingActionsContext = createContext(null)
const LoadingStateContext = createContext(null)

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoadingState] = useState(false)
  const [minDuration, setMinDuration] = useState(0)
  const [skeleton, setSkeleton] = useState(null)

  const pendingStopRef = useRef(false)
  const minDurationRef = useRef(0)
  const startTimeRef = useRef(null)

  const { get } = useRegistryState()
  const registryLoading = get(REGISTRY_TYPES.LOADING, 'page-loading')

  const startLoading = useCallback((options = {}) => {
    minDurationRef.current = options.minDuration || 0
    startTimeRef.current = Date.now()
    pendingStopRef.current = false

    setIsLoadingState(true)
    if (options.skeleton) setSkeleton(options.skeleton)
    if (options.minDuration) setMinDuration(options.minDuration)
  }, [])

  const stopLoading = useCallback(() => {
    const startTime = startTimeRef.current
    const minDur = minDurationRef.current

    const finish = () => {
      setIsLoadingState(false)
      setSkeleton(null)
      setMinDuration(0)
      startTimeRef.current = null
      pendingStopRef.current = false
    }

    if (!startTime || minDur === 0) {
      finish()
      return
    }

    const elapsed = Date.now() - startTime
    const remaining = minDur - elapsed

    if (remaining <= 0) {
      finish()
    } else {
      pendingStopRef.current = true
      setTimeout(() => {
        if (pendingStopRef.current) finish()
      }, remaining)
    }
  }, [])

  const setIsLoading = useCallback(
    (value) => {
      if (value) {
        startLoading()
      } else {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  useEffect(() => {
    if (registryLoading) {
      if (registryLoading.isLoading) {
        setIsLoading(true)
      } else {
        setIsLoading(false)
      }

      if (registryLoading.skeleton) {
        setSkeleton(registryLoading.skeleton)
      }
    } else {
      setIsLoading(false)
      setSkeleton(null)
    }
  }, [registryLoading, setIsLoading, setSkeleton])

  const stateValue = useMemo(
    () => ({
      minDuration,
      isLoading,
      skeleton,
    }),
    [isLoading, skeleton, minDuration]
  )

  const actionsValue = useMemo(
    () => ({
      startLoading,
      setIsLoading,
      stopLoading,
      setSkeleton,
    }),
    [startLoading, stopLoading, setIsLoading]
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
  const context = useContext(LoadingStateContext)
  if (!context)
    throw new Error('useLoadingState must be within LoadingProvider')
  return context
}

export function useLoadingActions() {
  const context = useContext(LoadingActionsContext)
  if (!context)
    throw new Error('useLoadingActions must be within LoadingProvider')
  return context
}
