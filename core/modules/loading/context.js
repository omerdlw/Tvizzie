'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';

import { useRegistryState, REGISTRY_TYPES } from '../registry/context';

const LoadingActionsContext = createContext(null);
const LoadingStateContext = createContext(null);

function normalizeLoadingOptions(options = {}) {
  const minDuration = Number(options?.minDuration);

  return {
    minDuration: Number.isFinite(minDuration) && minDuration > 0 ? minDuration : 0,
    showOverlay: options?.showOverlay !== false,
    skeleton: options?.skeleton ?? null,
  };
}

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [skeleton, setSkeleton] = useState(null);
  const [minDuration, setMinDuration] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  const startTimeRef = useRef(null);
  const minDurationRef = useRef(0);
  const stopTimerRef = useRef(null);

  const { get } = useRegistryState();
  const registryLoading = get(REGISTRY_TYPES.LOADING, 'page-loading');

  const clearStopTimer = useCallback(() => {
    if (!stopTimerRef.current) return;
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }, []);

  const resetState = useCallback(() => {
    clearStopTimer();
    setIsLoading(false);
    setSkeleton(null);
    setMinDuration(0);
    setShowOverlay(true);
    minDurationRef.current = 0;
    startTimeRef.current = null;
  }, [clearStopTimer]);

  const startLoading = useCallback(
    (options = {}) => {
      clearStopTimer();
      const nextState = normalizeLoadingOptions(options);

      startTimeRef.current = Date.now();
      minDurationRef.current = nextState.minDuration;
      setIsLoading(true);
      setMinDuration(nextState.minDuration);
      setShowOverlay(nextState.showOverlay);
      setSkeleton(nextState.skeleton);
    },
    [clearStopTimer]
  );

  const stopLoading = useCallback(() => {
    const startTime = startTimeRef.current;
    const activeMinDuration = minDurationRef.current;

    if (!startTime || activeMinDuration === 0) {
      resetState();
      return;
    }

    const elapsed = Date.now() - startTime;
    const remaining = activeMinDuration - elapsed;

    if (remaining <= 0) {
      resetState();
      return;
    }

    clearStopTimer();

    stopTimerRef.current = setTimeout(() => {
      resetState();
    }, remaining);
  }, [clearStopTimer, resetState]);

  const setLoading = useCallback(
    (value) => {
      if (value) startLoading();
      else stopLoading();
    },
    [startLoading, stopLoading]
  );

  useEffect(() => {
    return () => {
      clearStopTimer();
    };
  }, [clearStopTimer]);

  useEffect(() => {
    if (!registryLoading) {
      resetState();
      return;
    }

    if (registryLoading.isLoading) {
      startLoading(registryLoading);
    } else {
      stopLoading();
    }
  }, [registryLoading, resetState, startLoading, stopLoading]);

  const stateValue = useMemo(
    () => ({
      isLoading,
      skeleton,
      minDuration,
      showOverlay,
    }),
    [isLoading, skeleton, minDuration, showOverlay]
  );

  const actionsValue = useMemo(
    () => ({
      startLoading,
      stopLoading,
      setIsLoading: setLoading,
      setLoading,
      setSkeleton,
    }),
    [setLoading, startLoading, stopLoading]
  );

  return (
    <LoadingActionsContext.Provider value={actionsValue}>
      <LoadingStateContext.Provider value={stateValue}>{children}</LoadingStateContext.Provider>
    </LoadingActionsContext.Provider>
  );
}

export function useLoadingState() {
  const ctx = useContext(LoadingStateContext);
  if (!ctx) throw new Error('useLoadingState must be within LoadingProvider');
  return ctx;
}

export function useLoadingActions() {
  const ctx = useContext(LoadingActionsContext);
  if (!ctx) throw new Error('useLoadingActions must be within LoadingProvider');
  return ctx;
}
