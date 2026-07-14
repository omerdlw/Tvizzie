'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';

import { usePathname } from 'next/navigation';

import { useSurfaceStack } from './hooks/use-surface-stack';

const NavigationActionsContext = createContext(undefined);
const NavigationStateContext = createContext(undefined);

export function NavigationProvider({ children }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [compactLocks, setCompactLocks] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  const previousPathRef = useRef(pathname);

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

  const { closeAllSurfaces, closeSurface, isCompact, openSurface, setIsCompact, surfaceState } =
    useSurfaceStack({
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
      isCompact,
    }),
    [surfaceState, searchQuery, compactLocked, navHeight, expanded, isCompact],
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
    ],
  );

  return (
    <NavigationActionsContext.Provider value={actionsValue}>
      <NavigationStateContext.Provider value={stateValue}>
        {children}
      </NavigationStateContext.Provider>
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
