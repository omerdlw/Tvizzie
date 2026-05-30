'use client';

import { REGISTRY_TYPES } from '../context';
import { registerGuard } from '@/core/modules/nav/guards';
import { splitRegistryConfig } from './registry-meta';

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

export const guardPlugin = createPlugin({
  name: 'guard',
  apply: (config) => {
    const guard = config?.guard;
    if (!guard) return;

    const guardWhen = typeof guard.when === 'function' ? guard.when : () => guard.when;

    const unregisterGuard = registerGuard({
      message: guard.message || 'You have unsaved changes Are you sure you want to leave',
      onBlock: guard.onBlock,
      when: guardWhen,
    });

    const handleBeforeUnload = (e) => {
      const shouldBlock = typeof guard.when === 'function' ? guard.when() : guard.when;
      if (shouldBlock) {
        e.preventDefault();
        e.returnValue = guard.message || '';
        return guard.message;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      unregisterGuard();
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  },
});

let loadingCleanupTimeout = null;

export const loadingPlugin = createPlugin({
  name: 'loading',
  apply: (config, { register, unregister }) => {
    const loading = config?.loading;
    if (!loading) return;

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(loading, {
      defaultCleanupDelayMs: 600,
    });

    if (loadingCleanupTimeout) {
      clearTimeout(loadingCleanupTimeout);
      loadingCleanupTimeout = null;
    }

    register(REGISTRY_TYPES.LOADING, 'page-loading', payload, source, registerOptions);

    return () => {
      if (loadingCleanupTimeout) {
        clearTimeout(loadingCleanupTimeout);
      }

      loadingCleanupTimeout = setTimeout(() => {
        unregister(REGISTRY_TYPES.LOADING, 'page-loading', source);
        loadingCleanupTimeout = null;
      }, cleanupDelayMs);
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
      payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
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

function createCleanupKey(path, source) {
  return `${path}::${source}`;
}

function clearCleanupTimer(path, source) {
  const cleanupKey = createCleanupKey(path, source);
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
  apply: (config, { register, unregister, pathname }) => {
    const nav = config?.nav;
    if (!nav) return;

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(nav, { defaultCleanupDelayMs: 0 });
    const navConfig = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};

    const itemPath = navConfig.path || pathname;
    const navItem = {
      ...navConfig,
      path: itemPath,
      action: navConfig.action,
      actions: navConfig.actions,
      confirmation: navConfig.confirmation,
      surface: navConfig.surface,
    };

    const resolvedIsLoading = navConfig.isLoading !== undefined ? navConfig.isLoading : getLoadingFallback(config);

    if (resolvedIsLoading !== undefined) {
      navItem.isLoading = resolvedIsLoading;
    }

    if (itemPath) {
      clearCleanupTimer(itemPath, source);
      register(REGISTRY_TYPES.NAV, itemPath, navItem, source, registerOptions);
    }

    return () => {
      if (itemPath) {
        const cleanup = () => {
          unregister(REGISTRY_TYPES.NAV, itemPath, source);
          clearCleanupTimer(itemPath, source);
        };

        if (cleanupDelayMs > 0) {
          const cleanupKey = createCleanupKey(itemPath, source);
          const timerId = setTimeout(cleanup, cleanupDelayMs);
          navCleanupTimeouts.set(cleanupKey, timerId);
          return;
        }

        cleanup();
      }
    };
  },
});

export const notificationPlugin = createPlugin({
  name: 'notifications',
  apply: (config, context) => {
    const notifications = config?.notifications;

    if (notifications?.onMount && !context.hasShownMountNotification) {
      context.setHasShownMountNotification(true);
      const { type = 'info', message, ...options } = notifications.onMount;

      if (message && context.toast) {
        if (typeof context.toast[type] === 'function') {
          context.toast[type](message, options);
        } else {
          context.toast.show(type, message, options);
        }
      }
    }

    return () => {};
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
  guardPlugin,
  notificationPlugin,
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
