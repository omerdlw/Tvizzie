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

import { DEFAULT_COUNTDOWN } from './config'

const FALLBACK_COUNTDOWN_STATE = Object.freeze({
  isEnabled: false,
  timeLeft: {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  },
  config: DEFAULT_COUNTDOWN,
})

const FALLBACK_COUNTDOWN_ACTIONS = Object.freeze({
  setConfig: () => {},
})

const CountdownStateContext = createContext(FALLBACK_COUNTDOWN_STATE)
const CountdownActionsContext = createContext(FALLBACK_COUNTDOWN_ACTIONS)

export function CountdownProvider({ children, config: providerConfig = {} }) {
  const resolvedProviderConfig = useMemo(
    () =>
      providerConfig && typeof providerConfig === 'object' ? providerConfig : {},
    [providerConfig]
  )
  const countdownEnabled = resolvedProviderConfig.enabled === true

  const [configOverrides, setConfigState] = useState({})
  const config = useMemo(
    () => ({
      ...DEFAULT_COUNTDOWN,
      ...resolvedProviderConfig,
      ...configOverrides,
    }),
    [configOverrides, resolvedProviderConfig]
  )

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const intervalRef = useRef(null)

  useEffect(() => {
    if (!countdownEnabled) return

    const tick = () => {
      const now = new Date()
      const diff = config.targetDate - now

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [countdownEnabled, config.targetDate])

  const setConfig = useCallback((newConfig) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }))
  }, [])

  const stateValue = useMemo(
    () => ({
      isEnabled: countdownEnabled,
      timeLeft,
      config,
    }),
    [countdownEnabled, timeLeft, config]
  )

  const actionsValue = useMemo(
    () => ({
      setConfig,
    }),
    [setConfig]
  )

  return (
    <CountdownActionsContext.Provider value={actionsValue}>
      <CountdownStateContext.Provider value={stateValue}>
        {children}
      </CountdownStateContext.Provider>
    </CountdownActionsContext.Provider>
  )
}

export function useCountdownState() {
  return useContext(CountdownStateContext)
}

export function useCountdownActions() {
  return useContext(CountdownActionsContext)
}
