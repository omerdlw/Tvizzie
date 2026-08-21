'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createSurfaceEntryDefinition } from '../surface-model';
import { NAV_COMPACT_TO_SURFACE_DELAY_MS, NAV_SURFACE_EXIT_SETTLE_MS } from '../motion';

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

export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduleTimer = setTimeout,
} = {}) {
  const timers = new Map();

  const cancel = (surfaceId) => {
    if (!timers.has(surfaceId)) {
      return false;
    }

    clearTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };

  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId, callback, delayMs) {
      cancel(surfaceId);
      const timerId = scheduleTimer(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}

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
  const compactUnlockTimerRef = useRef(null);
  const pendingSurfaceSchedulerRef = useRef(null);

  if (pendingSurfaceSchedulerRef.current === null) {
    pendingSurfaceSchedulerRef.current = createPendingSurfaceScheduler();
  }

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
    if (compactUnlockTimerRef.current !== null) {
      clearTimeout(compactUnlockTimerRef.current);
    }

    compactUnlockTimerRef.current = setTimeout(() => {
      compactUnlockTimerRef.current = null;
      setCompactLock('surface-opening', false);
    }, NAV_SURFACE_EXIT_SETTLE_MS);
  }, [setCompactLock]);

  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const pendingScheduler = pendingSurfaceSchedulerRef.current;
      const pendingSurfaceId = pendingScheduler.getLatestId();
      const activeSurfaceId = currentStack[currentStack.length - 1]?.id || null;
      const latestSurfaceId =
        pendingSurfaceId && (!activeSurfaceId || pendingSurfaceId > activeSurfaceId)
          ? pendingSurfaceId
          : activeSurfaceId;
      const surfaceId = targetSurfaceId || latestSurfaceId;

      if (!surfaceId) {
        return;
      }

      if (pendingScheduler.cancel(surfaceId)) {
        finalizeSurfaceClose(surfaceId, result);

        if (currentStack.length === 0 && pendingScheduler.size === 0) {
          unlockCompactAfterSurfaceClose();
        }
        return;
      }

      const surfaceToClose = currentStack.find((entry) => entry.id === surfaceId);

      if (!surfaceToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== surfaceId);
      syncSurfaceStack(nextStack);
      finalizeSurfaceClose(surfaceId, result);

      if (nextStack.length === 0 && pendingScheduler.size === 0) {
        unlockCompactAfterSurfaceClose();
      }
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const closeAllSurfaces = useCallback(
    (result = null) => {
      const currentStack = [...surfaceStackRef.current];
      const pendingSurfaceIds = pendingSurfaceSchedulerRef.current.cancelAll();

      if (currentStack.length === 0 && pendingSurfaceIds.length === 0) {
        return;
      }

      if (currentStack.length > 0) {
        syncSurfaceStack([]);
      }

      currentStack.forEach((entry) => {
        finalizeSurfaceClose(entry.id, result);
      });
      pendingSurfaceIds.forEach((surfaceId) => {
        finalizeSurfaceClose(surfaceId, result);
      });

      unlockCompactAfterSurfaceClose();
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const openSurface = useCallback(
    (input, config = {}) => {
      const definition = createSurfaceEntryDefinition(input, config);

      if (!definition) {
        const error = createSurfaceError(
          'NAV_SURFACE_INVALID_COMPONENT',
          'Nav surface input is invalid',
        );
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

      const resultPromise = new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, definition.onClose || null);
      });

      if (isCompactRef.current) {
        if (compactUnlockTimerRef.current !== null) {
          clearTimeout(compactUnlockTimerRef.current);
          compactUnlockTimerRef.current = null;
        }

        wasCompactRef.current = true;
        setCompactLock('surface-opening', true);
        pendingSurfaceSchedulerRef.current.schedule(
          surfaceId,
          runOpen,
          NAV_COMPACT_TO_SURFACE_DELAY_MS,
        );
      } else {
        runOpen();
      }

      return resultPromise;
    },
    [setCompactLock, setExpanded, setSearchQuery, syncSurfaceStack],
  );

  useEffect(() => {
    const pendingScheduler = pendingSurfaceSchedulerRef.current;
    const resolveMap = surfaceResolveMapRef.current;
    const onCloseMap = surfaceOnCloseMapRef.current;

    return () => {
      if (compactUnlockTimerRef.current !== null) {
        clearTimeout(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }

      const surfaceIds = [
        ...surfaceStackRef.current.map((entry) => entry.id),
        ...pendingScheduler.cancelAll(),
      ];
      const result = {
        cancelled: true,
        reason: 'unmount',
        success: false,
      };

      surfaceIds.forEach((surfaceId) => {
        const onClose = onCloseMap.get(surfaceId);
        try {
          onClose?.(result);
        } catch (error) {
          console.error('Nav surface onClose handler failed:', error);
        }
        onCloseMap.delete(surfaceId);

        resolveMap.get(surfaceId)?.(result);
        resolveMap.delete(surfaceId);
      });

      surfaceStackRef.current = [];
    };
  }, []);

  return {
    closeAllSurfaces,
    closeSurface,
    isCompact,
    openSurface,
    setIsCompact,
    surfaceState,
  };
}
