'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

import { useSurfaceStack } from './hooks/use-surface-stack';

const NOOP = () => {};
const DEFAULT_NAVIGATION_ACTIONS = Object.freeze({
  closeSurface: NOOP,
  openSurface: NOOP,
  setCompactLock: NOOP,
  setSearchQuery: NOOP,
  setNavHeight: NOOP,
  setExpanded: NOOP,
  collapse: NOOP,
  expand: NOOP,
  toggle: NOOP,
  setIsCompact: NOOP,
});

const DEFAULT_NAVIGATION_STATE = Object.freeze({
  searchQuery: '',
  compactLocked: false,
  navHeight: 0,
  expanded: false,
  isCompact: false,
  surfaceState: null,
});
const NavigationActionsContext = createContext(null);
const NavigationStateContext = createContext(null);

export function NavigationProvider({ children }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [compactLocks, setCompactLocks] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  const previousPathRef = useRef(pathname);

  const collapse = useCallback(() => setExpanded(false), []);
  const expand = useCallback(() => setExpanded(true), []);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const setCompactLock = useCallback((lockId, isLocked) => {
    if (!lockId) return;

    setCompactLocks((previousLocks) => {
      const hasLock = Boolean(previousLocks[lockId]);

      if (isLocked) {
        return hasLock ? previousLocks : { ...previousLocks, [lockId]: true };
      }

      if (!hasLock) return previousLocks;

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
    if (previousPathRef.current === pathname) return;

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
  return context ?? DEFAULT_NAVIGATION_STATE;
}

export function useNavigationActions() {
  const context = useContext(NavigationActionsContext);
  return context ?? DEFAULT_NAVIGATION_ACTIONS;
}

export function useNavigationContext() {
  const actions = useNavigationActions();
  const state = useNavigationState();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
