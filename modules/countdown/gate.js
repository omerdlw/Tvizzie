'use client'

import { useCountdownState } from './context'

export function CountdownGate({ children }) {
  const { isEnabled } = useCountdownState()

  if (isEnabled) return null

  return children
}
