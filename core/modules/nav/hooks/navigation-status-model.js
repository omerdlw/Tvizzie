'use client';

import { Wifi, WifiOff } from 'lucide-react';

import { SEMANTIC_SURFACE_CLASSES } from '@/core/constants';
import { Button } from '@/ui/elements';
import { Spinner } from '@/ui/loadings/spinner';

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

export const STATUS_CLEAR_DURATION = 4500;
export const AUTH_STATUS_CLEAR_DURATION = 3000;
export const API_ERROR_BATCH_DELAY = 300;

const AUTH_STATUS_STORAGE_KEY = 'nav_auth_status';
const PERSISTED_AUTH_STATUS_TYPES = new Set(['LOGIN', 'LOGOUT', 'SIGNUP']);

function readSessionStorage() {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeLower(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isErrorStatus(type) {
  return ERROR_STATUS_TYPES.has(type);
}

function getStatusPriority(type) {
  return STATUS_PRIORITY[type] ?? 0;
}

export function resolveStatusPriority(status) {
  if (!status) {
    return 0;
  }

  const explicitPriority = Number(status.priority);

  return Number.isFinite(explicitPriority) ? explicitPriority : getStatusPriority(status.type);
}

function getStatusTone(type) {
  return STATUS_TONES[type] || 'info';
}

export function getStatusTheme(type) {
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

export function isPersistableAuthStatus(status) {
  return (
    Boolean(status) &&
    PERSISTED_AUTH_STATUS_TYPES.has(status.type) &&
    (typeof status.icon === 'string' || status.icon == null)
  );
}

export function clearPersistedAuthStatus() {
  readSessionStorage()?.removeItem(AUTH_STATUS_STORAGE_KEY);
}

export function persistAuthStatus(status, duration) {
  const storage = readSessionStorage();

  if (!isPersistableAuthStatus(status) || !storage) {
    return;
  }

  storage.setItem(
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

export function restorePersistedAuthStatus() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(AUTH_STATUS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue);
    const type = normalizeUpper(payload?.type);
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

export function createOverlayStatus({
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

function ErrorActions({ onRetry, onRefresh }) {
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <Button
        className="center bg-primary/60 hover:bg-primary hover:text-error w-full cursor-pointer px-4 py-2 text-sm font-semibold text-white transition-colors duration-200"
        onClick={(event) => {
          event.stopPropagation();
          onRetry();
        }}
      >
        Retry
      </Button>

      <Button
        className="center bg-primary/60 hover:bg-primary hover:text-error w-full cursor-pointer px-4 py-2 text-sm font-semibold text-white transition-colors duration-200"
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

export function createErrorStatus({ type, title, description, icon, style, onRetry, clearStatus }) {
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

export function createProgressIcon() {
  return <Spinner size={24} />;
}

export function createSuccessIcon() {
  return 'material-symbols:check-rounded';
}

export function resolveFeedbackIcon({ phase, icon = null }) {
  if (phase === 'start') {
    return createProgressIcon();
  }

  if (phase === 'success') {
    return createSuccessIcon();
  }

  return icon;
}

export function createConnectionStatus(type) {
  if (type === 'OFFLINE') {
    return createOverlayStatus({
      type,
      title: 'Connection Lost',
      description: 'You are currently offline',
      icon: <WifiOff size={24} />,
      style: getStatusTheme(type),
    });
  }

  return createOverlayStatus({
    type: 'ONLINE',
    title: 'Connection Restored',
    description: 'You are back online',
    icon: <Wifi size={24} />,
    style: getStatusTheme('ONLINE'),
    isOverlay: false,
  });
}

export function createAuthStatus({ type, user = null, titleFallback = 'Account', description }) {
  return createOverlayStatus({
    type,
    title: user?.name || user?.email || titleFallback,
    description,
    icon: createSuccessIcon(),
    style: getStatusTheme(type),
  });
}

export function normalizeAuthFeedback(eventData = {}) {
  const phase = normalizeLower(eventData?.phase);
  const flow = normalizeLower(eventData?.flow);
  const statusType = normalizeUpper(eventData?.statusType || flow || 'AUTH_FEEDBACK');

  return {
    flow,
    phase,
    statusType,
  };
}

export function createAuthFeedbackStatus(eventData = {}) {
  const { flow, phase, statusType } = normalizeAuthFeedback(eventData);

  if (!phase) {
    return null;
  }

  return createOverlayStatus({
    type: statusType,
    flow,
    priority: eventData?.priority ?? STATUS_PRIORITY.LOGIN,
    title: eventData?.title || 'Account',
    description: eventData?.description || '',
    icon: resolveFeedbackIcon({
      phase,
      icon: eventData?.icon || null,
    }),
    style: eventData?.style || getStatusTheme(eventData?.themeType || 'LOGIN'),
    isOverlay: eventData?.isOverlay !== false,
  });
}
