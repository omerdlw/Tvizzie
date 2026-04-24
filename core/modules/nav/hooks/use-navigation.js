'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useNavigationContext } from '../context';
import { useNavigationCore } from './use-navigation-core';
import { useNavigationCompact } from './use-navigation-compact';
import { useNavigationDisplay } from './use-navigation-display';
import { useRouteChangeEffects } from './use-navigation-effects';
import { useNavigationExpanded } from './use-navigation-expanded';
import { useNavigationLayout } from './use-navigation-layout';

export function useNavigation() {
  const { searchQuery, closeSurface, compactLocked, setCompactLock } = useNavigationContext();

  const [isHovered, setIsHovered] = useState(false);

  const core = useNavigationCore();
  const display = useNavigationDisplay();
  const expanded = useNavigationExpanded();
  const { navigate: navigateWithGuards, pathname, cancelNavigation } = core;

  const { navigationItems, activeItem, statusState } = display;
  const {
    expanded: isExpanded,
    setExpanded: setExpandedState,
    setSearchQuery,
    setNavHeight,
  } = expanded;
  const isSurfaceActive = Boolean(activeItem?.isSurface);

  const activeItemHasAction = useMemo(() => {
    return Boolean(activeItem?.action || activeItem?.isConfirmation);
  }, [activeItem]);

  const compact = useNavigationCompact({ activeItem, expanded: isExpanded, pathname, searchQuery, compactLocked });
  const clearHoverState = useCallback(() => {
    setIsHovered(false);
  }, []);

  const setExpanded = useCallback(
    (nextValue) => {
      setExpandedState((previousValue) => {
        const resolvedValue = typeof nextValue === 'function' ? nextValue(previousValue) : nextValue;

        if (isSurfaceActive && resolvedValue) {
          return previousValue;
        }

        return resolvedValue;
      });
    },
    [isSurfaceActive, setExpandedState]
  );

  const wasSurfaceActiveRef = useRef(false);

  useEffect(() => {
    if (isSurfaceActive) {
      wasSurfaceActiveRef.current = true;
      return;
    }

    if (wasSurfaceActiveRef.current) {
      wasSurfaceActiveRef.current = false;
      clearHoverState();
    }
  }, [clearHoverState, isSurfaceActive]);

  useEffect(() => {
    if (!isSurfaceActive || !isExpanded) {
      return;
    }

    setExpandedState(false);
  }, [isExpanded, isSurfaceActive, setExpandedState]);

  const navigate = useCallback(
    async (href, options) => {
      if (!href) {
        return false;
      }

      const didNavigate = await navigateWithGuards(href, options);

      if (!didNavigate) {
        return didNavigate;
      }

      setExpanded(false);
      setSearchQuery('');
      clearHoverState();

      return didNavigate;
    },
    [clearHoverState, navigateWithGuards, setExpanded, setSearchQuery]
  );

  const { displayItems, activeIndex: layoutActiveIndex } = useNavigationLayout({
    isHovered,
    isCompact: compact,
    navigationItems,
    activeItem,
  });

  useRouteChangeEffects(pathname, setExpanded, setSearchQuery, setIsHovered);

  return {
    navigationItems: displayItems,
    activeItem,
    activeIndex: layoutActiveIndex,
    statusState,

    navigate,
    pathname,
    cancelNavigation,
    closeSurface,

    expanded: isExpanded,
    setExpanded,
    setNavHeight,
    setSearchQuery,
    setCompactLock,

    isHovered,
    setIsHovered,
    searchQuery,
    activeItemHasAction,
    compact,
  };
}
