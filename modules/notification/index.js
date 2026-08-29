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
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SEMANTIC_SURFACE_CLASSES,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
  Z_INDEX,
} from '@/shared';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { normalizeFeedbackText } from '@/shared';
import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';
import { cn } from '@/ui/class-names';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass } from '@/domains/shell/navigation/actions/constants';

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

export function getStorageItem(key, defaultValue = null) {
  if (!canUseBrowserStorage()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

export function removeStorageItem(key) {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

export const CRITICAL_TYPES = Object.freeze({
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SERVER_ERROR: 'SERVER_ERROR',
  OFFLINE: 'OFFLINE',
});

export const TOAST_TYPES = Object.freeze({
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INFO: 'INFO',
});

const FALLBACK_NOTIFICATION_ACTIONS = Object.freeze({
  dismissNotification: () => {},
  showNotification: () => {},
});

const FALLBACK_NOTIFICATION_STATE = Object.freeze({
  notifications: {},
});

const NotificationActionsContext = createContext(FALLBACK_NOTIFICATION_ACTIONS);
const NotificationStateContext = createContext(FALLBACK_NOTIFICATION_STATE);

const STORAGE_KEY = 'critical_notifications';

const CRITICAL_SET = new Set(Object.values(CRITICAL_TYPES));

function isObjectRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidCritical(notification) {
  if (!notification?.type) return false;
  if (!CRITICAL_SET.has(notification.type)) return false;
  if (notification.message && /HTTP\s*404/i.test(notification.message)) return false;
  return true;
}

function filterCriticalNotifications(map) {
  return Object.fromEntries(Object.entries(map).filter(([, n]) => isValidCritical(n)));
}

function readStoredCriticalNotifications() {
  const stored = getStorageItem(STORAGE_KEY);

  if (!stored || !isObjectRecord(stored)) {
    if (stored) removeStorageItem(STORAGE_KEY);
    return {};
  }

  const filtered = filterCriticalNotifications(stored);

  if (Object.keys(filtered).length === 0) {
    removeStorageItem(STORAGE_KEY);
  }

  return filtered;
}

function clearNotificationTimer(id, timers) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function normalizeDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function createNotificationEntry(id, type, data = {}) {
  return {
    id,
    type,
    timestamp: Date.now(),
    ...data,
  };
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({});
  const timersRef = useRef(new Map());

  useEffect(() => {
    const storedNotifications = readStoredCriticalNotifications();

    if (Object.keys(storedNotifications).length > 0) {
      setNotifications(storedNotifications);
    }
  }, []);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const critical = filterCriticalNotifications(notifications);

    if (Object.keys(critical).length > 0) {
      setStorageItem(STORAGE_KEY, critical);
    } else {
      removeStorageItem(STORAGE_KEY);
    }
  }, [notifications]);

  const dismissNotification = useCallback((id) => {
    clearNotificationTimer(id, timersRef.current);

    setNotifications((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const showNotification = useCallback(
    (type, data = {}) => {
      const id = data.id || type;
      clearNotificationTimer(id, timersRef.current);

      setNotifications((prev) => ({
        ...prev,
        [id]: createNotificationEntry(id, type, data),
      }));

      const duration = normalizeDuration(data.duration);

      if (duration) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);

        timersRef.current.set(id, timer);
      }
    },
    [dismissNotification],
  );

  const actions = useMemo(
    () => ({
      dismissNotification,
      showNotification,
    }),
    [dismissNotification, showNotification],
  );

  const state = useMemo(
    () => ({
      notifications,
    }),
    [notifications],
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
};

export function useNotificationActions() {
  return useContext(NotificationActionsContext);
}

export function useNotificationState() {
  return useContext(NotificationStateContext);
}

export const NOTIFICATION_CONFIG = Object.freeze({
  [CRITICAL_TYPES.OFFLINE]: Object.freeze({
    tone: 'warning',
    icon: 'solar:danger-triangle-bold',
    title: 'Connection Lost',
    description: 'You are currently offline',
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: false,
  }),
  [CRITICAL_TYPES.SESSION_EXPIRED]: Object.freeze({
    tone: 'warning',
    icon: 'solar:danger-triangle-bold',
    title: 'Session Expired',
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [CRITICAL_TYPES.PERMISSION_DENIED]: Object.freeze({
    tone: 'error',
    icon: 'solar:forbidden-circle-bold',
    title: 'Permission Denied',
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [CRITICAL_TYPES.SERVER_ERROR]: Object.freeze({
    tone: 'error',
    icon: 'solar:danger-triangle-bold',
    title: 'Server Error',
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.SUCCESS]: Object.freeze({
    tone: 'success',
    icon: 'material-symbols:check-rounded',
    title: 'Success',
    theme: SEMANTIC_SURFACE_CLASSES.success,
    actionToneClass: SUCCESS_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.ERROR]: Object.freeze({
    tone: 'error',
    icon: 'solar:danger-triangle-bold',
    title: 'Error',
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.WARNING]: Object.freeze({
    tone: 'warning',
    icon: 'solar:danger-triangle-bold',
    title: 'Warning',
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.INFO]: Object.freeze({
    tone: 'info',
    icon: 'solar:info-circle-bold',
    title: 'Info',
    theme: SEMANTIC_SURFACE_CLASSES.info,
    actionToneClass: INFO_ACTION_TONE_CLASS,
    dismissible: true,
  }),
});

const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const NOTIFICATION_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  FAST: { duration: 0.44, distance: 9, scaleDelta: 0.012, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.66, distance: 18, scaleDelta: 0.018, ease: NOTIFICATION_EASINGS.SOFT },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const NOTIFICATION_MICRO_SPRING = MOTION_SPRINGS.PRESS;
export const NOTIFICATION_MICRO_TAP_SCALE = 0.97;

export const NOTIFICATION_DRAG_CONSTRAINTS = Object.freeze({ left: 0, right: 0 });
export const NOTIFICATION_DRAG_ELASTIC = Object.freeze({ left: 0.05, right: 0.7 });
export const NOTIFICATION_WHILE_DRAG = Object.freeze({ scale: 0.98 });
export const NOTIFICATION_CLOSE_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TRANSITION = MOTION_SPRINGS.PRESS;

export const notificationContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
      delay: 0.06,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const toastVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      x: NOTIFICATION_TIERS.STANDARD.distance,
      scale: 1 - NOTIFICATION_TIERS.STANDARD.scaleDelta,
    }),
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ x: 28, scale: 0.976 }),
    filter: 'blur(4px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const TOAST_VARIANTS = toastVariants;
export const NOTIFICATION_CONTENT_VARIANTS = notificationContentVariants;

const DURATIONS = Object.freeze({
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
});

function withDefaultDuration(duration, options = {}) {
  return {
    duration,
    ...(options || {}),
  };
}

const PRODUCTION_OPTIONAL_TOAST_TYPES = new Set([TOAST_TYPES.SUCCESS, TOAST_TYPES.INFO]);

function isSuppressedToastMessage(message) {
  const normalized = String(message || '')
    .trim()
    .toLowerCase();
  return (
    normalized.includes('profile is private') || normalized.includes('this profile is private')
  );
}

function shouldSuppressToast(type, options = {}, message = '') {
  if (isSuppressedToastMessage(message)) {
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  if (!PRODUCTION_OPTIONAL_TOAST_TYPES.has(type)) {
    return false;
  }

  return options.allowInProduction !== true;
}

export function useToast() {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type, message, options = {}) => {
      const { action, actions, allowInProduction, dedupeKey, description, duration, ...rest } =
        options;
      const normalizedMessage = normalizeFeedbackText(message);

      if (
        !normalizedMessage ||
        isSuppressedToastMessage(normalizedMessage) ||
        shouldSuppressToast(type, { allowInProduction }, normalizedMessage)
      ) {
        return null;
      }

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId = dedupeKey || rest.id || String(normalizedMessage).slice(0, 50);

      return showNotification(type, {
        id: resolvedId,
        message: normalizedMessage,
        description: normalizeFeedbackText(description),
        duration,
        actions: finalActions,
        ...rest,
      });
    },
    [showNotification],
  );

  return useMemo(
    () => ({
      success: (msg, opts = {}) =>
        createToast(TOAST_TYPES.SUCCESS, msg, withDefaultDuration(DURATIONS.SHORT, opts)),
      warning: (msg, opts = {}) =>
        createToast(TOAST_TYPES.WARNING, msg, withDefaultDuration(DURATIONS.DEFAULT, opts)),
      error: (msg, opts = {}) =>
        createToast(TOAST_TYPES.ERROR, msg, withDefaultDuration(DURATIONS.DEFAULT, opts)),
      info: (msg, opts = {}) =>
        createToast(TOAST_TYPES.INFO, msg, withDefaultDuration(DURATIONS.SHORT, opts)),
      show: (type, msg, opts = {}) => createToast(type, msg, opts),
    }),
    [createToast],
  );
}

export function NotificationOverlay({ notification, onDismiss }) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const theme =
    config.theme ||
    SEMANTIC_SURFACE_CLASSES[config.tone] ||
    (typeof config.colorClass === 'object' ? config.colorClass : null) ||
    SEMANTIC_SURFACE_CLASSES.info;

  const hasAutoDismiss = Boolean(notification.duration && Number(notification.duration) > 0);
  const dismissible = config.dismissible !== false;
  const showCloseButton = dismissible && !hasAutoDismiss;
  const explicitTitle = notification.title ? normalizeFeedbackText(notification.title) : '';
  const message = normalizeFeedbackText(notification.message);
  const description = normalizeFeedbackText(notification.description);
  const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];
  const resolvedIcon = notification.icon || config.icon || null;

  let resolvedTitle = '';
  let resolvedDescription = '';

  if (explicitTitle) {
    resolvedTitle = explicitTitle;
    resolvedDescription = description || message || '';
  } else if (message && description) {
    resolvedTitle = message;
    resolvedDescription = description;
  } else if (message) {
    resolvedTitle = config.title || message;
    resolvedDescription = config.title ? message : '';
  } else if (description) {
    resolvedTitle = config.title || description;
    resolvedDescription = config.title ? description : '';
  } else {
    resolvedTitle = config.title || '';
    resolvedDescription = config.description || '';
  }

  if (resolvedTitle === resolvedDescription) {
    resolvedDescription = '';
  }

  if (!resolvedTitle && !resolvedDescription) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-[30px] ring-1 ring-inset ring-white/10 bg-black/80 p-2.5 backdrop-blur-lg transition-all duration-300 ease-in-out',
        theme.surface,
      )}
    >
      <div className="relative flex h-auto w-full flex-col gap-2.5">
        <div className={cn('relative flex w-full items-center gap-2.5', showCloseButton && 'pr-9')}>
          {resolvedIcon ? (
            <div className="center relative shrink-0">
              <div
                className={cn(
                  'center size-12 shrink-0 rounded-[20px] ring-1 ring-inset ring-transparent',
                  theme.icon,
                )}
              >
                {typeof resolvedIcon === 'string' ? (
                  <Icon icon={resolvedIcon} size={24} />
                ) : (
                  resolvedIcon
                )}
              </div>
            </div>
          ) : (
            <div className="size-12 shrink-0" />
          )}

          <div className="relative flex min-w-0 flex-1 flex-col justify-center -space-y-0.5 overflow-hidden">
            {resolvedTitle ? (
              <div className="relative overflow-hidden">
                <h3 className={cn('truncate text-base font-bold', theme.title)}>
                  {resolvedTitle}
                </h3>
              </div>
            ) : null}

            {resolvedDescription ? (
              <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
                <p className={cn('text-sm wrap-break-word whitespace-normal', theme.description)}>
                  {resolvedDescription}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {showCloseButton ? (
          <motion.button
            type="button"
            aria-label="Bildirimi kapat"
            whileTap={NOTIFICATION_CLOSE_TAP}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2.5 right-2.5 z-10 size-8 cursor-pointer rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 transition-all duration-300 ease-in-out hover:ring-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          >
            <Icon icon="material-symbols:close-rounded" size={16} />
          </motion.button>
        ) : null}

        {actions.length > 0 ? (
          <div className="flex w-full flex-wrap items-center gap-2.5">
            {actions.map((action, index) => (
              <motion.button
                key={action.label || index}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                whileTap={NOTIFICATION_ACTION_TAP}
                transition={NOTIFICATION_ACTION_TRANSITION}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss !== false) onDismiss();
                }}
                className={getNavActionClass({
                  isActive: false,
                  className: action.className || config.actionToneClass,
                })}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function sortNotificationsByTimestamp(notifications = {}) {
  return Object.entries(notifications).sort((a, b) => a[1].timestamp - b[1].timestamp);
}

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const sortedNotifications = useMemo(
    () => sortNotificationsByTimestamp(notifications),
    [notifications],
  );

  const notificationContent = (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-0 left-0 mx-auto flex w-full max-w-[380px] flex-col gap-2.5 overflow-visible p-1 px-4 sm:right-4 sm:left-auto sm:mx-0 sm:max-w-[420px] sm:px-0"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence initial={false}>
        {sortedNotifications.map(([id, notification]) => {
          const hasAutoDismiss = Boolean(notification.duration && Number(notification.duration) > 0);
          const isDismissible = notification.dismissible !== false;
          const isSwipeable = isDismissible && hasAutoDismiss;

          return (
            <motion.div
              key={id}
              layout
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={isSwipeable ? 'x' : false}
              dragDirectionLock
              dragConstraints={NOTIFICATION_DRAG_CONSTRAINTS}
              dragElastic={NOTIFICATION_DRAG_ELASTIC}
              onDragEnd={(_e, info) => {
                if (isSwipeable && (info.offset.x > 80 || info.velocity.x > 300)) {
                  dismissNotification(id);
                }
              }}
              whileDrag={NOTIFICATION_WHILE_DRAG}
              className={cn(
                'pointer-events-auto w-full',
                isSwipeable && 'cursor-grab active:cursor-grabbing touch-pan-y',
              )}
            >
              <NotificationOverlay
                notification={notification}
                onDismiss={() => dismissNotification(id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return portalTarget ? createPortal(notificationContent, portalTarget) : null;
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

export function NotificationListener() {
  const { showNotification } = useNotificationActions();

  useEffect(() => {
    const unsubscribe = globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (data) => {
      if (data?.source && data.source !== 'app') return;

      showNotification(CRITICAL_TYPES.SESSION_EXPIRED, {
        message: SESSION_EXPIRED_MESSAGE,
      });
    });

    return unsubscribe;
  }, [showNotification]);

  return null;
}

export function NotificationBadgeListener() {
  return null;
}
