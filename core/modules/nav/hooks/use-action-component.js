'use client'

import React, { useMemo } from 'react'

function shouldRenderAction(
  { action, isLoading, isOverlay, path, activeChild },
  pathname
) {
  if (!action) return false
  if (isLoading) return false

  const matchesActiveChild =
    activeChild?.path && typeof activeChild.path === 'string'
      ? pathname === activeChild.path
      : false

  if (!isOverlay && path && pathname !== path && !matchesActiveChild) {
    return false
  }

  return true
}

function resolveActionNode(action) {
  if (React.isValidElement(action)) {
    return action
  }

  if (typeof action === 'function') {
    const ActionComponent = action
    return <ActionComponent />
  }

  return null
}

export function useActionComponent(link, pathname) {
  const { action, isLoading, isOverlay, path, activeChild } = link

  return useMemo(() => {
    if (
      !shouldRenderAction(
        { action, isLoading, isOverlay, path, activeChild },
        pathname
      )
    ) {
      return null
    }

    return resolveActionNode(action)
  }, [action, activeChild, isLoading, isOverlay, path, pathname])
}
