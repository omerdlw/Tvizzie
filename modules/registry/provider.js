'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import {
  applyOperation,
  createInitialRegistries,
  createRecordKey,
  createRegisterOperation,
  createResolverCache,
  createUnregisterOperation,
  hasOperationEffect,
  isValidRegistryTarget,
  resolveEffectiveOperations,
  resolveEntryValue,
} from './operations';
import {
  DEFAULT_SOURCE,
  REGISTRY_SOURCES,
  REGISTRY_VALIDATION_MODES,
  validateRegistryValue,
} from './contracts';
import { recordRegistryDiagnostic } from './diagnostics';

const NOOP = () => {};
const IDENTITY_SELECTOR = (value) => value;

const NOOP_HANDLE = (() => {
  const handle = () => {};
  handle.dispose = handle;
  handle.update = () => handle;
  Object.defineProperty(handle, 'active', { value: false });
  Object.defineProperty(handle, 'status', { value: 'rejected' });
  return handle;
})();

const DEFAULT_REGISTRY_ACTIONS = Object.freeze({
  batch: (fn) =>
    typeof fn === 'function' ? fn({ register: () => NOOP_HANDLE, unregister: NOOP }) : 0,
  register: () => NOOP_HANDLE,
  unregister: NOOP,
});

const DEFAULT_REGISTRY_SUBSCRIPTION = Object.freeze({
  getEntriesSnapshot: () => ({}),
  getSnapshot: () => null,
  subscribe: () => NOOP,
});

// ── Pure external store ──────────────────────────────────────────────────────

function useLazyRef(factory) {
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref;
}

function normalizeInitialEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.type && entry?.items && typeof entry.items === 'object',
  );
}

function createInitialState(entries) {
  const normalizedEntries = normalizeInitialEntries(entries);
  if (normalizedEntries.length === 0) return createInitialRegistries();

  const timestamp = Date.now();
  let sequence = 0;
  let state = createInitialRegistries();

  normalizedEntries.forEach((entry) => {
    const source = entry.source || REGISTRY_SOURCES.STATIC;
    const options = {
      ...(entry.options || {}),
      instanceId: entry.instanceId || entry.options?.instanceId || 'registry-initial',
    };

    Object.entries(entry.items).forEach(([key, value]) => {
      const validation = validateRegistryValue(entry.type, key, value);
      if (!validation.valid && options.validation === REGISTRY_VALIDATION_MODES.STRICT) {
        return;
      }
      const operation = createRegisterOperation(
        entry.type,
        key,
        value,
        source,
        options,
        timestamp,
        ++sequence,
      );
      if (hasOperationEffect(state, operation)) {
        state = applyOperation(state, operation);
      }
    });
  });

  return state;
}

function notifyListeners(listeners) {
  listeners?.forEach((listener) => listener());
}

function getOrCreateKeyListeners(listenersByType, type, key) {
  const listeners = listenersByType.get(type) || new Map();
  const keyListeners = listeners.get(key) || new Set();
  listeners.set(key, keyListeners);
  listenersByType.set(type, listeners);
  return keyListeners;
}

function resolveRegistrationOptions(sourceOrOptions, optionsArg) {
  if (sourceOrOptions && typeof sourceOrOptions === 'object') return sourceOrOptions;
  return optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
}

function validateRegistration(type, key, value, sourceOrOptions, optionsArg) {
  const validation = validateRegistryValue(type, key, value);
  if (validation.valid) return true;

  const options = resolveRegistrationOptions(sourceOrOptions, optionsArg);
  const isStrict = options.validation === REGISTRY_VALIDATION_MODES.STRICT;
  recordRegistryDiagnostic({
    action: isStrict ? 'reject' : 'validation-warning',
    issues: validation.issues,
    key,
    reason: 'invalid-value',
    type,
    validation: options.validation || REGISTRY_VALIDATION_MODES.WARN,
  });
  return !isStrict;
}

function createRegistrationHandle(store, operation) {
  let disposed = false;

  const dispose = (reason = 'manual') => {
    if (disposed) return false;
    disposed = true;
    store.dispose(operation, reason);
    return true;
  };
  const handle = (reason) => handle.dispose(reason);
  handle.dispose = dispose;
  handle.update = (value, options = {}) => {
    if (disposed || !store.isCurrent(operation)) return NOOP_HANDLE;

    const nextHandle = store.register(operation.type, operation.key, value, operation.source, {
      ...(options && typeof options === 'object' ? options : {}),
      instanceId: operation.instanceId,
      priority: operation.record.priority,
      ...(operation.validation ? { validation: operation.validation } : {}),
    });
    if (nextHandle === NOOP_HANDLE) return handle;

    disposed = true;
    return nextHandle;
  };
  Object.defineProperties(handle, {
    active: {
      enumerable: true,
      get: () => !disposed && store.isCurrent(operation),
    },
    instanceId: { enumerable: true, value: operation.instanceId },
    key: { enumerable: true, value: operation.key },
    priority: { enumerable: true, value: operation.record.priority },
    source: { enumerable: true, value: operation.source },
    status: {
      enumerable: true,
      get: () => (disposed ? 'disposed' : store.isCurrent(operation) ? 'active' : 'superseded'),
    },
    type: { enumerable: true, value: operation.type },
    updatedAt: { enumerable: true, value: operation.record.updatedAt },
    validation: { enumerable: true, value: operation.validation || 'warn' },
  });
  return handle;
}

/**
 * The Provider is a React adapter over this small external-store seam.
 * Keeping mutation and snapshot logic here makes behavior testable without a
 * DOM and keeps every consumer on the same immutable state machine.
 */
export function createRegistryStore(initialEntries = []) {
  let registries = createInitialState(initialEntries);
  let sequence = normalizeInitialEntries(initialEntries).reduce(
    (count, entry) => count + Object.keys(entry.items).length,
    0,
  );
  const listenersByType = new Map();
  const entrySnapshots = new Map();
  const valueSnapshots = new Map();
  const resolveCachedValue = createResolverCache();

  const subscribe = (type, key, listener) => {
    const keyListeners = getOrCreateKeyListeners(listenersByType, type, key ?? null);
    keyListeners.add(listener);

    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size > 0) return;
      const listeners = listenersByType.get(type);
      listeners?.delete(key ?? null);
      if (listeners?.size === 0) listenersByType.delete(type);
    };
  };

  const commit = (nextState) => {
    if (registries === nextState) return;
    const previousState = registries;
    registries = nextState;

    Object.keys(nextState).forEach((type) => {
      const previousRegistry = previousState[type] || {};
      const nextRegistry = nextState[type] || {};
      const changedKeys = new Set([...Object.keys(previousRegistry), ...Object.keys(nextRegistry)]);
      let typeChanged = false;

      changedKeys.forEach((key) => {
        if (previousRegistry[key] === nextRegistry[key]) return;
        typeChanged = true;
        notifyListeners(listenersByType.get(type)?.get(key));
      });

      if (typeChanged) {
        notifyListeners(listenersByType.get(type)?.get(null));
      }
    });
  };

  const isCurrent = (operation) => {
    const entry = registries[operation.type]?.[operation.key];
    const recordKey = createRecordKey(operation.source, operation.instanceId);
    return entry?.[recordKey] === operation.record;
  };

  const dispose = (operation, reason = 'manual') => {
    if (!isCurrent(operation)) return false;

    const unregisterOperation = createUnregisterOperation(operation.type, operation.key, {
      source: operation.source,
      instanceId: operation.instanceId,
    });
    if (!hasOperationEffect(registries, unregisterOperation)) return false;

    commit(applyOperation(registries, unregisterOperation));
    recordRegistryDiagnostic({
      action: 'dispose',
      instanceId: operation.instanceId,
      key: operation.key,
      reason,
      source: operation.source,
      type: operation.type,
    });
    return true;
  };

  const register = (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
    if (!isValidRegistryTarget(type, key)) {
      recordRegistryDiagnostic({ action: 'reject', key, reason: 'invalid-target', type });
      return NOOP_HANDLE;
    }
    if (!validateRegistration(type, key, item, sourceOrOptions, optionsArg)) {
      return NOOP_HANDLE;
    }

    const timestamp = Date.now();
    const operation = createRegisterOperation(
      type,
      key,
      item,
      sourceOrOptions,
      optionsArg,
      timestamp,
      ++sequence,
    );

    if (!hasOperationEffect(registries, operation)) {
      recordRegistryDiagnostic({
        action: 'ignore',
        instanceId: operation.instanceId,
        key,
        reason: 'unchanged',
        source: operation.source,
        type,
      });
      return NOOP_HANDLE;
    }

    commit(applyOperation(registries, operation));
    recordRegistryDiagnostic({
      action: 'register',
      instanceId: operation.instanceId,
      key,
      priority: operation.record.priority,
      source: operation.source,
      type,
    });
    return createRegistrationHandle(store, operation);
  };

  const unregister = (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
    if (!isValidRegistryTarget(type, key)) {
      recordRegistryDiagnostic({ action: 'reject', key, reason: 'invalid-target', type });
      return;
    }

    const operation = createUnregisterOperation(type, key, sourceOrOptions);
    if (!hasOperationEffect(registries, operation)) {
      recordRegistryDiagnostic({
        action: 'ignore',
        instanceId: operation.instanceId,
        key,
        reason: 'missing-record',
        source: operation.source,
        type,
      });
      return;
    }

    commit(applyOperation(registries, operation));
    recordRegistryDiagnostic({
      action: 'unregister',
      instanceId: operation.instanceId,
      key,
      source: operation.source,
      type,
    });
  };

  const batch = (executor) => {
    if (typeof executor !== 'function') return 0;

    const timestamp = Date.now();
    const operations = [];
    const queue = {
      register: (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
        if (!isValidRegistryTarget(type, key)) {
          recordRegistryDiagnostic({ action: 'reject', key, reason: 'invalid-target', type });
          return NOOP_HANDLE;
        }
        if (!validateRegistration(type, key, item, sourceOrOptions, optionsArg)) {
          return NOOP_HANDLE;
        }

        const operation = createRegisterOperation(
          type,
          key,
          item,
          sourceOrOptions,
          optionsArg,
          timestamp,
          ++sequence,
        );
        operations.push(operation);
        return createRegistrationHandle(store, operation);
      },
      unregister: (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
        if (!isValidRegistryTarget(type, key)) {
          recordRegistryDiagnostic({ action: 'reject', key, reason: 'invalid-target', type });
          return;
        }
        operations.push(createUnregisterOperation(type, key, sourceOrOptions));
      },
    };

    executor(queue);
    if (operations.length === 0) return 0;

    const { effectiveOperations, nextState } = resolveEffectiveOperations(registries, operations);
    if (effectiveOperations.length === 0) return 0;

    commit(nextState);
    effectiveOperations.forEach((operation) => {
      recordRegistryDiagnostic({
        action: operation.kind,
        instanceId: operation.instanceId,
        key: operation.key,
        priority: operation.record?.priority,
        source: operation.source,
        type: operation.type,
      });
    });
    return effectiveOperations.length;
  };

  const getSnapshot = (type, key) => {
    const entry = registries[type]?.[key];
    const snapshots = valueSnapshots.get(type) || new Map();
    const cached = snapshots.get(key);
    if (cached && cached.entry === entry) return cached.value;

    const value = resolveCachedValue(type, entry);
    snapshots.set(key, { entry, value });
    valueSnapshots.set(type, snapshots);
    return value;
  };

  const getEntriesSnapshot = (type) => {
    const typeRegistry = registries[type] || {};
    const cached = entrySnapshots.get(type);
    if (cached?.typeRegistry === typeRegistry) return cached.value;

    const resolved = {};
    Object.keys(typeRegistry).forEach((key) => {
      const value = resolveCachedValue(type, typeRegistry[key]);
      if (value !== undefined) resolved[key] = value;
    });
    entrySnapshots.set(type, { typeRegistry, value: resolved });
    return resolved;
  };

  const store = {
    batch,
    dispose,
    getEntriesSnapshot,
    getSnapshot,
    isCurrent,
    register,
    subscribe,
    unregister,
  };

  return store;
}

// ── React provider and selector hooks ────────────────────────────────────────

const RegistryActionsContext = createContext(null);
const RegistrySubscriptionContext = createContext(null);

export function RegistryProvider({ children, initialEntries = [] }) {
  const storeRef = useLazyRef(() => createRegistryStore(initialEntries));
  const actionsValue = useMemo(
    () => ({
      batch: storeRef.current.batch,
      register: storeRef.current.register,
      unregister: storeRef.current.unregister,
    }),
    [storeRef],
  );
  const subscriptionValue = useMemo(
    () => ({
      getEntriesSnapshot: storeRef.current.getEntriesSnapshot,
      getSnapshot: storeRef.current.getSnapshot,
      subscribe: storeRef.current.subscribe,
    }),
    [storeRef],
  );

  return createElement(
    RegistryActionsContext.Provider,
    { value: actionsValue },
    createElement(RegistrySubscriptionContext.Provider, { value: subscriptionValue }, children),
  );
}

export function useRegistryActions() {
  return useContext(RegistryActionsContext) ?? DEFAULT_REGISTRY_ACTIONS;
}

function useRegistrySubscription() {
  return useContext(RegistrySubscriptionContext) ?? DEFAULT_REGISTRY_SUBSCRIPTION;
}

export function useRegistryValue(type, key) {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToKey = useCallback(
    (listener) => subscribe(type, key, listener),
    [key, subscribe, type],
  );
  const getValue = useCallback(() => getSnapshot(type, key), [getSnapshot, key, type]);

  return useSyncExternalStore(subscribeToKey, getValue, getValue);
}

export function useRegistrySelector(type, key, selector = IDENTITY_SELECTOR, isEqual = Object.is) {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const resolvedSelector = typeof selector === 'function' ? selector : IDENTITY_SELECTOR;
  const resolvedIsEqual = typeof isEqual === 'function' ? isEqual : Object.is;
  const selectionRef = useRef(null);
  const subscribeToKey = useCallback(
    (listener) => subscribe(type, key, listener),
    [key, subscribe, type],
  );
  const getSelection = useCallback(() => {
    const snapshot = getSnapshot(type, key);
    const previous = selectionRef.current;
    if (
      previous &&
      previous.snapshot === snapshot &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual
    ) {
      return previous.value;
    }

    const nextValue = resolvedSelector(snapshot);
    if (
      previous &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual &&
      resolvedIsEqual(previous.value, nextValue)
    ) {
      selectionRef.current = { ...previous, snapshot };
      return previous.value;
    }

    selectionRef.current = {
      isEqual: resolvedIsEqual,
      selector: resolvedSelector,
      snapshot,
      value: nextValue,
    };
    return nextValue;
  }, [getSnapshot, key, resolvedIsEqual, resolvedSelector, type]);

  return useSyncExternalStore(subscribeToKey, getSelection, getSelection);
}

export function useRegistryEntries(type) {
  const { getEntriesSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToType = useCallback(
    (listener) => subscribe(type, null, listener),
    [subscribe, type],
  );
  const getEntries = useCallback(() => getEntriesSnapshot(type), [getEntriesSnapshot, type]);

  return useSyncExternalStore(subscribeToType, getEntries, getEntries);
}
