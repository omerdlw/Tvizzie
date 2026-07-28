'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { DEFAULT_SOURCE, DYNAMIC_SOURCE, HISTORY_LIMIT, REGISTRY_TYPES } from './constants';
import {
  applyOperation,
  createRecordKey,
  createInitialRegistries,
  createRegisterOperation,
  createTimerKey,
  createUnregisterOperation,
  hasOperationEffect,
  isValidRegistryTarget,
  removeSourceRecord,
  resolveEffectiveOperations,
  resolveEntryValue,
  resolveHistoryLimit,
  runScopedBatch,
  summarizeHistoryValue,
  toSourceRecord,
} from './store';

const RegistryActionsContext = createContext(null);
const RegistryHistoryContext = createContext(null);
const RegistryStateContext = createContext(null);
const RegistrySubscriptionContext = createContext(null);

export { REGISTRY_TYPES };

export function RegistryProvider({ children, enableHistory = true }) {
  const historyEnabled = Boolean(enableHistory);
  const [registries, setRegistries] = useState(createInitialRegistries);
  const [historyVersion, setHistoryVersion] = useState(0);
  const registriesRef = useRef(registries);
  const expiryTimersRef = useRef(new Map());
  const historyRef = useRef([]);
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
    setRegistries(nextState);

    Object.keys(nextState).forEach((type) => {
      if (previousState[type] !== nextState[type]) {
        listenersRef.current.get(type)?.forEach((listener) => listener());
      }
    });
  }, []);

  const appendHistory = useCallback(
    (entry) => {
      if (!historyEnabled) return;

      const nextEntry = {
        timestamp: Date.now(),
        ...entry,
      };

      const nextHistory = [...historyRef.current, nextEntry];

      if (nextHistory.length > HISTORY_LIMIT) {
        historyRef.current = nextHistory.slice(nextHistory.length - HISTORY_LIMIT);
        setHistoryVersion((prev) => prev + 1);
        return;
      }

      historyRef.current = nextHistory;
      setHistoryVersion((prev) => prev + 1);
    },
    [historyEnabled],
  );

  const clearExpiryTimer = useCallback((type, key, source = DEFAULT_SOURCE, instanceId = null) => {
    const timerKey = createTimerKey(type, key, source, instanceId);
    const timeoutId = expiryTimersRef.current.get(timerKey);

    if (!timeoutId) return;

    clearTimeout(timeoutId);
    expiryTimersRef.current.delete(timerKey);
  }, []);

  const scheduleExpiry = useCallback(
    (type, key, source, record) => {
      clearExpiryTimer(type, key, source, record.instanceId);

      if (!record?.expiresAt) return;

      const timerKey = createTimerKey(type, key, source, record.instanceId);
      const delay = Math.max(0, record.expiresAt - Date.now());

      const timeoutId = setTimeout(() => {
        expiryTimersRef.current.delete(timerKey);

        const currentState = registriesRef.current;
        const currentRecord = toSourceRecord(
          currentState[type]?.[key]?.[createRecordKey(source, record.instanceId)],
          source,
        );

        if (!currentRecord || currentRecord.expiresAt !== record.expiresAt) {
          return;
        }

        const nextState = removeSourceRecord(currentState, type, key, source, record.instanceId);
        if (nextState === currentState) return;

        commitRegistries(nextState);

        appendHistory({
          action: 'expire',
          expiresAt: record.expiresAt,
          source,
          type,
          key,
        });
      }, delay);

      expiryTimersRef.current.set(timerKey, timeoutId);
    },
    [appendHistory, clearExpiryTimer, commitRegistries],
  );

  useEffect(() => {
    const expiryTimers = expiryTimersRef.current;

    return () => {
      expiryTimers.forEach((timeoutId) => clearTimeout(timeoutId));
      expiryTimers.clear();
    };
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
      scheduleExpiry(type, key, operation.source, operation.record);

      appendHistory({
        action: 'register',
        expiresAt: operation.record.expiresAt,
        payload: summarizeHistoryValue(operation.record.value),
        priority: operation.record.priority,
        source: operation.source,
        type,
        key,
      });
    },
    [appendHistory, commitRegistries, scheduleExpiry],
  );

  const unregister = useCallback(
    (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
      if (!isValidRegistryTarget(type, key)) return;

      const operation = createUnregisterOperation(type, key, sourceOrOptions);
      const currentState = registriesRef.current;
      if (!hasOperationEffect(currentState, operation)) return;

      const nextState = applyOperation(currentState, operation);
      clearExpiryTimer(type, key, operation.source, operation.instanceId);
      commitRegistries(nextState);

      appendHistory({
        action: 'unregister',
        source: operation.source,
        type,
        key,
      });
    },
    [appendHistory, clearExpiryTimer, commitRegistries],
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

      effectiveOperations.forEach((operation) => {
        if (operation.kind === 'register') {
          scheduleExpiry(operation.type, operation.key, operation.source, operation.record);
          return;
        }

        clearExpiryTimer(operation.type, operation.key, operation.source, operation.instanceId);
      });

      appendHistory({
        action: 'batch',
        count: effectiveOperations.length,
        operations: effectiveOperations.map((operation) => {
          if (operation.kind === 'register') {
            return {
              action: operation.kind,
              expiresAt: operation.record.expiresAt,
              payload: summarizeHistoryValue(operation.record.value),
              priority: operation.record.priority,
              source: operation.source,
              type: operation.type,
              key: operation.key,
            };
          }

          return {
            action: operation.kind,
            source: operation.source,
            type: operation.type,
            key: operation.key,
          };
        }),
      });

      return effectiveOperations.length;
    },
    [appendHistory, clearExpiryTimer, commitRegistries, scheduleExpiry],
  );

  const get = useCallback(
    (type, key) => {
      return resolveEntryValue(type, registries[type]?.[key]);
    },
    [registries],
  );

  const getAll = useCallback(
    (type) => {
      const typeRegistry = registries[type] || {};
      const resolved = {};

      Object.keys(typeRegistry).forEach((key) => {
        const value = resolveEntryValue(type, typeRegistry[key]);
        if (value !== undefined) {
          resolved[key] = value;
        }
      });

      return resolved;
    },
    [registries],
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

  const getHistory = useCallback(
    (limit = HISTORY_LIMIT) => {
      if (!historyEnabled) return [];

      return historyRef.current.slice(-resolveHistoryLimit(limit));
    },
    [historyEnabled],
  );

  const clearHistory = useCallback(() => {
    if (!historyEnabled) return;

    historyRef.current = [];
    setHistoryVersion((prev) => prev + 1);
  }, [historyEnabled]);

  const actionsValue = useMemo(
    () => ({
      clearHistory,
      unregister,
      getHistory,
      register,
      batch,
    }),
    [batch, clearHistory, getHistory, register, unregister],
  );

  const stateValue = useMemo(() => ({ registries, get, getAll }), [registries, get, getAll]);
  const subscriptionValue = useMemo(
    () => ({ getEntriesSnapshot, getSnapshot, subscribe }),
    [getEntriesSnapshot, getSnapshot, subscribe],
  );

  const historyValue = useMemo(
    () => ({
      clearHistory,
      enabled: historyEnabled,
      getHistory,
      historyVersion,
    }),
    [clearHistory, getHistory, historyEnabled, historyVersion],
  );

  return (
    <RegistryActionsContext.Provider value={actionsValue}>
      <RegistryHistoryContext.Provider value={historyValue}>
        <RegistrySubscriptionContext.Provider value={subscriptionValue}>
          <RegistryStateContext.Provider value={stateValue}>
            {children}
          </RegistryStateContext.Provider>
        </RegistrySubscriptionContext.Provider>
      </RegistryHistoryContext.Provider>
    </RegistryActionsContext.Provider>
  );
}

export function useRegistryActions() {
  const context = useContext(RegistryActionsContext);
  if (!context) {
    throw new Error('useRegistryActions must be used within a RegistryProvider');
  }
  return context;
}

export function useRegistryState() {
  const context = useContext(RegistryStateContext);
  if (!context) {
    throw new Error('useRegistryState must be used within a RegistryProvider');
  }
  return context;
}

export function useRegistryContext() {
  const actions = useRegistryActions();
  const state = useRegistryState();
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}

function useRegistrySubscription() {
  const context = useContext(RegistrySubscriptionContext);
  if (!context) {
    throw new Error('Registry selector hooks must be used within a RegistryProvider');
  }
  return context;
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

export function useRegistryHistory(limit = HISTORY_LIMIT) {
  const context = useContext(RegistryHistoryContext);

  if (!context) {
    throw new Error('useRegistryHistory must be used within a RegistryProvider');
  }

  const { clearHistory, enabled, getHistory } = context;

  const history = getHistory(limit);

  const resetHistory = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  return useMemo(
    () => ({
      clearHistory: resetHistory,
      enabled,
      history,
    }),
    [enabled, history, resetHistory],
  );
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
