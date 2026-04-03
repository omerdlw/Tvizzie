'use client'

import { useCallback, useEffect } from 'react'

export function useClickOutside(ref, callback) {
  const handleClick = useCallback(
    (event) => {
      if (ref?.current && !ref.current.contains(event.target)) {
        callback(event)
      }
    },
    [ref, callback]
  )

  useEffect(() => {
    if (!ref || typeof callback !== 'function') return

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [ref, callback, handleClick])
}
