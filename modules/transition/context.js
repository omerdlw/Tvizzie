'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

import { DEFAULT_PRESET, getBackgroundAnimation, getPreset } from './presets'

const TransitionStateContext = createContext(null)
const TransitionActionsContext = createContext(null)

export function TransitionProvider({ children }) {
  const [currentPreset, setCurrentPresetState] = useState(DEFAULT_PRESET)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionCallbacksRef = useRef([])

  const setPreset = useCallback((preset) => {
    setCurrentPresetState(preset)
  }, [])

  const startTransition = useCallback(() => {
    setIsTransitioning(true)
    transitionCallbacksRef.current.forEach((cb) => cb('start'))
  }, [])

  const endTransition = useCallback(() => {
    setIsTransitioning(false)
    transitionCallbacksRef.current.forEach((cb) => cb('end'))
  }, [])

  const subscribeToTransition = useCallback((callback) => {
    transitionCallbacksRef.current.push(callback)
    return () => {
      transitionCallbacksRef.current = transitionCallbacksRef.current.filter(
        (cb) => cb !== callback
      )
    }
  }, [])

  const stateValue = useMemo(
    () => ({
      currentPreset,
      isTransitioning,
      presetConfig: getPreset(currentPreset),
      backgroundAnimation: getBackgroundAnimation(currentPreset),
    }),
    [currentPreset, isTransitioning]
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
  const context = useContext(TransitionStateContext)
  if (!context) {
    throw new Error('useTransitionState must be used within TransitionProvider')
  }
  return context
}

export function useTransitionActions() {
  const context = useContext(TransitionActionsContext)
  if (!context) {
    throw new Error(
      'useTransitionActions must be used within TransitionProvider'
    )
  }
  return context
}
