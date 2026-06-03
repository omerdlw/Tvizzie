'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { useNavRegistry, useRegistry } from '@/core/modules/registry';
import { SettingsModal } from '@/core/modules/settings';
import { useSurfaceStack } from './hooks/use-surface-stack';

const NavigationActionsContext = createContext(undefined);
const NavigationStateContext = createContext(undefined);

export function NavigationProvider({ children, config = {} }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [compactLocks, setCompactLocks] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  const { batch, register, unregister } = useNavRegistry();
  const previousPathRef = useRef(pathname);

  useRegistry({
    modal: {
      SETTINGS_MODAL: SettingsModal,
    },
  });

  const navItems = useMemo(() => config?.items || {}, [config]);

  useEffect(() => {
    const entries = Object.values(navItems).map((item) => [item.path || item.name, item]);

    if (entries.length === 0) return;

    if (typeof batch === 'function') {
      batch((queue) => {
        entries.forEach(([key, item]) => {
          queue.register(key, item, 'static');
        });
      });
    } else {
      entries.forEach(([key, item]) => {
        register(key, item, 'static');
      });
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          entries.forEach(([key]) => {
            queue.unregister(key, 'static');
          });
        });
        return;
      }

      entries.forEach(([key]) => {
        unregister(key, 'static');
      });
    };
  }, [batch, register, unregister, navItems]);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const expand = useCallback(() => {
    setExpanded(true);
  }, []);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const setCompactLock = useCallback((lockId, isLocked) => {
    if (!lockId) {
      return;
    }

    setCompactLocks((previousLocks) => {
      const hasLock = Boolean(previousLocks[lockId]);

      if (isLocked) {
        if (hasLock) {
          return previousLocks;
        }

        return {
          ...previousLocks,
          [lockId]: true,
        };
      }

      if (!hasLock) {
        return previousLocks;
      }

      const nextLocks = { ...previousLocks };
      delete nextLocks[lockId];
      return nextLocks;
    });
  }, []);

  const { closeAllSurfaces, closeSurface, isCompact, openSurface, setIsCompact, surfaceState } = useSurfaceStack({
    setCompactLock,
    setExpanded,
    setSearchQuery,
  });

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    closeAllSurfaces({
      success: false,
      cancelled: true,
      reason: 'navigation',
    });

    previousPathRef.current = pathname;
  }, [closeAllSurfaces, pathname]);

  const compactLocked = Object.keys(compactLocks).length > 0;

  const stateValue = useMemo(
    () => ({
      ...surfaceState,
      searchQuery,
      compactLocked,
      navHeight,
      expanded,
      config,
      isCompact,
    }),
    [surfaceState, searchQuery, compactLocked, navHeight, expanded, config, isCompact]
  );

  const actionsValue = useMemo(
    () => ({
      closeSurface,
      openSurface,
      setCompactLock,
      setSearchQuery,
      setNavHeight,
      setExpanded,
      collapse,
      expand,
      toggle,
      setIsCompact,
    }),
    [
      closeSurface,
      openSurface,
      setCompactLock,
      setSearchQuery,
      setNavHeight,
      setExpanded,
      collapse,
      expand,
      toggle,
      setIsCompact,
    ]
  );

  return (
    <NavigationActionsContext.Provider value={actionsValue}>
      <NavigationStateContext.Provider value={stateValue}>{children}</NavigationStateContext.Provider>
    </NavigationActionsContext.Provider>
  );
}

export function useNavigationState() {
  const context = useContext(NavigationStateContext);
  if (context === undefined) {
    throw new Error('useNavigationState must be used within a NavigationProvider');
  }
  return context;
}

export function useNavigationActions() {
  const context = useContext(NavigationActionsContext);
  if (context === undefined) {
    throw new Error('useNavigationActions must be used within a NavigationProvider');
  }
  return context;
}

export function useNavigationContext() {
  const actions = useNavigationActions();
  const state = useNavigationState();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
