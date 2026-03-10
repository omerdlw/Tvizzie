'use client'

import React, { useMemo } from 'react'

export const useActionComponent = (link, pathname) => {
  return useMemo(() => {
    const action = link.action
    if (!action) return null
    if (link.isLoading) return null
    if (!link.isOverlay && link.path && pathname !== link.path) return null
    if (React.isValidElement(action)) return action
    if (typeof action === 'function') {
      const Component = action
      return <Component />
    }
    return null
  }, [link, pathname])
}
