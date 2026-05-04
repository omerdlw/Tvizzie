'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { useNavigationContext } from '../context';

const MAX_VISIBLE_STACKED_CARDS = 3;

function normalizePath(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/, '');
}

function isAncestorPath(candidatePath, activePath) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedActivePath = normalizePath(activePath);

  if (!normalizedCandidate || !normalizedActivePath) {
    return false;
  }

  if (normalizedCandidate === '/' || normalizedCandidate === normalizedActivePath) {
    return false;
  }

  return normalizedActivePath.startsWith(`${normalizedCandidate}/`);
}

function removeAncestorDuplicates(items = []) {
  if (!Array.isArray(items) || items.length <= 1) {
    return items;
  }

  const activePath = items[0]?.path;

  if (!activePath) {
    return items;
  }

  return items.filter((item, index) => {
    if (index === 0) {
      return true;
    }

    return !isAncestorPath(item?.path, activePath);
  });
}

function findActiveIndex(items, activeItem, pathname) {
  let index = items.findIndex((item) => item.isDataSource && item.isSelected);

  if (index !== -1) {
    return index;
  }

  if (activeItem) {
    index = items.findIndex(
      (item) => (item.path && item.path === activeItem.path) || (item.name && item.name === activeItem.name)
    );

    if (index !== -1) {
      return index;
    }
  }

  return items.findIndex((item) => item.path === pathname);
}

function replaceActiveItem(items, activeIndex, activeItem) {
  if (activeIndex === -1 || !activeItem) {
    return items;
  }

  const nextItems = [...items];
  nextItems[activeIndex] = activeItem;
  return nextItems;
}

function isSameItem(item, candidate) {
  return (item?.path && item.path === candidate?.path) || (item?.name && item.name === candidate?.name);
}

function removeInactiveLoadingItems(items = [], activeItem = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return items;
  }

  return items.filter((item) => {
    if (!item?.isLoading) {
      return true;
    }

    return isSameItem(item, activeItem);
  });
}

function reorderItemsWithActiveFirst(items, activeIndex) {
  if (activeIndex === -1) {
    return items;
  }

  return [items[activeIndex], ...items.slice(0, activeIndex), ...items.slice(activeIndex + 1)];
}

function getCollapsedVisibleCount({
  isHovered,
  isCompact,
  shouldShowOverlayStack,
  shouldShowSingleStatusCard,
}) {
  if (shouldShowSingleStatusCard) {
    return 1;
  }

  // Same stacked preview on every route when not scroll-compact (not only "/").
  // Otherwise off-home collapsed mode renders a single card and "collapse" removes
  // siblings immediately, so the stack motion never plays.
  const shouldRevealCollapsedStack = isHovered || shouldShowOverlayStack || !isCompact;
  return shouldRevealCollapsedStack ? MAX_VISIBLE_STACKED_CARDS : 1;
}

export function useNavigationLayout({ isHovered, isCompact = false, navigationItems, activeItem } = {}) {
  const pathname = usePathname();
  const { expanded } = useNavigationContext();

  const { displayItems, displayActiveIndex } = useMemo(() => {
    const shouldShowOverlayStack = activeItem?.isConfirmation || activeItem?.isSurface;
    const shouldShowSingleStatusCard = Boolean(activeItem?.isStatus);

    const activeIndex = findActiveIndex(navigationItems, activeItem, pathname);

    const itemsWithActiveItem = replaceActiveItem(navigationItems, activeIndex, activeItem);

    if (activeItem?.isLoading) {
      return {
        displayItems: activeItem ? [activeItem] : [],
        displayActiveIndex: activeItem ? 0 : -1,
      };
    }

    const reorderedItems = reorderItemsWithActiveFirst(itemsWithActiveItem, activeIndex);

    const filteredItems = removeInactiveLoadingItems(reorderedItems, activeItem);

    if (expanded) {
      const expandedActiveIndex = filteredItems.findIndex((item) => isSameItem(item, activeItem));

      return {
        displayItems: filteredItems,
        displayActiveIndex: expandedActiveIndex,
      };
    }

    const visibleCount = getCollapsedVisibleCount({
      isHovered,
      isCompact,
      shouldShowOverlayStack,
      shouldShowSingleStatusCard,
    });

    return {
      displayItems: removeAncestorDuplicates(filteredItems).slice(0, visibleCount),
      displayActiveIndex: reorderedItems.length > 0 ? 0 : -1,
    };
  }, [pathname, expanded, isHovered, isCompact, navigationItems, activeItem]);

  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  };
}
