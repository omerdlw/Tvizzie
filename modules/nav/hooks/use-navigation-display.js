'use client'

import { useMemo, useRef } from 'react'
import React from 'react'

import { usePathname } from 'next/navigation'

import MediaAction from '@/components/nav-actions/media-action'
import {
  useBackgroundActions,
  useBackgroundState,
} from '@/modules/background/context'
import { useCountdownState } from '@/modules/countdown'

import { useNavigationContext } from '../context'
import { useNavigationStatus } from './use-navigation-status'
import { useNavigationItems } from './use-navigation-items'

export const useNavigationDisplay = () => {
  const pathname = usePathname()
  const { rawItems } = useNavigationItems()
  const { expanded, expandedParents, searchQuery } = useNavigationContext()
  const statusState = useNavigationStatus()
  const {
    isEnabled: isCountdownEnabled,
    timeLeft,
    config: countdownConfig,
  } = useCountdownState()

  const { isVideo, isPlaying: isBackgroundPlaying } = useBackgroundState()
  const { toggleVideo: toggleBackgroundVideo } = useBackgroundActions()

  const isNotFoundPage = useMemo(() => {
    return rawItems.some((item) => item.path === 'not-found')
  }, [rawItems])

  const countdownItem = useMemo(() => {
    if (!isCountdownEnabled) return null
    const pad = (n) => String(n).padStart(2, '0')
    return {
      type: 'COUNTDOWN',
      name: 'countdown',
      path: '/countdown',
      title: `${timeLeft.days ? pad(timeLeft.days) + ' days ' : ''}${pad(timeLeft.hours)} hours ${pad(timeLeft.minutes)} minutes`,
      description: countdownConfig?.announcement || 'Scheduled Maintenance',
      icon: isBackgroundPlaying ? 'mdi:pause' : 'mdi:play',
      style: {
        title: {
          className: 'font-mono',
        },
      },
      hideSettings: true,
      hideScroll: true,
      action: null,
      onClick: toggleBackgroundVideo,
      children: null,
    }
  }, [
    isCountdownEnabled,
    timeLeft,
    countdownConfig,
    isBackgroundPlaying,
    toggleBackgroundVideo,
  ])

  const activeIndex = useMemo(() => {
    let idx = rawItems.findIndex((item) => item.isDataSource && item.isSelected)
    if (idx !== -1) return idx

    if (isNotFoundPage) {
      idx = rawItems.findIndex((item) => item.path === 'not-found')
      return Math.max(0, idx)
    }

    idx = rawItems.findIndex((item) => item.path === pathname)
    return Math.max(0, idx)
  }, [pathname, rawItems, isNotFoundPage])

  const navigationItems = useMemo(() => {
    if (countdownItem) return [countdownItem]

    let items = []

    const itemsToProcess = isNotFoundPage
      ? rawItems.filter(
        (item) => item.path === '/' || item.path === 'not-found'
      )
      : rawItems

    itemsToProcess.forEach((item) => {
      const hasChildren = !!item.children
      const parentExpanded = hasChildren && expandedParents.has(item.name)
      items.push({
        ...item,
        isParent: hasChildren,
        isExpanded: parentExpanded,
      })
      if (parentExpanded && item.children) {
        item.children.forEach((child) =>
          items.push({ ...child, isChild: true, parentName: item.name })
        )
      }
    })
    items = items.map((item, i) => ({
      ...item,
      shortcut: i < 9 ? String(i + 1) : null,
    }))

    if (expanded && searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.title?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
      )
    }
    return items
  }, [
    rawItems,
    expanded,
    searchQuery,
    expandedParents,
    isNotFoundPage,
    countdownItem,
  ])

  const activeItem = useMemo(() => {
    let foundItem = rawItems[0] || null

    const selectedDataSource = navigationItems.find(
      (item) => item.isDataSource && item.isSelected
    )

    if (selectedDataSource) foundItem = selectedDataSource
    else if (isNotFoundPage) {
      const notFoundItem = rawItems.find((item) => item.path === 'not-found')
      if (notFoundItem) foundItem = notFoundItem
    } else {
      const found = navigationItems.find((item) => item.path === pathname)
      if (found) foundItem = found
      else {
        const rawFound = rawItems.find((item) => item.path === pathname)
        if (rawFound) foundItem = rawFound
        else {
          for (const item of rawItems) {
            if (item.children) {
              const child = item.children.find((c) => c.path === pathname)
              if (child) {
                foundItem = { ...child, isChild: true, parentName: item.name }
                break
              }
            }
          }
        }
      }
    }

    if (statusState && statusState.isOverlay && foundItem) {
      return {
        ...foundItem,
        ...statusState,
        isStatus: true,
        action: statusState.action || foundItem.action,
      }
    }

    if (countdownItem) return countdownItem

    if (statusState && foundItem) {
      return {
        ...foundItem,
        ...statusState,
        isStatus: true,
        action: statusState.action || foundItem.action,
      }
    }

    if (foundItem && !foundItem.isParent && isVideo) {
      const showMediaAction = foundItem.mediaAction !== false
      let mergedAction = showMediaAction ? <MediaAction /> : null

      if (foundItem.action) {
        if (React.isValidElement(foundItem.action)) {
          mergedAction = (
            <div className="flex flex-col gap-2">
              {foundItem.action}
              {showMediaAction && <MediaAction />}
            </div>
          )
        } else if (typeof foundItem.action === 'function') {
          const Component = foundItem.action
          mergedAction = (
            <div className="flex flex-col gap-2">
              <Component />
              {showMediaAction && <MediaAction />}
            </div>
          )
        }
      }

      return {
        ...foundItem,
        action: mergedAction,
        onClick: (e) => {
          if (e && typeof e.preventDefault === 'function') {
            e.preventDefault()
          }
          if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation()
          }

          toggleBackgroundVideo()
        },
      }
    }

    return foundItem
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

  const result = useMemo(() => ({
    navigationItems,
    activeItem,
    activeIndex,
    statusState,
  }), [navigationItems, activeItem, activeIndex, statusState])

  const lastResultRef = useRef(null)

  // Stable compare to avoid loops in Nav
  const stableResult = useMemo(() => {
    const current = result
    const prev = lastResultRef.current

    if (!prev) {
      lastResultRef.current = current
      return current
    }

    const isItemsChanged = current.navigationItems !== prev.navigationItems
    const isIndexChanged = current.activeIndex !== prev.activeIndex
    const isOverlayChanged = current.statusState !== prev.statusState

    // Simplified deep compare for activeItem
    const isItemChanged = current.activeItem?.path !== prev.activeItem?.path ||
      current.activeItem?.name !== prev.activeItem?.name ||
      current.activeItem?.type !== prev.activeItem?.type ||
      current.activeItem?.isOverlay !== prev.activeItem?.isOverlay ||
      current.activeItem?.title !== prev.activeItem?.title

    if (isItemsChanged || isIndexChanged || isOverlayChanged || isItemChanged) {
      lastResultRef.current = current
      return current
    }

    return prev
  }, [result])

  return stableResult
}
