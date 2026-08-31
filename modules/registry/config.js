import { validateNavConfig } from '@/modules/nav/utils';

import {
  DEFAULT_SOURCE,
  getRegistryDefinition,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLES,
  REGISTRY_TYPES,
  normalizeRegistryMetadata,
} from './contracts';
import { recordRegistryDiagnostic } from './diagnostics';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function splitRegistryConfig(config, options = {}) {
  const definition = getRegistryDefinition(options.type) || {};
  const {
    defaultCleanupDelayMs = definition.defaultCleanupDelayMs ?? null,
    defaultLifecycle = definition.defaultLifecycle ?? null,
    defaultSource = DEFAULT_SOURCE,
  } = options;
  const registryMeta = isObject(config) && isObject(config.registry) ? config.registry : {};
  const { cleanupDelayMs, lifecycle, registerOptions, source } = normalizeRegistryMetadata(
    registryMeta,
    { defaultCleanupDelayMs, defaultLifecycle, defaultSource },
  );
  const payload = isObject(config)
    ? Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'registry'))
    : config;

  return { cleanupDelayMs, lifecycle, payload, registerOptions, source };
}

function isPersistentLifecycle(lifecycle) {
  return lifecycle === REGISTRY_LIFECYCLES.PERSISTENT;
}

// ── Built-in config plugins ────────────────────────────────────────────────────

const backgroundPlugin = {
  name: 'background',
  apply: (config, context) => {
    const { instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const background = config?.background;

    if (background) {
      const { cleanupDelayMs, lifecycle, payload, registerOptions, source } = splitRegistryConfig(
        background,
        { type: REGISTRY_TYPES.BACKGROUND },
      );
      const cleanupKey = createCleanupKey(REGISTRY_KEYS.BACKGROUND, source, instanceId);
      clearCleanupTimer(cleanupScope, cleanupKey);

      register(
        REGISTRY_TYPES.BACKGROUND,
        REGISTRY_KEYS.BACKGROUND,
        payload,
        source,
        registerOptions,
      );

      return () => {
        if (isPersistentLifecycle(lifecycle)) return;
        scheduleOrRunCleanup(
          cleanupScope,
          cleanupKey,
          () => {
            unregister(REGISTRY_TYPES.BACKGROUND, REGISTRY_KEYS.BACKGROUND, {
              source,
              instanceId,
            });
          },
          cleanupDelayMs,
        );
      };
    }
  },
};

const contextMenuPlugin = {
  name: 'contextMenu',
  apply: (config, context) => {
    const { instanceId, pathname, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const contextMenu = config?.contextMenu;
    if (!contextMenu) return;

    const { cleanupDelayMs, lifecycle, payload, registerOptions, source } = splitRegistryConfig(
      contextMenu,
      { type: REGISTRY_TYPES.CONTEXT_MENU },
    );

    const key = pathname || REGISTRY_KEYS.CONTEXT_MENU_CURRENT;
    const cleanupKey = createCleanupKey(key, source, instanceId);
    clearCleanupTimer(cleanupScope, cleanupKey);

    register(REGISTRY_TYPES.CONTEXT_MENU, key, payload, source, registerOptions);

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () => {
          unregister(REGISTRY_TYPES.CONTEXT_MENU, key, {
            source,
            instanceId,
          });
        },
        cleanupDelayMs,
      );
    };
  },
};

// ── Delayed cleanup lifecycle helpers ─────────────────────────────────────────

function createScopedCleanupKey(source, instanceId = null) {
  return `${source}::${instanceId || 'global'}`;
}

function getCleanupScope(context) {
  return context?.cleanupScope || new Map();
}

function clearCleanupTimer(scope, cleanupKey) {
  const lifecycle = scope.get(cleanupKey);
  if (!lifecycle) return;

  lifecycle.cancelled = true;
  clearTimeout(lifecycle.timerId);
  scope.delete(cleanupKey);
}

function scheduleCleanup(scope, cleanupKey, callback, delayMs) {
  clearCleanupTimer(scope, cleanupKey);
  const lifecycle = { cancelled: false, timerId: null };
  lifecycle.timerId = setTimeout(() => {
    if (lifecycle.cancelled || scope.get(cleanupKey) !== lifecycle) return;
    scope.delete(cleanupKey);
    callback();
  }, delayMs);
  scope.set(cleanupKey, lifecycle);
}

function scheduleOrRunCleanup(scope, cleanupKey, callback, delayMs) {
  if (Number.isFinite(delayMs) && delayMs > 0) {
    scheduleCleanup(scope, cleanupKey, callback, delayMs);
    return;
  }

  callback();
}

// Loading, modal, and navigation handlers share the scoped cleanup lifecycle.
const loadingPlugin = {
  name: 'loading',
  apply: (config, context) => {
    const { instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const loading = config?.loading;
    if (!loading) return;

    const { cleanupDelayMs, lifecycle, payload, registerOptions, source } = splitRegistryConfig(
      loading,
      { type: REGISTRY_TYPES.LOADING },
    );

    const cleanupKey = createScopedCleanupKey(source, instanceId);
    clearCleanupTimer(cleanupScope, cleanupKey);

    register(REGISTRY_TYPES.LOADING, REGISTRY_KEYS.LOADING, payload, source, registerOptions);

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleCleanup(
        cleanupScope,
        cleanupKey,
        () => {
          unregister(REGISTRY_TYPES.LOADING, REGISTRY_KEYS.LOADING, {
            source,
            instanceId,
          });
        },
        cleanupDelayMs,
      );
    };
  },
};

const modalPlugin = {
  name: 'modals',
  apply: (config, context) => {
    const { batch, instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const modals = config?.modal || config?.modals;
    if (!modals) return;

    const modalConfig = Array.isArray(modals) ? Object.assign({}, ...modals) : modals;

    const { cleanupDelayMs, lifecycle, payload, registerOptions, source } = splitRegistryConfig(
      modalConfig,
      { type: REGISTRY_TYPES.MODAL },
    );
    const modalItems = Object.entries(
      payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {},
    ).filter(([key]) => key !== 'registry');

    if (modalItems.length === 0) return;

    const cleanupKey = createCleanupKey('modals', source, instanceId);
    clearCleanupTimer(cleanupScope, cleanupKey);

    if (typeof batch === 'function') {
      batch((queue) => {
        modalItems.forEach(([key, component]) => {
          queue.register(REGISTRY_TYPES.MODAL, key, component, source, registerOptions);
        });
      });
    } else {
      modalItems.forEach(([key, component]) => {
        register(REGISTRY_TYPES.MODAL, key, component, source, registerOptions);
      });
    }

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      if (typeof batch === 'function') {
        const cleanup = () => {
          batch((queue) => {
            modalItems.forEach(([key]) => {
              queue.unregister(REGISTRY_TYPES.MODAL, key, { source, instanceId });
            });
          });
        };
        if (Number.isFinite(cleanupDelayMs) && cleanupDelayMs > 0) {
          scheduleCleanup(cleanupScope, cleanupKey, cleanup, cleanupDelayMs);
        } else {
          cleanup();
        }
        return;
      }

      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () => {
          modalItems.forEach(([key]) => {
            unregister(REGISTRY_TYPES.MODAL, key, { source, instanceId });
          });
        },
        cleanupDelayMs,
      );
    };
  },
};

function createCleanupKey(path, source, instanceId = null) {
  return `${path}::${createScopedCleanupKey(source, instanceId)}`;
}

function getLoadingFallback(config) {
  const loading = config?.loading;
  if (!loading || typeof loading !== 'object' || Array.isArray(loading)) {
    return undefined;
  }

  const { payload } = splitRegistryConfig(loading);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'isLoading')) {
    return undefined;
  }

  return payload.isLoading;
}

const navPlugin = {
  name: 'nav',
  apply: (config, context) => {
    const { instanceId, register, unregister, pathname } = context;
    const cleanupScope = getCleanupScope(context);
    const nav = config?.nav;
    if (!nav) return;

    const { cleanupDelayMs, lifecycle, payload, registerOptions, source } = splitRegistryConfig(
      nav,
      { type: REGISTRY_TYPES.NAV },
    );
    const navConfig =
      payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};

    const normalizedNavConfig = { ...navConfig };
    delete normalizedNavConfig.confirmation;
    const itemPath = normalizedNavConfig.path || pathname;
    const navItem = {
      ...normalizedNavConfig,
      path: itemPath,
      action: normalizedNavConfig.action,
      actions: normalizedNavConfig.actions,
      surface: normalizedNavConfig.surface,
    };

    const validation = validateNavConfig(navItem);
    if (!validation.valid) {
      recordRegistryDiagnostic({
        action: 'reject',
        issues: validation.issues,
        reason: 'invalid-nav-config',
        type: REGISTRY_TYPES.NAV,
      });
      console.warn('[Registry] Invalid NAV config:', validation.issues);
      return;
    }

    const resolvedIsLoading =
      normalizedNavConfig.isLoading !== undefined
        ? normalizedNavConfig.isLoading
        : getLoadingFallback(config);

    if (resolvedIsLoading !== undefined) {
      navItem.isLoading = resolvedIsLoading;
    }

    const filteredNavItem = Object.fromEntries(
      Object.entries(navItem).filter(([, val]) => val !== undefined),
    );

    if (itemPath) {
      const cleanupKey = createCleanupKey(itemPath, source, instanceId);
      clearCleanupTimer(cleanupScope, cleanupKey);
      register(REGISTRY_TYPES.NAV, itemPath, filteredNavItem, source, registerOptions);
    }

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      if (itemPath) {
        const cleanup = () => {
          unregister(REGISTRY_TYPES.NAV, itemPath, { source, instanceId });
        };

        if (cleanupDelayMs > 0) {
          const cleanupKey = createCleanupKey(itemPath, source, instanceId);
          scheduleCleanup(cleanupScope, cleanupKey, cleanup, cleanupDelayMs);
          return;
        }

        cleanup();
      }
    };
  },
};

const titlePlugin = {
  name: 'title',
  apply: (config) => {
    const title = config?.title;
    if (!title) return;

    const originalTitle = typeof document !== 'undefined' ? document.title : '';

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.title = originalTitle;
      }
    };
  },
};

// ── Plugin orchestration and cleanup isolation ─────────────────────────────────

const REGISTRY_HANDLERS = [
  titlePlugin,
  contextMenuPlugin,
  navPlugin,
  modalPlugin,
  backgroundPlugin,
  loadingPlugin,
];

export function applyRegistryConfig(config, context) {
  if (!config) return () => {};

  const cleanups = REGISTRY_HANDLERS.map((handler) => {
    try {
      return handler.apply(config, context);
    } catch (error) {
      recordRegistryDiagnostic({
        action: 'error',
        error: error?.message || String(error),
        handler: handler.name,
        phase: 'apply',
      });
      console.error(`[Registry] Failed to apply ${handler.name}:`, error);
      return null;
    }
  });

  return () => {
    cleanups.forEach((cleanup) => {
      if (typeof cleanup !== 'function') return;

      try {
        cleanup();
      } catch (error) {
        recordRegistryDiagnostic({
          action: 'error',
          error: error?.message || String(error),
          phase: 'cleanup',
        });
        console.error('[Registry] Failed to clean up registration:', error);
      }
    });
  };
}
