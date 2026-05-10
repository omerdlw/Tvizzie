'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { DEFAULT_SOURCE, DYNAMIC_SOURCE, HISTORY_LIMIT, REGISTRY_TYPES } from './constants';
import {
  applyOperation,
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

export { REGISTRY_TYPES };

export function RegistryProvider({ children, enableHistory = true }) {
  const historyEnabled = Boolean(enableHistory);
  const [registries, setRegistries] = useState(createInitialRegistries);
  const [historyVersion, setHistoryVersion] = useState(0);
  const registriesRef = useRef(registries);
  const expiryTimersRef = useRef(new Map());
  const historyRef = useRef([]);

  const commitRegistries = useCallback((nextState) => {
    registriesRef.current = nextState;
    setRegistries(nextState);
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
    [historyEnabled]
  );

  const clearExpiryTimer = useCallback((type, key, source = DEFAULT_SOURCE) => {
    const timerKey = createTimerKey(type, key, source);
    const timeoutId = expiryTimersRef.current.get(timerKey);

    if (!timeoutId) return;

    clearTimeout(timeoutId);
    expiryTimersRef.current.delete(timerKey);
  }, []);

  const scheduleExpiry = useCallback(
    (type, key, source, record) => {
      clearExpiryTimer(type, key, source);

      if (!record?.expiresAt) return;

      const timerKey = createTimerKey(type, key, source);
      const delay = Math.max(0, record.expiresAt - Date.now());

      const timeoutId = setTimeout(() => {
        expiryTimersRef.current.delete(timerKey);

        const currentState = registriesRef.current;
        const currentRecord = toSourceRecord(currentState[type]?.[key]?.[source], source);

        if (!currentRecord || currentRecord.expiresAt !== record.expiresAt) {
          return;
        }

        const nextState = removeSourceRecord(currentState, type, key, source);
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
    [appendHistory, clearExpiryTimer, commitRegistries]
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
      const operation = createRegisterOperation(type, key, item, sourceOrOptions, optionsArg, timestamp);

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
    [appendHistory, commitRegistries, scheduleExpiry]
  );

  const unregister = useCallback(
    (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
      if (!isValidRegistryTarget(type, key)) return;

      const operation = createUnregisterOperation(type, key, sourceOrOptions);
      const currentState = registriesRef.current;
      if (!hasOperationEffect(currentState, operation)) return;

      const nextState = applyOperation(currentState, operation);
      clearExpiryTimer(type, key, operation.source);
      commitRegistries(nextState);

      appendHistory({
        action: 'unregister',
        source: operation.source,
        type,
        key,
      });
    },
    [appendHistory, clearExpiryTimer, commitRegistries]
  );

  const batch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0;

      const timestamp = Date.now();
      const operations = [];

      const queue = {
        register: (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
          if (!isValidRegistryTarget(type, key)) return;
          operations.push(createRegisterOperation(type, key, item, sourceOrOptions, optionsArg, timestamp));
        },
        unregister: (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
          if (!isValidRegistryTarget(type, key)) return;
          operations.push(createUnregisterOperation(type, key, sourceOrOptions));
        },
      };

      executor(queue);

      if (operations.length === 0) return 0;

      const { effectiveOperations, nextState } = resolveEffectiveOperations(registriesRef.current, operations);
      if (effectiveOperations.length === 0) return 0;

      commitRegistries(nextState);

      effectiveOperations.forEach((operation) => {
        if (operation.kind === 'register') {
          scheduleExpiry(operation.type, operation.key, operation.source, operation.record);
          return;
        }

        clearExpiryTimer(operation.type, operation.key, operation.source);
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
    [appendHistory, clearExpiryTimer, commitRegistries, scheduleExpiry]
  );

  const get = useCallback(
    (type, key) => {
      return resolveEntryValue(type, registries[type]?.[key]);
    },
    [registries]
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
    [registries]
  );

  const getHistory = useCallback(
    (limit = HISTORY_LIMIT) => {
      if (!historyEnabled) return [];

      return historyRef.current.slice(-resolveHistoryLimit(limit));
    },
    [historyEnabled]
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
    [batch, clearHistory, getHistory, register, unregister]
  );

  const stateValue = useMemo(() => ({ registries, get, getAll }), [registries, get, getAll]);

  const historyValue = useMemo(
    () => ({
      clearHistory,
      enabled: historyEnabled,
      getHistory,
      historyVersion,
    }),
    [clearHistory, getHistory, historyEnabled, historyVersion]
  );

  return (
    <RegistryActionsContext.Provider value={actionsValue}>
      <RegistryHistoryContext.Provider value={historyValue}>
        <RegistryStateContext.Provider value={stateValue}>{children}</RegistryStateContext.Provider>
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
    [enabled, history, resetHistory]
  );
}

function useModalRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();

  const modalRegister = useCallback(
    (key, component, options = {}) => register(REGISTRY_TYPES.MODAL, key, component, DYNAMIC_SOURCE, options),
    [register]
  );

  const modalUnregister = useCallback((key) => unregister(REGISTRY_TYPES.MODAL, key, DYNAMIC_SOURCE), [unregister]);

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
    [batch]
  );

  return useMemo(
    () => ({
      batch: modalBatch,
      register: modalRegister,
      unregister: modalUnregister,
    }),
    [modalBatch, modalRegister, modalUnregister]
  );
}

export function useNavRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();

  const navRegister = useCallback(
    (key, config, sourceOrOptions = DEFAULT_SOURCE, options = {}) =>
      register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options),
    [register]
  );

  const navUnregister = useCallback(
    (key, sourceOrOptions = DEFAULT_SOURCE) => unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions),
    [unregister]
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
    [batch]
  );

  return useMemo(
    () => ({
      batch: navBatch,
      register: navRegister,
      unregister: navUnregister,
    }),
    [navBatch, navRegister, navUnregister]
  );
}

export function useModalRegistry() {
  const { get } = useRegistryState();
  const { batch, register, unregister } = useModalRegistryActions();

  const modalGet = useCallback((key) => get(REGISTRY_TYPES.MODAL, key), [get]);

  return useMemo(
    () => ({
      batch,
      unregister,
      register,
      get: modalGet,
    }),
    [batch, register, unregister, modalGet]
  );
}

export function useNavRegistry() {
  const { getAll, get } = useRegistryState();
  const { batch, register, unregister } = useNavRegistryActions();

  const navGet = useCallback((key) => get(REGISTRY_TYPES.NAV, key), [get]);
  const navGetAll = useCallback(() => getAll(REGISTRY_TYPES.NAV), [getAll]);

  return useMemo(
    () => ({
      batch,
      get: navGet,
      getAll: navGetAll,
      unregister,
      register,
    }),
    [batch, register, unregister, navGet, navGetAll]
  );
}

export function useContextMenuRegistry() {
  const { getAll, get } = useRegistryState();
  const { batch, register, unregister } = useRegistryActions();

  const contextMenuGet = useCallback((key) => get(REGISTRY_TYPES.CONTEXT_MENU, key), [get]);

  const contextMenuGetAll = useCallback(() => getAll(REGISTRY_TYPES.CONTEXT_MENU), [getAll]);

  const contextMenuRegister = useCallback(
    (key, config, options = {}) => register(REGISTRY_TYPES.CONTEXT_MENU, key, config, DYNAMIC_SOURCE, options),
    [register]
  );

  const contextMenuUnregister = useCallback(
    (key, sourceOrOptions = DYNAMIC_SOURCE) => unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions),
    [unregister]
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
    [batch]
  );

  return useMemo(
    () => ({
      batch: contextMenuBatch,
      get: contextMenuGet,
      getAll: contextMenuGetAll,
      register: contextMenuRegister,
      unregister: contextMenuUnregister,
    }),
    [contextMenuBatch, contextMenuGet, contextMenuGetAll, contextMenuRegister, contextMenuUnregister]
  );
}
