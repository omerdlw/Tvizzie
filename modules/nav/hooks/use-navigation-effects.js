'use client'

import { useEffect, useRef } from 'react'

const EXPAND_PARENT_DELAY = 450

export function useRouteChangeEffects(
  pathname,
  expandParentForPath,
  setExpanded,
  setSearchQuery,
  setIsHovered
) {
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return
    }

    previousPathRef.current = pathname

    setExpanded(false)
    setSearchQuery('')
    setIsHovered(false)

    const timerId = window.setTimeout(() => {
      expandParentForPath(pathname)
    }, EXPAND_PARENT_DELAY)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [pathname, expandParentForPath, setExpanded, setSearchQuery, setIsHovered])
}
