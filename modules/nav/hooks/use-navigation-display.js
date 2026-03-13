'use client'

import { useMemo, useRef } from 'react'
import React from 'react'

import { usePathname } from 'next/navigation'

import MediaAction from '../components/media-action'
import { useNavigationContext } from '../context'
import { useNavigationCountdown } from './use-navigation-countdown'
import { useNavigationItems } from './use-navigation-items'
import { useNavigationStatus } from './use-navigation-status'

const hasItemChild = (item) => Boolean(item.children)

function flattenNavigationItems(items, expandedParents) {
  const flattenedItems = []

  items.forEach((item) => {
    const isParent = hasItemChild(item)
    const isExpanded = isParent && expandedParents.has(item.name)

    flattenedItems.push({
      ...item,
      isParent,
      isExpanded,
    })

    if (isExpanded) {
      item.children.forEach((child) => {
        flattenedItems.push({ ...child, isChild: true, parentName: item.name })
      })
    }
  })

  return flattenedItems
}

function withItemShortcuts(items) {
  return items.map((item, index) => ({
    ...item,
    shortcut: index < 9 ? String(index + 1) : null,
  }))
}

function filterBySearchQuery(items, searchQuery) {
  const loweredQuery = searchQuery.toLowerCase()

  return items.filter(
    (item) =>
      item.name?.toLowerCase().includes(loweredQuery) ||
      item.title?.toLowerCase().includes(loweredQuery) ||
      item.description?.toLowerCase().includes(loweredQuery)
  )
}

function resolveActiveIndex(rawItems, pathname, isNotFoundPage, countdownItem) {
  if (countdownItem) return 0

  let itemIndex = rawItems.findIndex(
    (item) => item.isDataSource && item.isSelected
  )
  if (itemIndex !== -1) return itemIndex

  if (isNotFoundPage) {
    itemIndex = rawItems.findIndex((item) => item.path === 'not-found')
    return Math.max(0, itemIndex)
  }

  itemIndex = rawItems.findIndex((item) => item.path === pathname)
  return Math.max(0, itemIndex)
}

function resolveBaseActiveItem(rawItems, navigationItems, pathname, isNotFoundPage) {
  let foundItem = rawItems[0] || null

  const selectedDataSource = navigationItems.find(
    (item) => item.isDataSource && item.isSelected
  )
  if (selectedDataSource) return selectedDataSource

  if (isNotFoundPage) {
    const notFoundItem = rawItems.find((item) => item.path === 'not-found')
    return notFoundItem || foundItem
  }

  const matchedNavigationItem = navigationItems.find(
    (item) => item.path === pathname
  )
  if (matchedNavigationItem) return matchedNavigationItem

  const matchedRawItem = rawItems.find((item) => item.path === pathname)
  if (matchedRawItem) return matchedRawItem

  for (const item of rawItems) {
    if (!hasItemChild(item)) continue

    const matchedChild = item.children.find((child) => child.path === pathname)
    if (matchedChild) {
      foundItem = { ...matchedChild, isChild: true, parentName: item.name }
      break
    }
  }

  return foundItem
}

function withStatusOverlay(item, statusState) {
  if (!item || !statusState) return item

  return {
    ...item,
    ...statusState,
    isStatus: true,
    action: null,
  }
}

function withMediaAction(item, isVideo, toggleBackgroundVideo) {
  if (!item || item.isParent || !isVideo) return item

  const showMediaAction = item.mediaAction !== false
  let mergedAction = showMediaAction ? <MediaAction /> : null

  if (item.action) {
    if (React.isValidElement(item.action)) {
      mergedAction = (
        <div className="flex flex-col gap-2">
          {item.action}
          {showMediaAction && <MediaAction />}
        </div>
      )
    } else if (typeof item.action === 'function') {
      const ActionComponent = item.action

      mergedAction = (
        <div className="flex flex-col gap-2">
          <ActionComponent />
          {showMediaAction && <MediaAction />}
        </div>
      )
    }
  }

  return {
    ...item,
    action: mergedAction,
    onClick: (event) => {
      event?.preventDefault?.()
      event?.stopPropagation?.()
      toggleBackgroundVideo()
    },
  }
}

function hasActiveItemChanged(currentItem, previousItem) {
  return (
    currentItem?.path !== previousItem?.path ||
    currentItem?.name !== previousItem?.name ||
    currentItem?.type !== previousItem?.type ||
    currentItem?.isOverlay !== previousItem?.isOverlay ||
    currentItem?.title !== previousItem?.title
  )
}

function hasDisplayResultChanged(current, previous) {
  if (current.navigationItems !== previous.navigationItems) return true
  if (current.activeIndex !== previous.activeIndex) return true
  if (current.statusState !== previous.statusState) return true
  return hasActiveItemChanged(current.activeItem, previous.activeItem)
}

export const useNavigationDisplay = () => {
  const pathname = usePathname()
  const { rawItems } = useNavigationItems()
  const { expanded, expandedParents, searchQuery } = useNavigationContext()
  const statusState = useNavigationStatus()
  const { isVideo, countdownItem, toggleBackgroundVideo } =
    useNavigationCountdown()

  const isNotFoundPage = useMemo(() => {
    return rawItems.some((item) => item.path === 'not-found')
  }, [rawItems])

  const activeIndex = useMemo(() => {
    return resolveActiveIndex(rawItems, pathname, isNotFoundPage, countdownItem)
  }, [rawItems, pathname, isNotFoundPage, countdownItem])

  const navigationItems = useMemo(() => {
    if (countdownItem) return [countdownItem]

    const itemsToProcess = isNotFoundPage
      ? rawItems.filter(
          (item) => item.path === '/' || item.path === 'not-found'
        )
      : rawItems

    const flattenedItems = flattenNavigationItems(itemsToProcess, expandedParents)
    const itemsWithShortcuts = withItemShortcuts(flattenedItems)

    if (expanded && searchQuery) {
      return filterBySearchQuery(itemsWithShortcuts, searchQuery)
    }

    return itemsWithShortcuts
  }, [
    rawItems,
    expanded,
    searchQuery,
    expandedParents,
    isNotFoundPage,
    countdownItem,
  ])

  const activeItem = useMemo(() => {
    const baseActiveItem = resolveBaseActiveItem(
      rawItems,
      navigationItems,
      pathname,
      isNotFoundPage
    )

    if (statusState?.isOverlay && baseActiveItem) {
      return withStatusOverlay(baseActiveItem, statusState)
    }

    if (countdownItem) return countdownItem

    if (statusState && baseActiveItem) {
      return withStatusOverlay(baseActiveItem, statusState)
    }

    return withMediaAction(baseActiveItem, isVideo, toggleBackgroundVideo)
  }, [
    pathname,
    navigationItems,
    rawItems,
    isNotFoundPage,
    statusState,
    countdownItem,
    isVideo,
    toggleBackgroundVideo,
  ])

  const result = useMemo(
    () => ({
      navigationItems,
      activeItem,
      activeIndex,
      statusState,
    }),
    [navigationItems, activeItem, activeIndex, statusState]
  )

  const lastResultRef = useRef(null)

  const stableResult = useMemo(() => {
    const current = result
    const prev = lastResultRef.current

    if (!prev) {
      lastResultRef.current = current
      return current
    }

    if (hasDisplayResultChanged(current, prev)) {
      lastResultRef.current = current
      return current
    }

    return prev
  }, [result])

  return stableResult
}
