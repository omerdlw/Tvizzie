'use client'

import { useCallback, useEffect, useRef } from 'react'

import { useNavigationContext } from '../context'
import { useNavigationCore } from './use-navigation-core'

export const useRouteChangeEffects = (
  setExpanded,
  setSearchQuery,
  setIsHovered
) => {
  const { expandParentForPath } = useNavigationContext()
  const { pathname } = useNavigationCore()
  const pathnameRef = useRef(pathname)

  const resetNavigationState = useCallback(() => {
    setExpanded(false)
    setSearchQuery('')
    setIsHovered(false)
  }, [setExpanded, setSearchQuery, setIsHovered])

  useEffect(() => {
    let isMounted = true

    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname
      resetNavigationState()

      const expandTimer = setTimeout(() => {
        if (isMounted) {
          expandParentForPath(pathname)
        }
      }, 450)

      return () => {
        isMounted = false
        clearTimeout(expandTimer)
      }
    }
  }, [pathname, resetNavigationState, expandParentForPath])
}
