'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
  useRef,
} from 'react'

import { getBackgroundAnimation, DEFAULT_PRESET, getPreset } from './presets'

const TransitionStateContext = createContext(null)
const TransitionActionsContext = createContext(null)

export function TransitionProvider({ children }) {
  const [currentPreset, setCurrentPreset] = useState(DEFAULT_PRESET)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const callbacksRef = useRef(new Set())

  const notify = useCallback((type) => {
    callbacksRef.current.forEach((cb) => {
      try {
        cb(type)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Transition callback failed:', error)
        }
      }
    })
  }, [])

  const setPreset = useCallback((preset) => {
    setCurrentPreset(preset)
  }, [])

  const startTransition = useCallback(() => {
    setIsTransitioning(true)
    notify('start')
  }, [notify])

  const endTransition = useCallback(() => {
    setIsTransitioning(false)
    notify('end')
  }, [notify])

  const subscribeToTransition = useCallback((callback) => {
    callbacksRef.current.add(callback)

    return () => {
      callbacksRef.current.delete(callback)
    }
  }, [])

  const presetConfig = useMemo(() => getPreset(currentPreset), [currentPreset])
  const backgroundAnimation = useMemo(
    () => getBackgroundAnimation(currentPreset),
    [currentPreset]
  )

  const stateValue = useMemo(
    () => ({
      currentPreset,
      isTransitioning,
      presetConfig,
      backgroundAnimation,
    }),
    [currentPreset, isTransitioning, presetConfig, backgroundAnimation]
  )

  const actionsValue = useMemo(
    () => ({
      setPreset,
      startTransition,
      endTransition,
      subscribeToTransition,
    }),
    [setPreset, startTransition, endTransition, subscribeToTransition]
  )

  return (
    <TransitionActionsContext.Provider value={actionsValue}>
      <TransitionStateContext.Provider value={stateValue}>
        {children}
      </TransitionStateContext.Provider>
    </TransitionActionsContext.Provider>
  )
}

export function useTransitionState() {
  const ctx = useContext(TransitionStateContext)

  if (!ctx) {
    throw new Error('useTransitionState must be used within TransitionProvider')
  }

  return ctx
}

export function useTransitionActions() {
  const ctx = useContext(TransitionActionsContext)

  if (!ctx) {
    throw new Error(
      'useTransitionActions must be used within TransitionProvider'
    )
  }

  return ctx
}
