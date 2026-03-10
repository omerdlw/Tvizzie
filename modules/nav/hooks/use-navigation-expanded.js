'use client'

import { useCallback } from 'react'

import { useNavigationContext } from '../context'

export const useNavigationExpanded = () => {
  const {
    expanded,
    setExpanded,
    expand,
    collapse,
    toggle,
    expandParentForPath,
    isParentExpanded,
    toggleParent,
    setSearchQuery,
    setNavHeight,
  } = useNavigationContext()

  const handleSetExpanded = useCallback(
    (value) => {
      setExpanded((prev) => {
        const newValue = typeof value === 'function' ? value(prev) : value
        return newValue
      })
    },
    [setExpanded]
  )

  return {
    expanded,
    setExpanded: handleSetExpanded,
    expand,
    collapse,
    toggle,
    expandParentForPath,
    isParentExpanded,
    toggleParent,
    setSearchQuery,
    setNavHeight,
  }
}
