'use client';

import { useCallback, useRef, useState } from 'react';

import { createSurfaceEntryDefinition } from '../surface-model';

function createSurfaceState(surfaceStack = []) {
  const activeSurface = surfaceStack[surfaceStack.length - 1] || null;

  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: surfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack,
  };
}

const INITIAL_SURFACE_STATE = createSurfaceState([]);

function createSurfaceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function useSurfaceStack({ setCompactLock, setExpanded, setSearchQuery }) {
  const [surfaceState, setSurfaceState] = useState(INITIAL_SURFACE_STATE);
  const [isCompact, setIsCompactState] = useState(false);

  const surfaceStackRef = useRef([]);
  const surfaceResolveMapRef = useRef(new Map());
  const surfaceOnCloseMapRef = useRef(new Map());
  const surfaceIdRef = useRef(0);
  const isCompactRef = useRef(false);
  const wasCompactRef = useRef(false);

  const setIsCompact = useCallback((compactVal) => {
    isCompactRef.current = compactVal;
    setIsCompactState(compactVal);
  }, []);

  const syncSurfaceStack = useCallback((nextStack) => {
    surfaceStackRef.current = nextStack;
    setSurfaceState(createSurfaceState(nextStack));
  }, []);

  const finalizeSurfaceClose = useCallback((surfaceId, result) => {
    const onClose = surfaceOnCloseMapRef.current.get(surfaceId);

    if (typeof onClose === 'function') {
      try {
        onClose(result);
      } catch (error) {
        console.error('Nav surface onClose handler failed:', error);
      }
    }

    surfaceOnCloseMapRef.current.delete(surfaceId);

    const resolve = surfaceResolveMapRef.current.get(surfaceId);

    if (typeof resolve === 'function') {
      resolve(result);
    }

    surfaceResolveMapRef.current.delete(surfaceId);
  }, []);

  const unlockCompactAfterSurfaceClose = useCallback(() => {
    if (!wasCompactRef.current) {
      return;
    }

    wasCompactRef.current = false;
    setTimeout(() => {
      setCompactLock('surface-opening', false);
    }, 150);
  }, [setCompactLock]);

  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;

      if (currentStack.length === 0) {
        return;
      }

      const surfaceId = targetSurfaceId || currentStack[currentStack.length - 1]?.id || null;

      if (!surfaceId) {
        return;
      }

      const surfaceToClose = currentStack.find((entry) => entry.id === surfaceId);

      if (!surfaceToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== surfaceId);
      syncSurfaceStack(nextStack);
      finalizeSurfaceClose(surfaceId, result);

      if (nextStack.length === 0) {
        unlockCompactAfterSurfaceClose();
      }
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose]
  );

  const closeAllSurfaces = useCallback(
    (result = null) => {
      const currentStack = [...surfaceStackRef.current];

      if (currentStack.length === 0) {
        return;
      }

      syncSurfaceStack([]);
      currentStack.forEach((entry) => {
        finalizeSurfaceClose(entry.id, result);
      });

      unlockCompactAfterSurfaceClose();
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose]
  );

  const openSurface = useCallback(
    (input, config = {}) => {
      const definition = createSurfaceEntryDefinition(input, config);

      if (!definition) {
        const error = createSurfaceError('NAV_SURFACE_INVALID_COMPONENT', 'Nav surface input is invalid');
        console.error(error);
        return Promise.resolve({
          success: false,
          error,
        });
      }

      const surfaceId = ++surfaceIdRef.current;
      const surfaceEntry = {
        id: surfaceId,
        ...definition,
      };

      setExpanded(false);
      setSearchQuery('');

      const runOpen = () => {
        syncSurfaceStack([...surfaceStackRef.current, surfaceEntry]);
      };

      if (isCompactRef.current) {
        wasCompactRef.current = true;
        setCompactLock('surface-opening', true);
        setTimeout(runOpen, 250);
      } else {
        wasCompactRef.current = false;
        runOpen();
      }

      return new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, definition.onClose || null);
      });
    },
    [setCompactLock, setExpanded, setSearchQuery, syncSurfaceStack]
  );

  return {
    closeAllSurfaces,
    closeSurface,
    isCompact,
    openSurface,
    setIsCompact,
    surfaceState,
  };
}
