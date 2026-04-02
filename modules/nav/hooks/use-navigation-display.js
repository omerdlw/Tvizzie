'use client'

import React, { useEffect, useMemo, useRef } from 'react'

import { usePathname } from 'next/navigation'

import MediaAction from '@/features/navigation/actions/media-action'

import { useNavigationContext } from '../context'
import { getNavConfirmationKey } from '../utils'
import { useNavigationCountdown } from './use-navigation-countdown'
import { useNavigationItems } from './use-navigation-items'
import { useNavigationStatus } from './use-navigation-status'

function hasChildren(item) {
  return Array.isArray(item?.children) && item.children.length > 0
}

function isNotFoundItem(item) {
  return item?.isNotFound || item?.path === 'not-found'
}

function toSearchableText(value) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(toSearchableText).join(' ')
  }

  if (React.isValidElement(value)) {
    return toSearchableText(value.props?.children)
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(toSearchableText).join(' ')
  }

  return ''
}

function flattenNavigationItems(
  items,
  expandedParents,
  pathname,
  exposeAllChildren = false
) {
  return items.map((item) => {
    const isParent = hasChildren(item)
    const activeChild =
      isParent && !exposeAllChildren
        ? item.children.find((child) => child.path === pathname) || null
        : null

    return {
      ...item,
      isParent,
      hasActiveChild: Boolean(activeChild),
      activeChild,
      isExpanded:
        isParent && (expandedParents.has(item.name) || Boolean(activeChild)),
    }
  })
}

function filterNavigationItems(items, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (!normalizedQuery) {
    return items
  }

  return items.filter((item) => {
    return (
      toSearchableText(item.name).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.title).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.description).toLowerCase().includes(normalizedQuery)
    )
  })
}

function buildNavigationItems({
  rawItems,
  expanded,
  expandedParents,
  pathname,
  searchQuery,
  isNotFoundPage,
  countdownItem,
}) {
  if (countdownItem) {
    return [countdownItem]
  }

  const baseItems = isNotFoundPage
    ? rawItems.filter((item) => item.path === '/' || isNotFoundItem(item))
    : rawItems

  const flattenedItems = flattenNavigationItems(
    baseItems,
    expandedParents,
    pathname,
    expanded && Boolean(searchQuery)
  )

  if (expanded && searchQuery) {
    return filterNavigationItems(flattenedItems, searchQuery)
  }

  return flattenedItems
}

function resolveActiveIndex({
  navigationItems,
  activeItem,
  pathname,
  countdownItem,
}) {
  if (countdownItem) {
    return 0
  }

  const selectedDataSourceIndex = navigationItems.findIndex(
    (item) => item.isDataSource && item.isSelected
  )

  if (selectedDataSourceIndex !== -1) {
    return selectedDataSourceIndex
  }

  if (activeItem) {
    const matchedActiveIndex = navigationItems.findIndex(
      (item) =>
        (item.path && item.path === activeItem.path) ||
        (item.name && item.name === activeItem.name)
    )

    if (matchedActiveIndex !== -1) {
      return matchedActiveIndex
    }
  }

  const matchedIndex = navigationItems.findIndex((item) => item.path === pathname)
  return Math.max(0, matchedIndex)
}

function resolveBaseActiveItem({
  rawItems,
  navigationItems,
  pathname,
  isNotFoundPage,
}) {
  const selectedDataSource = navigationItems.find(
    (item) => item.isDataSource && item.isSelected
  )

  if (selectedDataSource) {
    return selectedDataSource
  }

  if (isNotFoundPage) {
    return rawItems.find((item) => isNotFoundItem(item)) || rawItems[0] || null
  }

  const matchedNavigationItem = navigationItems.find(
    (item) => item.path === pathname
  )

  if (matchedNavigationItem) {
    return matchedNavigationItem
  }

  const matchedRawItem = rawItems.find((item) => item.path === pathname)

  if (matchedRawItem) {
    return matchedRawItem
  }

  for (const item of rawItems) {
    if (!hasChildren(item)) {
      continue
    }

    const matchedChild = item.children.find((child) => child.path === pathname)

    if (matchedChild) {
      return (
        navigationItems.find(
          (entry) =>
            (entry?.name && entry.name === item.name) ||
            (entry?.path && entry.path === item.path)
        ) || {
          ...item,
          activeChild: matchedChild,
          hasActiveChild: true,
          isExpanded: true,
          isParent: true,
        }
      )
    }
  }

  return rawItems[0] || null
}

function applyStatusOverlay(item, statusState) {
  if (!item || !statusState) {
    return item
  }

  const showStatusActions =
    statusState.type === 'APP_ERROR' || statusState.type === 'API_ERROR'

  return {
    ...item,
    ...statusState,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
    isStatus: true,
    action: showStatusActions ? statusState.action : null,
    actions: showStatusActions ? statusState.actions : null,
  }
}

function applyConfirmationOverlay(item) {
  if (!item?.confirmation) {
    return item
  }

  return {
    ...item,
    ...item.confirmation,
    title: item.confirmation.title ?? item.title ?? item.name,
    description: item.confirmation.description ?? item.description,
    icon: item.confirmation.icon ?? item.icon,
    isConfirmation: true,
    isOverlay: true,
    actions: null,
    action: null,
  }
}

function isSurfaceDescriptor(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !React.isValidElement(value)
  )
}

function resolveInlineSurface(item) {
  const surface = item?.surface

  if (surface !== undefined) {
    if (!isSurfaceDescriptor(surface)) {
      return {
        content: surface,
        showAction: undefined,
      }
    }

    const component =
      typeof surface.component === 'function' ? surface.component : null
    const content =
      surface.content ?? surface.node ?? surface.element ?? null

    if (!component && content == null) {
      return null
    }

    return {
      component,
      content: component ? null : content,
      props:
        surface.props && typeof surface.props === 'object' ? surface.props : {},
      action: surface.action ?? null,
      showAction: surface.showAction,
      dismissible: surface.dismissible ?? true,
      onClose: typeof surface.onClose === 'function' ? surface.onClose : null,
    }
  }

  if (item?.mask === undefined) {
    return null
  }

  return {
    content: item.mask,
    showAction: undefined,
    dismissible: item.maskDismissible ?? true,
    onClose: typeof item.dismissMask === 'function' ? item.dismissMask : null,
  }
}

function resolveSurfaceAction(item, surfaceEntry) {
  if (surfaceEntry?.action != null) {
    return surfaceEntry.action
  }

  if (surfaceEntry?.showAction === true) {
    return item.action ?? null
  }

  if (surfaceEntry?.showAction === false) {
    return null
  }

  return item.action ?? null
}

function applySurface(item, surfaceEntry, closeSurface) {
  const surfaceComponent = surfaceEntry?.component ?? null
  const surfaceContent = surfaceEntry?.content ?? null

  if (!item || (!surfaceComponent && surfaceContent == null)) {
    return item
  }

  return {
    ...item,
    isSurface: true,
    isOverlay: true,
    dismissible: surfaceEntry.dismissible !== false,
    surfaceComponent,
    surfaceContent,
    surfaceProps: surfaceEntry.props || {},
    closeSurface:
      typeof closeSurface === 'function'
        ? closeSurface
        : (result = null) => {
            surfaceEntry?.onClose?.(result)
          },
    actions: null,
    action: resolveSurfaceAction(item, surfaceEntry),
  }
}

function resolveActionNode(action, showMediaAction) {
  if (React.isValidElement(action)) {
    return (
      <div className="flex flex-col gap-2">
        {action}
        {showMediaAction && <MediaAction />}
      </div>
    )
  }

  if (typeof action === 'function') {
    const ActionComponent = action

    return (
      <div className="flex flex-col gap-2">
        <ActionComponent />
        {showMediaAction && <MediaAction />}
      </div>
    )
  }

  return showMediaAction ? <MediaAction /> : null
}

function applyMediaAction(item, isVideo, toggleBackgroundVideo) {
  if (!item || item.isParent || !isVideo) {
    return item
  }

  const showMediaAction = item.mediaAction !== false

  return {
    ...item,
    action: resolveActionNode(item.action, showMediaAction),
    onClick: (event) => {
      event?.preventDefault?.()
      event?.stopPropagation?.()
      toggleBackgroundVideo()
    },
  }
}

function resolveActiveItem({
  rawItems,
  navigationItems,
  pathname,
  isNotFoundPage,
  surfaceState,
  statusState,
  countdownItem,
  isVideo,
  toggleBackgroundVideo,
  dismissedConfirmationKey,
  guardConfirmation,
  closeSurface,
}) {
  const baseActiveItem = resolveBaseActiveItem({
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
  })

  if (!baseActiveItem) {
    return countdownItem || null
  }

  if (surfaceState?.isSurfaceOpen) {
    return applySurface(baseActiveItem, surfaceState.activeSurfaceEntry, (result) =>
      closeSurface(result, surfaceState.activeSurfaceId)
    )
  }

  if (statusState?.isOverlay) {
    return applyStatusOverlay(baseActiveItem, statusState)
  }

  if (countdownItem) {
    return countdownItem
  }

  if (statusState) {
    return applyStatusOverlay(baseActiveItem, statusState)
  }

  const itemWithMediaAction = applyMediaAction(
    baseActiveItem,
    isVideo,
    toggleBackgroundVideo
  )

  const itemWithConfirmation = guardConfirmation
    ? {
        ...itemWithMediaAction,
        confirmation: guardConfirmation,
      }
    : itemWithMediaAction

  const confirmationKey = getNavConfirmationKey(itemWithConfirmation)
  const isConfirmationDismissed =
    confirmationKey && confirmationKey === dismissedConfirmationKey

  if (itemWithConfirmation?.confirmation && !isConfirmationDismissed) {
    return applyConfirmationOverlay(itemWithConfirmation)
  }

  const inlineSurface = resolveInlineSurface(itemWithMediaAction)

  if (inlineSurface) {
    return applySurface(itemWithMediaAction, inlineSurface)
  }

  return itemWithMediaAction
}

function hasActiveItemChanged(currentItem, previousItem) {
  return (
    currentItem?.path !== previousItem?.path ||
    currentItem?.name !== previousItem?.name ||
    currentItem?.type !== previousItem?.type ||
    currentItem?.isOverlay !== previousItem?.isOverlay ||
    currentItem?.isConfirmation !== previousItem?.isConfirmation ||
    currentItem?.isSurface !== previousItem?.isSurface ||
    currentItem?.title !== previousItem?.title ||
    currentItem?.surfaceComponent !== previousItem?.surfaceComponent ||
    currentItem?.surfaceContent !== previousItem?.surfaceContent ||
    currentItem?.surfaceProps !== previousItem?.surfaceProps ||
    currentItem?.action !== previousItem?.action
  )
}

function hasDisplayResultChanged(currentResult, previousResult) {
  return (
    currentResult.navigationItems !== previousResult.navigationItems ||
    currentResult.activeIndex !== previousResult.activeIndex ||
    currentResult.statusState !== previousResult.statusState ||
    hasActiveItemChanged(currentResult.activeItem, previousResult.activeItem)
  )
}

export function useNavigationDisplay() {
  const pathname = usePathname()

  const { rawItems } = useNavigationItems()
  const {
    expanded,
    expandedParents,
    searchQuery,
    dismissedConfirmationKey,
    guardConfirmation,
    clearDismissedConfirmation,
    closeSurface,
    activeSurfaceId,
    activeSurfaceEntry,
    isSurfaceOpen,
  } = useNavigationContext()
  const surfaceState = useMemo(
    () => ({
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
    }),
    [activeSurfaceId, activeSurfaceEntry, isSurfaceOpen]
  )
  const statusState = useNavigationStatus()
  const { isVideo, countdownItem, toggleBackgroundVideo } =
    useNavigationCountdown()

  const isNotFoundPage = useMemo(() => {
    return rawItems.some((item) => isNotFoundItem(item))
  }, [rawItems])

  const navigationItems = useMemo(() => {
    return buildNavigationItems({
      rawItems,
      expanded,
      expandedParents,
      pathname,
      searchQuery,
      isNotFoundPage,
      countdownItem,
    })
  }, [
    rawItems,
    expanded,
    expandedParents,
    pathname,
    searchQuery,
    isNotFoundPage,
    countdownItem,
  ])

  const activeItem = useMemo(() => {
    return resolveActiveItem({
      rawItems,
      navigationItems,
      pathname,
      isNotFoundPage,
      surfaceState,
      statusState,
      countdownItem,
      isVideo,
      toggleBackgroundVideo,
      dismissedConfirmationKey,
      guardConfirmation,
      closeSurface,
    })
  }, [
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
    surfaceState,
    statusState,
    countdownItem,
    isVideo,
    toggleBackgroundVideo,
    dismissedConfirmationKey,
    guardConfirmation,
    closeSurface,
  ])

  const activeIndex = useMemo(() => {
    return resolveActiveIndex({
      navigationItems,
      activeItem,
      pathname,
      countdownItem,
    })
  }, [navigationItems, activeItem, pathname, countdownItem])

  useEffect(() => {
    if (statusState?.isOverlay) {
      return
    }

    if (!getNavConfirmationKey(activeItem)) {
      clearDismissedConfirmation()
    }
  }, [activeItem, clearDismissedConfirmation, statusState])

  const result = useMemo(() => {
    return {
      navigationItems,
      activeItem,
      activeIndex,
      statusState,
    }
  }, [navigationItems, activeItem, activeIndex, statusState])

  const lastResultRef = useRef(null)

  return useMemo(() => {
    const previousResult = lastResultRef.current

    if (!previousResult || hasDisplayResultChanged(result, previousResult)) {
      lastResultRef.current = result
      return result
    }

    return previousResult
  }, [result])
}
