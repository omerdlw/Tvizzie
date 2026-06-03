'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { EVENT_TYPES, globalEvents } from '@/core/constants/events';

import NotFoundAction from '@/features/navigation/actions/not-found-action';
import {
  API_ERROR_BATCH_DELAY,
  AUTH_STATUS_CLEAR_DURATION,
  STATUS_CLEAR_DURATION,
  clearPersistedAuthStatus,
  createAuthFeedbackStatus,
  createAuthStatus,
  createConnectionStatus,
  createErrorStatus,
  createOverlayStatus,
  createProgressIcon,
  getStatusTheme,
  isErrorStatus,
  isPersistableAuthStatus,
  normalizeAuthFeedback,
  persistAuthStatus,
  resolveStatusPriority,
  restorePersistedAuthStatus,
} from './navigation-status-model';

export function useNavigationStatus() {
  const pathname = usePathname();
  const [status, setStatus] = useState(null);

  const previousPathRef = useRef(pathname);
  const apiErrorQueueRef = useRef([]);
  const skipPersistedStatusCleanupRef = useRef(false);

  const batchTimerRef = useRef(null);
  const statusClearTimerRef = useRef(null);
  const onlineResetTimerRef = useRef(null);
  const offlineDispatchTimerRef = useRef(null);

  const clearTimer = useCallback((timerRef) => {
    if (!timerRef.current) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearAllTimers = useCallback(() => {
    clearTimer(batchTimerRef);
    clearTimer(statusClearTimerRef);
    clearTimer(onlineResetTimerRef);
    clearTimer(offlineDispatchTimerRef);
  }, [clearTimer]);

  const clearStatus = useCallback(() => {
    clearPersistedAuthStatus();
    setStatus(null);
  }, []);

  const updateStatus = useCallback((nextStatus) => {
    setStatus((currentStatus) => {
      if (!nextStatus) {
        return null;
      }

      if (!currentStatus) {
        return nextStatus;
      }

      return resolveStatusPriority(nextStatus) >= resolveStatusPriority(currentStatus) ? nextStatus : currentStatus;
    });
  }, []);

  const scheduleStatusClear = useCallback(
    ({ duration = STATUS_CLEAR_DURATION, clearWhen = [] } = {}) => {
      clearTimer(statusClearTimerRef);

      const clearTypes = Array.isArray(clearWhen) ? clearWhen.filter(Boolean) : [];

      statusClearTimerRef.current = setTimeout(() => {
        statusClearTimerRef.current = null;

        setStatus((currentStatus) => {
          if (!currentStatus) {
            return currentStatus;
          }

          if (clearTypes.length === 0) {
            return null;
          }

          return clearTypes.includes(currentStatus.type) ? null : currentStatus;
        });
      }, duration);
    },
    [clearTimer]
  );

  const dispatchOfflineEvent = useCallback(() => {
    clearTimer(offlineDispatchTimerRef);

    offlineDispatchTimerRef.current = setTimeout(() => {
      offlineDispatchTimerRef.current = null;
      window.dispatchEvent(new Event('offline'));
    }, 0);
  }, [clearTimer]);

  const handleOffline = useCallback(() => {
    updateStatus(createConnectionStatus('OFFLINE'));
  }, [updateStatus]);

  const handleOnline = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus?.type !== 'OFFLINE') {
        return null;
      }

      clearTimer(onlineResetTimerRef);

      onlineResetTimerRef.current = setTimeout(() => {
        onlineResetTimerRef.current = null;
        setStatus((nextStatus) => (nextStatus?.type === 'ONLINE' ? null : nextStatus));
      }, STATUS_CLEAR_DURATION);

      return createConnectionStatus('ONLINE');
    });
  }, [clearTimer]);

  useEffect(() => {
    const persistedStatus = restorePersistedAuthStatus();

    if (!persistedStatus) {
      return;
    }

    skipPersistedStatusCleanupRef.current = true;
    setStatus((currentStatus) => currentStatus || persistedStatus.status);
    scheduleStatusClear({
      duration: persistedStatus.remainingMs,
      clearWhen: [persistedStatus.status.type],
    });
  }, [scheduleStatusClear]);

  useEffect(() => {
    if (skipPersistedStatusCleanupRef.current) {
      skipPersistedStatusCleanupRef.current = false;
      return;
    }

    if (isPersistableAuthStatus(status)) {
      return;
    }

    clearPersistedAuthStatus();
  }, [status]);

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    setStatus((currentStatus) => {
      if (currentStatus && isErrorStatus(currentStatus.type) && currentStatus.type !== 'ACCOUNT_DELETE') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          dispatchOfflineEvent();
        }

        return null;
      }

      return currentStatus;
    });
  }, [pathname, dispatchOfflineEvent]);

  useEffect(() => {
    const unsubscribeApiError = globalEvents.subscribe(EVENT_TYPES.API_ERROR, (eventData) => {
      const { status: errorStatus, message, isCritical, retry } = eventData || {};

      if (!isCritical) {
        return;
      }

      apiErrorQueueRef.current.push({
        status: errorStatus,
        message,
        retry,
      });

      clearTimer(batchTimerRef);

      batchTimerRef.current = setTimeout(() => {
        const errors = [...apiErrorQueueRef.current];
        apiErrorQueueRef.current = [];

        if (errors.length === 0) {
          return;
        }

        const isBatch = errors.length > 1;
        const title = isBatch ? 'Multiple API Errors' : `API Error (${errors[0].status || 'Network'})`;
        const description = isBatch
          ? `${errors.length} requests failed`
          : errors[0].message || 'An error occurred during the request';

        updateStatus(
          createErrorStatus({
            type: 'API_ERROR',
            title,
            description,
            icon: 'solar:danger-triangle-bold',
            onRetry: () => {
              errors.forEach((error) => error.retry?.());
            },
            style: getStatusTheme('API_ERROR'),
            clearStatus,
          })
        );
      }, API_ERROR_BATCH_DELAY);
    });

    const unsubscribeAppError = globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (eventData) => {
      const { message, error, resetError } = eventData || {};

      updateStatus(
        createErrorStatus({
          type: 'APP_ERROR',
          title: error?.name || 'Application Error',
          description: error?.message || message || 'An unexpected error occurred',
          icon: 'solar:danger-triangle-bold',
          onRetry: resetError
            ? () => {
                resetError();

                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                  dispatchOfflineEvent();
                }
              }
            : undefined,
          style: getStatusTheme('APP_ERROR'),
          clearStatus,
        })
      );
    });

    const unsubscribeSignOut = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_OUT, (eventData) => {
      const isAccountDelete = eventData?.reason === 'delete-account';
      const user = eventData?.previousSession?.user || null;

      if (!user && !isAccountDelete) {
        return;
      }

      const type = isAccountDelete ? 'ACCOUNT_DELETE' : 'LOGOUT';
      const nextStatus = createAuthStatus({
        type,
        user,
        description: isAccountDelete ? 'Account deleted' : 'Signed out',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: [type],
      });

      if (!isAccountDelete) {
        persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
      }
    });

    const unsubscribeAccountDeleteStart = globalEvents.subscribe(EVENT_TYPES.AUTH_ACCOUNT_DELETE_START, (eventData) => {
      const user = eventData?.user || null;

      clearTimer(statusClearTimerRef);

      updateStatus(
        createOverlayStatus({
          type: 'ACCOUNT_DELETE',
          title: user?.name || user?.email || 'Account',
          description: 'Deleting account. This may take a few seconds',
          icon: createProgressIcon(),
          style: getStatusTheme('ACCOUNT_DELETE'),
        })
      );
    });

    const unsubscribeAccountDeleteEnd = globalEvents.subscribe(EVENT_TYPES.AUTH_ACCOUNT_DELETE_END, (eventData) => {
      if (eventData?.status !== 'failure') {
        return;
      }

      clearTimer(statusClearTimerRef);

      setStatus((currentStatus) => (currentStatus?.type === 'ACCOUNT_DELETE' ? null : currentStatus));
    });

    const unsubscribeSignIn = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_IN, (eventData) => {
      const user = eventData?.session?.user;

      if (!user) {
        return;
      }

      const nextStatus = createAuthStatus({
        type: 'LOGIN',
        user,
        titleFallback: 'User',
        description: 'Signed in',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: ['LOGIN'],
      });

      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    });

    const unsubscribeSignUp = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_UP, (eventData) => {
      const user = eventData?.session?.user;

      if (!user) {
        return;
      }

      const nextStatus = createAuthStatus({
        type: 'SIGNUP',
        user,
        description: 'Setting up account',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: ['SIGNUP'],
      });

      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    });

    const unsubscribeAuthFeedback = globalEvents.subscribe(EVENT_TYPES.AUTH_FEEDBACK, (eventData) => {
      const { flow, phase, statusType } = normalizeAuthFeedback(eventData);

      if (!phase) {
        return;
      }

      if (phase === 'clear' || phase === 'failure') {
        clearTimer(statusClearTimerRef);
        setStatus((currentStatus) => {
          if (!currentStatus) {
            return currentStatus;
          }

          if (flow && currentStatus.flow === flow) {
            return null;
          }

          return currentStatus.type === statusType ? null : currentStatus;
        });
        return;
      }

      updateStatus(createAuthFeedbackStatus(eventData));

      if (phase === 'success') {
        scheduleStatusClear({
          duration: Number(eventData?.duration) > 0 ? Number(eventData.duration) : AUTH_STATUS_CLEAR_DURATION,
          clearWhen: [statusType],
        });
        return;
      }

      clearTimer(statusClearTimerRef);
    });

    const unsubscribeNotFound = globalEvents.subscribe(EVENT_TYPES.NAV_NOT_FOUND, (eventData) => {
      if (eventData?.clear) {
        setStatus((currentStatus) => (currentStatus?.type === 'NOT_FOUND' ? null : currentStatus));
        return;
      }

      updateStatus({
        type: 'NOT_FOUND',
        path: 'not-found',
        isOverlay: true,
        title: eventData?.title || '404',
        description: eventData?.description || 'The page you are looking for does not exist or is no longer available',
        icon: eventData?.icon || 'solar:forbidden-circle-bold',
        style: getStatusTheme('NOT_FOUND'),
        action: () => <NotFoundAction />,
        hideSettings: true,
        hideScroll: true,
      });
    });

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      unsubscribeApiError();
      unsubscribeAppError();
      unsubscribeSignOut();
      unsubscribeAccountDeleteStart();
      unsubscribeAccountDeleteEnd();
      unsubscribeSignIn();
      unsubscribeSignUp();
      unsubscribeAuthFeedback();
      unsubscribeNotFound();

      clearAllTimers();

      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [
    clearAllTimers,
    clearStatus,
    clearTimer,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    scheduleStatusClear,
    updateStatus,
  ]);

  return status;
}
