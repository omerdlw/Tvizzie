'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react';

import { applyRegistryConfig } from './handlers';
import {
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  normalizePageRegistryConfig,
  REGISTRY_KEYS,
  REGISTRY_TYPES,
} from './contracts';
import { runScopedBatch } from './operations';
import {
  useRegistryActions,
  useRegistryEntries,
  useRegistrySelector,
  useRegistryValue,
} from './provider';
import { deepCompare, useStableDiff, useStabilizedRegistryConfig } from './stabilization';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// ── Type-scoped public registry hooks ──────────────────────────────────────────

function useModalRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();

  const modalRegister = useCallback(
    (key, component, options = {}) =>
      register(REGISTRY_TYPES.MODAL, key, component, DYNAMIC_SOURCE, options),
    [register],
  );

  const modalUnregister = useCallback(
    (key) => unregister(REGISTRY_TYPES.MODAL, key, DYNAMIC_SOURCE),
    [unregister],
  );

  const modalBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (key, component, options = {}) => {
          return queue.register(REGISTRY_TYPES.MODAL, key, component, DYNAMIC_SOURCE, options);
        },
        unregister: (key) => {
          queue.unregister(REGISTRY_TYPES.MODAL, key, DYNAMIC_SOURCE);
        },
      })),
    [batch],
  );

  return useMemo(
    () => ({
      batch: modalBatch,
      register: modalRegister,
      unregister: modalUnregister,
    }),
    [modalBatch, modalRegister, modalUnregister],
  );
}

export function useNavRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();

  const navRegister = useCallback(
    (key, config, sourceOrOptions = DEFAULT_SOURCE, options = {}) =>
      register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options),
    [register],
  );

  const navUnregister = useCallback(
    (key, sourceOrOptions = DEFAULT_SOURCE) => unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions),
    [unregister],
  );

  const navBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (key, config, sourceOrOptions = DEFAULT_SOURCE, options = {}) => {
          return queue.register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options);
        },
        unregister: (key, sourceOrOptions = DEFAULT_SOURCE) => {
          queue.unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions);
        },
      })),
    [batch],
  );

  return useMemo(
    () => ({
      batch: navBatch,
      register: navRegister,
      unregister: navUnregister,
    }),
    [navBatch, navRegister, navUnregister],
  );
}

export function useModalRegistry() {
  const { batch, register, unregister } = useModalRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.MODAL);

  return useMemo(
    () => ({
      batch,
      unregister,
      register,
      get: (key) => entries[key],
    }),
    [batch, entries, register, unregister],
  );
}

export function useNavRegistry() {
  const { batch, register, unregister } = useNavRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.NAV);

  return useMemo(
    () => ({
      batch,
      get: (key) => entries[key],
      getAll: () => entries,
      unregister,
      register,
    }),
    [batch, entries, register, unregister],
  );
}

export function useNavRuntimeRegistry() {
  return useRegistryValue(REGISTRY_TYPES.NAV_RUNTIME, REGISTRY_KEYS.NAV_RUNTIME) || {};
}

export function useBackgroundValue(selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    selector,
    isEqual,
  );
}

export function useLoadingValue(selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.LOADING, REGISTRY_KEYS.LOADING, selector, isEqual);
}

export function useNavRuntimeValue(selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.NAV_RUNTIME,
    REGISTRY_KEYS.NAV_RUNTIME,
    selector,
    isEqual,
  );
}

export function useNavValue(key, selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.NAV, key, selector, isEqual);
}

export function useModalValue(key, selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.MODAL, key, selector, isEqual);
}

export function useContextMenuValue(key, selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.CONTEXT_MENU, key, selector, isEqual);
}

export function useContextMenuRegistry() {
  const { batch, register, unregister } = useRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.CONTEXT_MENU);

  const contextMenuRegister = useCallback(
    (key, config, options = {}) =>
      register(REGISTRY_TYPES.CONTEXT_MENU, key, config, DYNAMIC_SOURCE, options),
    [register],
  );

  const contextMenuUnregister = useCallback(
    (key, sourceOrOptions = DYNAMIC_SOURCE) =>
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions),
    [unregister],
  );

  const contextMenuBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (key, config, options = {}) => {
          return queue.register(REGISTRY_TYPES.CONTEXT_MENU, key, config, DYNAMIC_SOURCE, options);
        },
        unregister: (key, sourceOrOptions = DYNAMIC_SOURCE) => {
          queue.unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions);
        },
      })),
    [batch],
  );

  return useMemo(
    () => ({
      batch: contextMenuBatch,
      get: (key) => entries[key],
      getAll: () => entries,
      register: contextMenuRegister,
      unregister: contextMenuUnregister,
    }),
    [contextMenuBatch, contextMenuRegister, contextMenuUnregister, entries],
  );
}

// ── Declarative registry lifecycle and instance scoping ──────────────────────

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function withInstanceId(instanceId, sourceOrOptions, optionsArg) {
  if (typeof sourceOrOptions === 'string') {
    return {
      optionsArg: {
        ...(isObject(optionsArg) ? optionsArg : {}),
        instanceId,
      },
      sourceOrOptions,
    };
  }

  if (isObject(sourceOrOptions)) {
    return {
      optionsArg,
      sourceOrOptions: {
        ...sourceOrOptions,
        instanceId,
      },
    };
  }

  return {
    optionsArg: undefined,
    sourceOrOptions: {
      ...(isObject(optionsArg) ? optionsArg : {}),
      instanceId,
    },
  };
}

function withInstanceIdForUnregister(instanceId, sourceOrOptions) {
  if (typeof sourceOrOptions === 'string') {
    return {
      instanceId,
      source: sourceOrOptions,
    };
  }

  if (isObject(sourceOrOptions)) {
    return {
      ...sourceOrOptions,
      instanceId,
    };
  }

  return { instanceId };
}

function resolveRegisterArgsWithInstance(instanceId, sourceOrOptions, optionsArg) {
  const input = withInstanceId(instanceId, sourceOrOptions, optionsArg);
  return [input.sourceOrOptions, input.optionsArg];
}

function resolveUnregisterArgWithInstance(instanceId, sourceOrOptions) {
  return withInstanceIdForUnregister(instanceId, sourceOrOptions);
}

export function useRegistry(config) {
  const { batch, register, unregister } = useRegistryActions();
  const pathname = usePathname();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-instance-${defaultId}`);
  const cleanupScopeRef = useRef(new Map());

  const registerWithInstance = useCallback(
    (type, key, item, sourceOrOptions, optionsArg) => {
      const [resolvedSourceOrOptions, resolvedOptionsArg] = resolveRegisterArgsWithInstance(
        instanceIdRef.current,
        sourceOrOptions,
        optionsArg,
      );

      return register(type, key, item, resolvedSourceOrOptions, resolvedOptionsArg);
    },
    [register],
  );

  const unregisterWithInstance = useCallback(
    (type, key, sourceOrOptions) => {
      return unregister(
        type,
        key,
        resolveUnregisterArgWithInstance(instanceIdRef.current, sourceOrOptions),
      );
    },
    [unregister],
  );

  const batchWithInstance = useCallback(
    (executor) => {
      if (typeof executor !== 'function') {
        return 0;
      }

      return batch((queue) => {
        executor({
          register: (type, key, item, sourceOrOptions, optionsArg) => {
            const [resolvedSourceOrOptions, resolvedOptionsArg] = resolveRegisterArgsWithInstance(
              instanceIdRef.current,
              sourceOrOptions,
              optionsArg,
            );

            return queue.register(type, key, item, resolvedSourceOrOptions, resolvedOptionsArg);
          },
          unregister: (type, key, sourceOrOptions) => {
            queue.unregister(
              type,
              key,
              resolveUnregisterArgWithInstance(instanceIdRef.current, sourceOrOptions),
            );
          },
        });
      });
    },
    [batch],
  );

  const context = useMemo(
    () => ({
      register: registerWithInstance,
      unregister: unregisterWithInstance,
      batch: batchWithInstance,
      instanceId: instanceIdRef.current,
      cleanupScope: cleanupScopeRef.current,
      pathname,
    }),
    [batchWithInstance, registerWithInstance, unregisterWithInstance, pathname],
  );

  const normalizedConfig = normalizePageRegistryConfig(config);
  const stabilizedConfig = useStabilizedRegistryConfig(normalizedConfig);
  const stableConfig = useStableDiff(stabilizedConfig, deepCompare);

  useIsomorphicLayoutEffect(() => {
    return applyRegistryConfig(stableConfig, context);
  }, [stableConfig, context]);
}

export function usePageRegistry(config) {
  return useRegistry(config);
}
