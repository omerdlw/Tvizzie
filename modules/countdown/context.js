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

import { useFeatures } from '../features/context'
import { DEFAULT_COUNTDOWN } from './config'

const CountdownStateContext = createContext(null)
const CountdownActionsContext = createContext(null)

export function CountdownProvider({ children }) {
  const { isEnabled } = useFeatures()
  const countdownEnabled = isEnabled('countdown')

  const [configOverrides, setConfigState] = useState({})
  const config = useMemo(
    () => ({ ...DEFAULT_COUNTDOWN, ...configOverrides }),
    [configOverrides]
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
  const context = useContext(CountdownStateContext)
  if (!context)
    throw new Error('useCountdownState must be within CountdownProvider')
  return context
}

export function useCountdownActions() {
  const context = useContext(CountdownActionsContext)
  if (!context)
    throw new Error('useCountdownActions must be within CountdownProvider')
  return context
}
