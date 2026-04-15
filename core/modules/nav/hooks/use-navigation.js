'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';

import { useNavigationContext } from '../context';
import { useNavigationCore } from './use-navigation-core';
import { useNavigationDisplay } from './use-navigation-display';
import { useRouteChangeEffects } from './use-navigation-effects';
import { useNavigationExpanded } from './use-navigation-expanded';
import { useNavigationLayout } from './use-navigation-layout';

export function useNavigation() {
  const { searchQuery, closeSurface } = useNavigationContext();

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
      setIsHovered(false);

      return didNavigate;
    },
    [navigateWithGuards, setExpanded, setSearchQuery, setIsHovered]
  );

  const { displayItems, activeIndex: layoutActiveIndex } = useNavigationLayout({
    isHovered,
    navigationItems,
    activeItem,
  });

  useRouteChangeEffects(pathname, setExpanded, setSearchQuery, setIsHovered);

  const activeItemHasAction = useMemo(() => {
    return Boolean(activeItem?.action || activeItem?.isConfirmation);
  }, [activeItem]);

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

    isHovered,
    setIsHovered,
    searchQuery,
    activeItemHasAction,
  };
}
