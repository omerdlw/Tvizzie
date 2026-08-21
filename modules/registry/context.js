'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { DEFAULT_SOURCE, DYNAMIC_SOURCE, REGISTRY_TYPES } from './constants';
import {
  applyOperation,
  createInitialRegistries,
  createRegisterOperation,
  createUnregisterOperation,
  hasOperationEffect,
  isValidRegistryTarget,
  resolveEffectiveOperations,
  resolveEntryValue,
  runScopedBatch,
} from './store';

const NOOP = () => {};
const DEFAULT_REGISTRY_ACTIONS = Object.freeze({
  batch: (fn) => (typeof fn === 'function' ? fn({ register: NOOP, unregister: NOOP }) : 0),
  register: NOOP,
  unregister: NOOP,
});

const DEFAULT_REGISTRY_SUBSCRIPTION = Object.freeze({
  getEntriesSnapshot: () => ({}),
  getSnapshot: () => null,
  subscribe: () => NOOP,
});

const RegistryActionsContext = createContext(null);
const RegistrySubscriptionContext = createContext(null);

export { REGISTRY_TYPES };

export function RegistryProvider({ children }) {
  const registriesRef = useRef(createInitialRegistries());
  const listenersRef = useRef(new Map());
  const entrySnapshotsRef = useRef(new Map());
  const valueSnapshotsRef = useRef(new Map());

  const subscribe = useCallback((type, listener) => {
    const listeners = listenersRef.current.get(type) || new Set();
    listeners.add(listener);
    listenersRef.current.set(type, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  }, []);

  const commitRegistries = useCallback((nextState) => {
    const previousState = registriesRef.current;
    if (previousState === nextState) return;

    registriesRef.current = nextState;

    Object.keys(nextState).forEach((type) => {
      if (previousState[type] !== nextState[type]) {
        listenersRef.current.get(type)?.forEach((listener) => listener());
      }
    });
  }, []);

  const register = useCallback(
    (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
      if (!isValidRegistryTarget(type, key)) return;

      const timestamp = Date.now();
      const operation = createRegisterOperation(
        type,
        key,
        item,
        sourceOrOptions,
        optionsArg,
        timestamp,
      );

      const currentState = registriesRef.current;
      if (!hasOperationEffect(currentState, operation)) return;

      const nextState = applyOperation(currentState, operation);
      commitRegistries(nextState);
    },
    [commitRegistries],
  );

  const unregister = useCallback(
    (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
      if (!isValidRegistryTarget(type, key)) return;

      const operation = createUnregisterOperation(type, key, sourceOrOptions);
      const currentState = registriesRef.current;
      if (!hasOperationEffect(currentState, operation)) return;

      const nextState = applyOperation(currentState, operation);
      commitRegistries(nextState);
    },
    [commitRegistries],
  );

  const batch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0;

      const timestamp = Date.now();
      const operations = [];

      const queue = {
        register: (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
          if (!isValidRegistryTarget(type, key)) return;
          operations.push(
            createRegisterOperation(type, key, item, sourceOrOptions, optionsArg, timestamp),
          );
        },
        unregister: (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
          if (!isValidRegistryTarget(type, key)) return;
          operations.push(createUnregisterOperation(type, key, sourceOrOptions));
        },
      };

      executor(queue);

      if (operations.length === 0) return 0;

      const { effectiveOperations, nextState } = resolveEffectiveOperations(
        registriesRef.current,
        operations,
      );
      if (effectiveOperations.length === 0) return 0;

      commitRegistries(nextState);

      return effectiveOperations.length;
    },
    [commitRegistries],
  );

  const getSnapshot = useCallback((type, key) => {
    const entry = registriesRef.current[type]?.[key];
    const snapshotKey = `${type}:${key}`;
    const cached = valueSnapshotsRef.current.get(snapshotKey);

    if (cached && cached.entry === entry) {
      return cached.value;
    }

    const value = resolveEntryValue(type, entry);
    valueSnapshotsRef.current.set(snapshotKey, { entry, value });
    return value;
  }, []);

  const getEntriesSnapshot = useCallback((type) => {
    const typeRegistry = registriesRef.current[type] || {};
    const cached = entrySnapshotsRef.current.get(type);

    if (cached?.typeRegistry === typeRegistry) {
      return cached.value;
    }

    const resolved = {};

    Object.keys(typeRegistry).forEach((key) => {
      const value = resolveEntryValue(type, typeRegistry[key]);
      if (value !== undefined) {
        resolved[key] = value;
      }
    });

    entrySnapshotsRef.current.set(type, { typeRegistry, value: resolved });
    return resolved;
  }, []);

  const actionsValue = useMemo(
    () => ({
      unregister,
      register,
      batch,
    }),
    [batch, register, unregister],
  );
  const subscriptionValue = useMemo(
    () => ({ getEntriesSnapshot, getSnapshot, subscribe }),
    [getEntriesSnapshot, getSnapshot, subscribe],
  );

  return (
    <RegistryActionsContext.Provider value={actionsValue}>
      <RegistrySubscriptionContext.Provider value={subscriptionValue}>
        {children}
      </RegistrySubscriptionContext.Provider>
    </RegistryActionsContext.Provider>
  );
}

export function useRegistryActions() {
  const context = useContext(RegistryActionsContext);
  return context ?? DEFAULT_REGISTRY_ACTIONS;
}

function useRegistrySubscription() {
  const context = useContext(RegistrySubscriptionContext);
  return context ?? DEFAULT_REGISTRY_SUBSCRIPTION;
}

export function useRegistryValue(type, key) {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToType = useCallback((listener) => subscribe(type, listener), [subscribe, type]);
  const getValue = useCallback(() => getSnapshot(type, key), [getSnapshot, key, type]);

  return useSyncExternalStore(subscribeToType, getValue, getValue);
}

export function useRegistryEntries(type) {
  const { getEntriesSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToType = useCallback((listener) => subscribe(type, listener), [subscribe, type]);
  const getEntries = useCallback(() => getEntriesSnapshot(type), [getEntriesSnapshot, type]);

  return useSyncExternalStore(subscribeToType, getEntries, getEntries);
}

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
          queue.register(REGISTRY_TYPES.MODAL, key, component, DYNAMIC_SOURCE, options);
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
          queue.register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options);
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
  return useRegistryValue(REGISTRY_TYPES.NAV_RUNTIME, 'default') || {};
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
          queue.register(REGISTRY_TYPES.CONTEXT_MENU, key, config, DYNAMIC_SOURCE, options);
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
