'use client'

import { useFeature } from './context'

export function Feature({ children, fallback = null, name }) {
  const { isEnabled } = useFeature(name)

  if (!isEnabled) {
    return fallback
  }

  return children
}
