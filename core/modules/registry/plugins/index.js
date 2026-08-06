'use client';

import { REGISTRY_TYPES } from '../context';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitRegistryConfig(config, options = {}) {
  const { defaultCleanupDelayMs = null, defaultSource = 'dynamic' } = options;
  const registryMeta = isObject(config) && isObject(config.registry) ? config.registry : {};
  const source = typeof registryMeta.source === 'string' ? registryMeta.source : defaultSource;
  const registerOptions = {};
  const priority = parseFiniteNumber(registryMeta.priority);
  if (priority !== null) registerOptions.priority = priority;
  const ttlMs = parseFiniteNumber(registryMeta.ttlMs);
  if (ttlMs !== null && ttlMs > 0) registerOptions.ttlMs = ttlMs;
  const cleanupDelayMsCandidate = parseFiniteNumber(registryMeta.cleanupDelayMs);
  const cleanupDelayMs =
    cleanupDelayMsCandidate !== null && cleanupDelayMsCandidate >= 0
      ? cleanupDelayMsCandidate
      : defaultCleanupDelayMs;
  const payload = isObject(config)
    ? Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'registry'))
    : config;

  return { cleanupDelayMs, payload, registerOptions, source };
}

export function createPlugin({ name, apply }) {
  return { name, apply };
}

export const backgroundPlugin = createPlugin({
  name: 'background',
  apply: (config, { register, unregister }) => {
    const background = config?.background;

    if (background) {
      const { payload, registerOptions, source } = splitRegistryConfig(background);

      register(REGISTRY_TYPES.BACKGROUND, 'page-background', payload, source, registerOptions);

      return () => {
        unregister(REGISTRY_TYPES.BACKGROUND, 'page-background', source);
      };
    }
  },
});

export const contextMenuPlugin = createPlugin({
  name: 'contextMenu',
  apply: (config, { register, unregister, pathname }) => {
    const contextMenu = config?.contextMenu;
    if (!contextMenu) return;

    const { payload, registerOptions, source } = splitRegistryConfig(contextMenu);

    const key = pathname || 'current-page';

    register(REGISTRY_TYPES.CONTEXT_MENU, key, payload, source, registerOptions);

    return () => {
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, source);
    };
  },
});

const loadingCleanupTimeouts = new Map();

function createScopedCleanupKey(source, instanceId = null) {
  return `${source}::${instanceId || 'global'}`;
}

function clearLoadingCleanupTimer(source, instanceId) {
  const cleanupKey = createScopedCleanupKey(source, instanceId);
  const timerId = loadingCleanupTimeouts.get(cleanupKey);
  if (!timerId) return;

  clearTimeout(timerId);
  loadingCleanupTimeouts.delete(cleanupKey);
}

export const loadingPlugin = createPlugin({
  name: 'loading',
  apply: (config, { instanceId, register, unregister }) => {
    const loading = config?.loading;
    if (!loading) return;

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(loading, {
      defaultCleanupDelayMs: 600,
    });

    clearLoadingCleanupTimer(source, instanceId);

    register(REGISTRY_TYPES.LOADING, 'page-loading', payload, source, registerOptions);

    return () => {
      clearLoadingCleanupTimer(source, instanceId);
      const cleanupKey = createScopedCleanupKey(source, instanceId);
      const timerId = setTimeout(() => {
        unregister(REGISTRY_TYPES.LOADING, 'page-loading', source);
        loadingCleanupTimeouts.delete(cleanupKey);
      }, cleanupDelayMs);
      loadingCleanupTimeouts.set(cleanupKey, timerId);
    };
  },
});

export const modalPlugin = createPlugin({
  name: 'modals',
  apply: (config, { batch, register, unregister }) => {
    const modals = config?.modal || config?.modals;
    if (!modals) return;

    const modalConfig = Array.isArray(modals) ? Object.assign({}, ...modals) : modals;

    const { payload, registerOptions, source } = splitRegistryConfig(modalConfig);
    const modalItems = Object.entries(
      payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {},
    ).filter(([key]) => key !== 'registry');

    if (modalItems.length === 0) return;

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
      if (typeof batch === 'function') {
        batch((queue) => {
          modalItems.forEach(([key]) => {
            queue.unregister(REGISTRY_TYPES.MODAL, key, source);
          });
        });
        return;
      }

      modalItems.forEach(([key]) => {
        unregister(REGISTRY_TYPES.MODAL, key, source);
      });
    };
  },
});

const navCleanupTimeouts = new Map();

function createCleanupKey(path, source, instanceId = null) {
  return `${path}::${createScopedCleanupKey(source, instanceId)}`;
}

function clearCleanupTimer(path, source, instanceId) {
  const cleanupKey = createCleanupKey(path, source, instanceId);
  const timerId = navCleanupTimeouts.get(cleanupKey);

  if (!timerId) {
    return;
  }

  clearTimeout(timerId);
  navCleanupTimeouts.delete(cleanupKey);
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

export const navPlugin = createPlugin({
  name: 'nav',
  apply: (config, { instanceId, register, unregister, pathname }) => {
    const nav = config?.nav;
    if (!nav) return;

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(nav, {
      defaultCleanupDelayMs: 600,
    });
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

    const resolvedIsLoading =
      normalizedNavConfig.isLoading !== undefined
        ? normalizedNavConfig.isLoading
        : getLoadingFallback(config);

    if (resolvedIsLoading !== undefined) {
      navItem.isLoading = resolvedIsLoading;
    }

    const filteredNavItem = Object.fromEntries(
      Object.entries(navItem).filter(([, val]) => val !== undefined)
    );

    if (itemPath) {
      clearCleanupTimer(itemPath, source, instanceId);
      register(REGISTRY_TYPES.NAV, itemPath, filteredNavItem, source, registerOptions);
    }

    return () => {
      if (itemPath) {
        const cleanup = () => {
          unregister(REGISTRY_TYPES.NAV, itemPath, source);
          clearCleanupTimer(itemPath, source, instanceId);
        };

        if (cleanupDelayMs > 0) {
          const cleanupKey = createCleanupKey(itemPath, source, instanceId);
          const timerId = setTimeout(cleanup, cleanupDelayMs);
          navCleanupTimeouts.set(cleanupKey, timerId);
          return;
        }

        cleanup();
      }
    };
  },
});

export const titlePlugin = createPlugin({
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
});

export const PLUGINS = [
  titlePlugin,
  contextMenuPlugin,
  navPlugin,
  modalPlugin,
  backgroundPlugin,
  loadingPlugin,
];

export function createPluginRunner(plugins) {
  return {
    apply: (config, context) => {
      if (!config) return () => {};

      const cleanups = plugins.map((plugin) => {
        try {
          return plugin.apply(config, context);
        } catch (e) {
          console.error(`[PluginRunner] Error in plugin ${plugin.name}:`, e);
          return null;
        }
      });

      return () => {
        cleanups.forEach((cleanup) => {
          if (typeof cleanup === 'function') {
            try {
              cleanup();
            } catch (e) {
              console.error(`[PluginRunner] Error in cleanup:`, e);
            }
          }
        });
      };
    },
  };
}
