'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { Wifi, WifiOff } from 'lucide-react';

import { SEMANTIC_SURFACE_CLASSES } from '@/core/constants';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { getUserAvatarUrl } from '@/core/utils';
import { Button } from '@/ui/elements';
import { Spinner } from '@/ui/loadings/spinner';

import NotFoundAction from '../actions/not-found-action';
import { getNavActionClass } from '@/core/modules/nav/actions/styles';

const STATUS_PRIORITY = Object.freeze({
  ACCOUNT_DELETE: 115,
  SIGNUP: 110,
  LOGIN: 110,
  LOGOUT: 110,
  APP_ERROR: 100,
  NOT_FOUND: 97,
  API_ERROR: 95,
  OFFLINE: 90,
  ONLINE: 10,
});

const ERROR_STATUS_TYPES = new Set(['ACCOUNT_DELETE', 'APP_ERROR', 'API_ERROR', 'NOT_FOUND']);

const STATUS_TONES = Object.freeze({
  ACCOUNT_DELETE: 'error',
  API_ERROR: 'error',
  APP_ERROR: 'error',
  LOGIN: 'success',
  LOGOUT: 'warning',
  NOT_FOUND: 'error',
  OFFLINE: 'warning',
  ONLINE: 'success',
  SIGNUP: 'success',
});

const STATUS_CLEAR_DURATION = 4500;
const AUTH_STATUS_CLEAR_DURATION = 3000;
const API_ERROR_BATCH_DELAY = 300;
const AUTH_STATUS_STORAGE_KEY = 'nav_auth_status';
const PERSISTED_AUTH_STATUS_TYPES = new Set(['LOGIN', 'LOGOUT', 'SIGNUP']);

function isErrorStatus(type) {
  return ERROR_STATUS_TYPES.has(type);
}

function getStatusPriority(type) {
  return STATUS_PRIORITY[type] ?? 0;
}

function resolveStatusPriority(status) {
  if (!status) {
    return 0;
  }

  const explicitPriority = Number(status.priority);

  if (Number.isFinite(explicitPriority)) {
    return explicitPriority;
  }

  return getStatusPriority(status.type);
}

function getStatusTone(type) {
  return STATUS_TONES[type] || 'info';
}

function getStatusTheme(type) {
  const semanticTone = SEMANTIC_SURFACE_CLASSES[getStatusTone(type)] || SEMANTIC_SURFACE_CLASSES.info;

  return {
    card: {
      className: semanticTone.surface,
    },
    icon: {
      className: semanticTone.icon,
    },
    title: {
      className: semanticTone.title,
    },
    description: {
      className: semanticTone.description,
      opacity: 1,
    },
  };
}

function isPersistableAuthStatus(status) {
  return (
    Boolean(status) &&
    PERSISTED_AUTH_STATUS_TYPES.has(status.type) &&
    (typeof status.icon === 'string' || status.icon == null)
  );
}

function clearPersistedAuthStatus() {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_STATUS_STORAGE_KEY);
}

function persistAuthStatus(status, duration) {
  if (
    !isPersistableAuthStatus(status) ||
    typeof window === 'undefined' ||
    typeof window.sessionStorage === 'undefined'
  ) {
    return;
  }

  window.sessionStorage.setItem(
    AUTH_STATUS_STORAGE_KEY,
    JSON.stringify({
      description: status.description || '',
      expiresAt: Date.now() + Math.max(0, Number(duration) || 0),
      flow: status.flow || null,
      icon: status.icon || null,
      priority: resolveStatusPriority(status),
      title: status.title || '',
      type: status.type,
    })
  );
}

function restorePersistedAuthStatus() {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(AUTH_STATUS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue);
    const type = String(payload?.type || '')
      .trim()
      .toUpperCase();
    const expiresAt = Number(payload?.expiresAt || 0);

    if (!PERSISTED_AUTH_STATUS_TYPES.has(type) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearPersistedAuthStatus();
      return null;
    }

    return {
      remainingMs: expiresAt - Date.now(),
      status: createOverlayStatus({
        type,
        flow: payload?.flow || null,
        priority: Number.isFinite(Number(payload?.priority)) ? Number(payload.priority) : null,
        title: payload?.title || 'Account',
        description: payload?.description || '',
        icon: payload?.icon || null,
        style: getStatusTheme(type),
      }),
    };
  } catch {
    clearPersistedAuthStatus();
    return null;
  }
}

function getNotFoundTheme() {
  return getStatusTheme('NOT_FOUND');
}

function ErrorActions({ onRetry, onRefresh }) {
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <Button
        variant="destructive"
        onClick={(event) => {
          event.stopPropagation();
          onRetry();
        }}
      >
        Retry
      </Button>

      <Button
        className={getNavActionClass({ tone: 'danger' })}
        onClick={(event) => {
          event.stopPropagation();
          onRefresh();
        }}
      >
        Refresh
      </Button>
    </div>
  );
}

function getDefaultAvatar(user, fallbackSeed = 'account') {
  return getUserAvatarUrl({
    ...user,
    id: user?.id || fallbackSeed,
  });
}

function createOverlayStatus({
  type,
  title,
  description,
  icon,
  style,
  isOverlay = true,
  action = null,
  actions = null,
  flow = null,
  priority = null,
}) {
  return {
    type,
    flow,
    isOverlay,
    priority,
    title,
    description,
    icon,
    style,
    action,
    actions,
    hideSettings: true,
    hideScroll: true,
  };
}

function createErrorStatus({ type, title, description, icon, style, onRetry, clearStatus }) {
  const retryHandler =
    typeof onRetry === 'function'
      ? () => {
          clearStatus();
          onRetry();
        }
      : () => {
          window.location.reload();
        };

  return createOverlayStatus({
    type,
    title,
    description,
    icon,
    style,
    isOverlay: true,
    action: () => <ErrorActions onRetry={retryHandler} onRefresh={() => window.location.reload()} />,
  });
}

function createProgressIcon() {
  return <Spinner size={24} />;
}

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
    updateStatus(
      createOverlayStatus({
        type: 'OFFLINE',
        title: 'Connection Lost',
        description: 'You are currently offline',
        icon: <WifiOff size={24} />,
        style: getStatusTheme('OFFLINE'),
      })
    );
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

      return createOverlayStatus({
        type: 'ONLINE',
        title: 'Connection Restored',
        description: 'You are back online',
        icon: <Wifi size={24} />,
        style: getStatusTheme('ONLINE'),
        isOverlay: false,
      });
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

      updateStatus(
        createOverlayStatus({
          type,
          title: user?.name || user?.email || 'Account',
          description: isAccountDelete ? 'Account deleted' : 'Signed out',
          icon: getDefaultAvatar(user, 'account'),
          style: getStatusTheme(type),
        })
      );

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: [type],
      });

      if (!isAccountDelete) {
        persistAuthStatus(
          createOverlayStatus({
            type,
            title: user?.name || user?.email || 'Account',
            description: 'Signed out',
            icon: getDefaultAvatar(user, 'account'),
            style: getStatusTheme(type),
          }),
          AUTH_STATUS_CLEAR_DURATION
        );
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

      const nextStatus = createOverlayStatus({
        type: 'LOGIN',
        title: user.name || user.email || 'User',
        description: 'Signed in',
        icon: getDefaultAvatar(user, 'default'),
        style: getStatusTheme('LOGIN'),
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

      const nextStatus = createOverlayStatus({
        type: 'SIGNUP',
        title: user.name || user.email || 'Account',
        description: 'Setting up account',
        icon: getDefaultAvatar(user, 'default'),
        style: getStatusTheme('SIGNUP'),
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: ['SIGNUP'],
      });

      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    });

    const unsubscribeAuthFeedback = globalEvents.subscribe(EVENT_TYPES.AUTH_FEEDBACK, (eventData) => {
      const phase = String(eventData?.phase || '')
        .trim()
        .toLowerCase();
      const flow = String(eventData?.flow || '')
        .trim()
        .toLowerCase();
      const statusType = String(eventData?.statusType || flow || 'AUTH_FEEDBACK')
        .trim()
        .toUpperCase();

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

      updateStatus(
        createOverlayStatus({
          type: statusType,
          flow,
          priority: eventData?.priority ?? STATUS_PRIORITY.LOGIN,
          title: eventData?.title || 'Account',
          description: eventData?.description || '',
          icon: eventData?.icon || (phase === 'start' ? createProgressIcon() : 'solar:check-circle-bold'),
          style: eventData?.style || getStatusTheme(eventData?.themeType || 'LOGIN'),
          isOverlay: eventData?.isOverlay !== false,
        })
      );

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
        style: getNotFoundTheme(),
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
