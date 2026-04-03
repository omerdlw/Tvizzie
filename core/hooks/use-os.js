'use client'

import { useEffect, useState } from 'react'

const OS_TYPES = {
  MAC: 'MacOS',
  WINDOWS: 'Windows',
  LINUX: 'Linux',
  UNKNOWN: 'Unknown',
}

export function useOS() {
  const [os, setOs] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const userAgent = window.navigator.userAgent

    if (userAgent.includes('Mac')) {
      setOs(OS_TYPES.MAC)
    } else if (userAgent.includes('Win')) {
      setOs(OS_TYPES.WINDOWS)
    } else if (userAgent.includes('Linux')) {
      setOs(OS_TYPES.LINUX)
    } else {
      setOs(OS_TYPES.UNKNOWN)
    }
  }, [])

  return os
}

export { OS_TYPES }
