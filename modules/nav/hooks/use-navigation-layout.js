'use client'

import { useMemo } from 'react'

import { usePathname } from 'next/navigation'

import { useNavigationContext } from '../context'

const MAX_VISIBLE_STACKED_CARDS = 3

function findActiveIndex(items, activeItem, pathname) {
  let index = items.findIndex((item) => item.isDataSource && item.isSelected)

  if (index !== -1) {
    return index
  }

  if (activeItem) {
    index = items.findIndex(
      (item) =>
        (item.path && item.path === activeItem.path) ||
        (item.name && item.name === activeItem.name)
    )

    if (index !== -1) {
      return index
    }
  }

  return items.findIndex((item) => item.path === pathname)
}

function replaceActiveItem(items, activeIndex, activeItem) {
  if (activeIndex === -1 || !activeItem) {
    return items
  }

  const nextItems = [...items]
  nextItems[activeIndex] = activeItem
  return nextItems
}

function isSameItem(item, candidate) {
  return (
    (item?.path && item.path === candidate?.path) ||
    (item?.name && item.name === candidate?.name)
  )
}

function reorderItemsWithActiveFirst(items, activeIndex) {
  if (activeIndex === -1) {
    return items
  }

  return [
    items[activeIndex],
    ...items.slice(0, activeIndex),
    ...items.slice(activeIndex + 1),
  ]
}

function reorderItemsWithParentSectionFirst(items, activeItem) {
  if (!activeItem?.isChild || !activeItem?.parentName) {
    return items
  }

  const parentIndex = items.findIndex(
    (item) =>
      (item?.name && item.name === activeItem.parentName) ||
      (item?.path && item.path === activeItem.parentPath)
  )

  if (parentIndex === -1) {
    return items
  }

  let sectionStart = parentIndex

  while (
    sectionStart > 0 &&
    items[sectionStart - 1]?.isChild &&
    items[sectionStart - 1]?.parentName === activeItem.parentName
  ) {
    sectionStart -= 1
  }

  return [
    ...items.slice(sectionStart, parentIndex + 1),
    ...items.slice(0, sectionStart),
    ...items.slice(parentIndex + 1),
  ]
}

export function useNavigationLayout({
  isHovered,
  navigationItems,
  activeItem,
} = {}) {
  const pathname = usePathname()
  const { expanded } = useNavigationContext()

  const { displayItems, displayActiveIndex } = useMemo(() => {
    const shouldShowOverlayStack =
      activeItem?.isStatus || activeItem?.isConfirmation || activeItem?.isSurface

    const activeIndex = findActiveIndex(navigationItems, activeItem, pathname)

    const itemsWithActiveItem = replaceActiveItem(
      navigationItems,
      activeIndex,
      activeItem
    )

    if (activeItem?.isLoading) {
      return {
        displayItems: activeItem ? [activeItem] : [],
        displayActiveIndex: activeItem ? 0 : -1,
      }
    }

    const reorderedItems = reorderItemsWithActiveFirst(
      itemsWithActiveItem,
      activeIndex
    )

    if (expanded) {
      const expandedItems = activeItem?.isChild
        ? reorderItemsWithParentSectionFirst(itemsWithActiveItem, activeItem)
        : reorderedItems
      const expandedActiveIndex = expandedItems.findIndex((item) =>
        isSameItem(item, activeItem)
      )

      return {
        displayItems: expandedItems,
        displayActiveIndex: expandedActiveIndex,
      }
    }

    const visibleCount =
      pathname === '/' || isHovered || shouldShowOverlayStack
        ? MAX_VISIBLE_STACKED_CARDS
        : 1

    return {
      displayItems: reorderedItems.slice(0, visibleCount),
      displayActiveIndex: reorderedItems.length > 0 ? 0 : -1,
    }
  }, [pathname, expanded, isHovered, navigationItems, activeItem])

  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  }
}
