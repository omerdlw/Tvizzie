'use client';

import {
  Children,
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname } from 'next/navigation';
import { validateNavConfig } from '@/modules/nav';

export const REGISTRY_TYPES = Object.freeze({
  CONTEXT_MENU: 'CONTEXT_MENU',
  BACKGROUND: 'BACKGROUND',
  LOADING: 'LOADING',
  MODAL: 'MODAL',
  NAV: 'NAV',
  NAV_RUNTIME: 'NAV_RUNTIME',
});

export const REGISTRY_RESOLVERS = Object.freeze({
  [REGISTRY_TYPES.NAV]: 'merge',
  [REGISTRY_TYPES.NAV_RUNTIME]: 'merge',
});

const REGISTRY_TYPE_VALUES = new Set(Object.values(REGISTRY_TYPES));

export function isRegistryType(type) {
  return REGISTRY_TYPE_VALUES.has(type);
}

export const DEFAULT_SOURCE = 'dynamic';
export const DYNAMIC_SOURCE = 'dynamic';

const SOURCE_PRIORITY = Object.freeze({
  static: 100,
  dynamic: 200,
  user: 300,
});

const SOURCE_RANK = Object.freeze({
  static: 10,
  dynamic: 20,
  user: 30,
});

export function createInitialRegistries() {
  return {
    [REGISTRY_TYPES.CONTEXT_MENU]: {},
    [REGISTRY_TYPES.BACKGROUND]: {},
    [REGISTRY_TYPES.LOADING]: {},
    [REGISTRY_TYPES.MODAL]: {},
    [REGISTRY_TYPES.NAV]: {},
    [REGISTRY_TYPES.NAV_RUNTIME]: {},
  };
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwnProperty(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function resolveInstanceId(value) {
  if (isObject(value) && typeof value.instanceId === 'string') {
    return value.instanceId;
  }
  return null;
}

function resolveRegisterInput(sourceOrOptions, optionsArg) {
  if (typeof sourceOrOptions === 'string') {
    return {
      source: sourceOrOptions,
      options: isObject(optionsArg) ? optionsArg : {},
    };
  }

  if (isObject(sourceOrOptions)) {
    return {
      source: typeof sourceOrOptions.source === 'string' ? sourceOrOptions.source : DEFAULT_SOURCE,
      options: sourceOrOptions,
    };
  }

  return {
    source: DEFAULT_SOURCE,
    options: isObject(optionsArg) ? optionsArg : {},
  };
}

function resolveUnregisterInput(sourceOrOptions) {
  if (typeof sourceOrOptions === 'string') {
    return { instanceId: null, source: sourceOrOptions };
  }

  if (isObject(sourceOrOptions)) {
    return {
      instanceId: resolveInstanceId(sourceOrOptions),
      source: typeof sourceOrOptions.source === 'string' ? sourceOrOptions.source : DEFAULT_SOURCE,
    };
  }

  return { instanceId: null, source: DEFAULT_SOURCE };
}

function buildSourceRecord({ source, value, instanceId = null, priority, timestamp }) {
  return {
    updatedAt: timestamp,
    instanceId: typeof instanceId === 'string' ? instanceId : null,
    priority,
    value,
    source,
  };
}

export function createRecordKey(source, instanceId = null) {
  return typeof instanceId === 'string' && instanceId.length > 0
    ? `${source}::${instanceId}`
    : source;
}

function getSourceRecords(entry, source) {
  return Object.entries(entry || [])
    .map(([recordKey, rawRecord]) => ({
      recordKey,
      record: toSourceRecord(rawRecord, source),
    }))
    .filter(({ record }) => record?.source === source);
}

function getSourceRecord(entry, source, instanceId = null) {
  const recordKey = createRecordKey(source, instanceId);
  return toSourceRecord(entry?.[recordKey], source);
}

function resolveRecordPriority(options, source) {
  if (isObject(options) && hasOwnProperty(options, 'priority')) {
    const parsedPriority = Number(options.priority);
    if (Number.isFinite(parsedPriority)) {
      return parsedPriority;
    }
  }

  return SOURCE_PRIORITY[source] ?? 0;
}

export function toSourceRecord(rawRecord, source = DEFAULT_SOURCE) {
  if (!rawRecord) return null;

  if (isObject(rawRecord) && hasOwnProperty(rawRecord, 'value')) {
    const parsedPriority = Number(rawRecord.priority);

    return {
      updatedAt: Number(rawRecord.updatedAt) || 0,
      instanceId: typeof rawRecord.instanceId === 'string' ? rawRecord.instanceId : null,
      priority: Number.isFinite(parsedPriority) ? parsedPriority : (SOURCE_PRIORITY[source] ?? 0),
      source: typeof rawRecord.source === 'string' ? rawRecord.source : source,
      value: rawRecord.value,
    };
  }

  return {
    updatedAt: 0,
    instanceId: null,
    priority: SOURCE_PRIORITY[source] ?? 0,
    source,
    value: rawRecord,
  };
}

function getSourceRank(source) {
  return SOURCE_RANK[source] ?? 0;
}

function compareRecords(a, b) {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  const rankDiff = getSourceRank(a.source) - getSourceRank(b.source);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  return a.updatedAt - b.updatedAt;
}

function recordsHaveSameValue(prevRecord, nextRecord) {
  if (Object.is(prevRecord?.value, nextRecord?.value)) return true;

  if (isObject(prevRecord?.value) && isObject(nextRecord?.value)) {
    return shallowEqual(prevRecord.value, nextRecord.value);
  }

  return false;
}

function hasRecordChanged(prevRecord, nextRecord) {
  if (!prevRecord) return true;
  if (prevRecord.priority !== nextRecord.priority) return true;
  if (prevRecord.source !== nextRecord.source) return true;
  if (prevRecord.instanceId !== nextRecord.instanceId) return true;
  if (!recordsHaveSameValue(prevRecord, nextRecord)) return true;
  return false;
}

function hasAnySourceRecord(entry) {
  return Object.entries(entry || {}).some(([, rawRecord]) => Boolean(rawRecord));
}

function setSourceRecord(state, type, key, source, record) {
  const typeRegistry = state[type] || {};
  const currentEntry = typeRegistry[key] || {};
  const recordKey = createRecordKey(source, record.instanceId);
  const prevRecord = toSourceRecord(currentEntry[recordKey], source);

  if (!hasRecordChanged(prevRecord, record)) {
    return state;
  }

  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: {
        ...currentEntry,
        [recordKey]: record,
      },
    },
  };
}

export function removeSourceRecord(state, type, key, source, instanceId = null) {
  const typeRegistry = state[type];
  const currentEntry = typeRegistry?.[key];
  if (!typeRegistry || !currentEntry) {
    return state;
  }

  const records =
    typeof instanceId === 'string' && instanceId.length > 0
      ? [
          {
            recordKey: createRecordKey(source, instanceId),
            record: getSourceRecord(currentEntry, source, instanceId),
          },
        ]
      : getSourceRecords(currentEntry, source);
  const activeRecords = records.filter(({ record }) => Boolean(record));

  if (activeRecords.length === 0) {
    return state;
  }

  const nextEntry = { ...currentEntry };
  activeRecords.forEach(({ recordKey }) => {
    delete nextEntry[recordKey];
  });

  if (!hasAnySourceRecord(nextEntry)) {
    const nextTypeRegistry = { ...typeRegistry };
    delete nextTypeRegistry[key];

    return {
      ...state,
      [type]: nextTypeRegistry,
    };
  }

  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: nextEntry,
    },
  };
}

function getResolverKind(type) {
  return REGISTRY_RESOLVERS[type] || 'priority';
}

function mergeNavValues(values) {
  return values.reduce((acc, value) => {
    const next = { ...acc, ...value };
    if (isObject(acc.style) && isObject(value.style)) {
      next.style = { ...acc.style, ...value.style };
      ['card', 'icon', 'title', 'description'].forEach((field) => {
        if (isObject(acc.style[field]) && isObject(value.style[field])) {
          next.style[field] = { ...acc.style[field], ...value.style[field] };
        }
      });
    }
    return next;
  }, {});
}

export function resolveEntryValue(type, entry) {
  if (!entry) return undefined;

  const activeRecords = Object.entries(entry)
    .map(([source, rawRecord]) => toSourceRecord(rawRecord, source))
    .filter(Boolean);

  if (activeRecords.length === 0) return undefined;

  if (getResolverKind(type) === 'merge') {
    const sortedRecords = [...activeRecords].sort(compareRecords);
    const mergeCandidate = sortedRecords.every((record) => isObject(record.value));

    if (mergeCandidate) {
      return type === REGISTRY_TYPES.NAV
        ? mergeNavValues(sortedRecords.map((record) => record.value))
        : sortedRecords.reduce(
            (acc, record) => ({
              ...acc,
              ...record.value,
            }),
            {},
          );
    }

    return sortedRecords[sortedRecords.length - 1].value;
  }

  let winner = activeRecords[0];

  for (let index = 1; index < activeRecords.length; index += 1) {
    const current = activeRecords[index];
    if (compareRecords(current, winner) > 0) {
      winner = current;
    }
  }

  return winner.value;
}

export function createRegisterOperation(type, key, item, sourceOrOptions, optionsArg, timestamp) {
  const { source, options } = resolveRegisterInput(sourceOrOptions, optionsArg);
  const instanceId = resolveInstanceId(options);
  const priority = resolveRecordPriority(options, source);
  const record = buildSourceRecord({
    source,
    value: item,
    instanceId,
    priority,
    timestamp,
  });

  return {
    kind: 'register',
    source,
    record,
    instanceId,
    type,
    key,
  };
}

export function createUnregisterOperation(type, key, sourceOrOptions) {
  const { source, instanceId } = resolveUnregisterInput(sourceOrOptions);

  return {
    kind: 'unregister',
    instanceId,
    source,
    type,
    key,
  };
}

export function isValidRegistryTarget(type, key) {
  return Boolean(isRegistryType(type) && typeof key === 'string' && key.length > 0);
}

export function applyOperation(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return state;
  }

  if (operation.kind === 'register') {
    return setSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.record,
    );
  }

  if (operation.kind === 'unregister') {
    return removeSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.instanceId,
    );
  }

  return state;
}

export function hasOperationEffect(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return false;
  }

  if (operation.kind === 'register') {
    const currentRecord = getSourceRecord(
      state[operation.type]?.[operation.key],
      operation.source,
      operation.instanceId,
    );

    return hasRecordChanged(currentRecord, operation.record);
  }

  if (operation.kind === 'unregister') {
    const entry = state[operation.type]?.[operation.key];
    if (typeof operation.instanceId === 'string' && operation.instanceId.length > 0) {
      return Boolean(getSourceRecord(entry, operation.source, operation.instanceId));
    }

    return getSourceRecords(entry, operation.source).length > 0;
  }

  return false;
}

export function resolveEffectiveOperations(state, operations) {
  const effectiveOperations = [];
  let nextState = state;

  operations.forEach((operation) => {
    if (!hasOperationEffect(nextState, operation)) return;
    effectiveOperations.push(operation);
    nextState = applyOperation(nextState, operation);
  });

  return { effectiveOperations, nextState };
}

export function runScopedBatch(batch, executor, createScopedQueue) {
  if (typeof executor !== 'function') {
    return 0;
  }

  return batch((queue) => {
    executor(createScopedQueue(queue));
  });
}

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

  return createElement(
    RegistryActionsContext.Provider,
    { value: actionsValue },
    createElement(RegistrySubscriptionContext.Provider, { value: subscriptionValue }, children),
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

const backgroundPlugin = {
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
};

const contextMenuPlugin = {
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
};

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

const loadingPlugin = {
  name: 'loading',
  apply: (config, context) => {
    const { instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const loading = config?.loading;
    if (!loading) return;

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(loading, {
      defaultCleanupDelayMs: 600,
    });

    const cleanupKey = createScopedCleanupKey(source, instanceId);
    clearCleanupTimer(cleanupScope, cleanupKey);

    register(REGISTRY_TYPES.LOADING, 'page-loading', payload, source, registerOptions);

    return () => {
      scheduleCleanup(cleanupScope, cleanupKey, () => {
        unregister(REGISTRY_TYPES.LOADING, 'page-loading', {
          source,
          instanceId,
        });
      }, cleanupDelayMs);
    };
  },
};

const modalPlugin = {
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

    const validation = validateNavConfig(navItem);
    if (!validation.valid) {
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
        console.error('[Registry] Failed to clean up registration:', error);
      }
    });
  };
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useStableDiff(value, compareFn) {
  const ref = useRef(value);

  if (!compareFn(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

function createStableFunctionEntry(fn) {
  const entry = {
    current: fn,
    stable(...args) {
      return entry.current?.apply(this, args);
    },
  };

  return entry;
}

function isDirectRegistryComponentPath(path) {
  return /^config\.(modal|modals)\.[^.[]+$/.test(path);
}

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

function isReactNodeLike(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    isValidElement(value)
  );
}

function stabilizeRegistryValue(value, path, functionEntries, usedPaths) {
  if (typeof value === 'function') {
    const isComponent = value.name && /^[A-Z]/.test(value.name);

    if (isComponent || isDirectRegistryComponentPath(path)) {
      return value;
    }

    usedPaths.add(path);

    let entry = functionEntries.get(path);

    if (!entry) {
      entry = createStableFunctionEntry(value);
      functionEntries.set(path, entry);
    } else {
      entry.current = value;
    }

    return entry.stable;
  }

  if (isValidElement(value)) {
    const nextProps = stabilizeRegistryValue(
      value.props,
      `${path}.props`,
      functionEntries,
      usedPaths,
    );

    return cloneElement(value, nextProps);
  }

  if (Array.isArray(value)) {
    const nextValue = value.every(isReactNodeLike) ? Children.toArray(value) : value;

    return nextValue.map((item, index) =>
      stabilizeRegistryValue(item, `${path}[${index}]`, functionEntries, usedPaths),
    );
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.keys(value).reduce((acc, key) => {
    acc[key] = stabilizeRegistryValue(value[key], `${path}.${key}`, functionEntries, usedPaths);
    return acc;
  }, {});
}

function useStabilizedRegistryConfig(config) {
  const functionEntriesRef = useRef(new Map());

  return useMemo(() => {
    const usedPaths = new Set();
    const stabilizedConfig = stabilizeRegistryValue(
      config,
      'config',
      functionEntriesRef.current,
      usedPaths,
    );

    functionEntriesRef.current.forEach((_entry, path) => {
      if (!usedPaths.has(path)) {
        functionEntriesRef.current.delete(path);
      }
    });

    return stabilizedConfig;
  }, [config]);
}

const deepCompare = (prev, next) => {
  if (Object.is(prev, next)) return true;

  if (typeof prev !== 'object' || prev === null || typeof next !== 'object' || next === null) {
    return false;
  }

  if (isValidElement(prev) && isValidElement(next)) {
    return prev.type === next.type && prev.key === next.key && deepCompare(prev.props, next.props);
  }

  if (Array.isArray(prev) !== Array.isArray(next)) return false;

  const keys1 = Object.keys(prev);
  const keys2 = Object.keys(next);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(next, key) || !deepCompare(prev[key], next[key])) {
      return false;
    }
  }

  return true;
};

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

            queue.register(type, key, item, resolvedSourceOrOptions, resolvedOptionsArg);
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

  const stabilizedConfig = useStabilizedRegistryConfig(config);
  const stableConfig = useStableDiff(stabilizedConfig, deepCompare);

  useIsomorphicLayoutEffect(() => {
    return applyRegistryConfig(stableConfig, context);
  }, [stableConfig, context]);
}

export function RegistryBootstrap({ entries = [] }) {
  const { batch } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useEffect(() => {
    const normalizedEntries = entries.filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === 'object',
    );

    if (normalizedEntries.length === 0) return undefined;

    const registerEntry = (queue, entry) => {
      const source = entry.source || 'static';
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.entries(entry.items).forEach(([key, value]) => {
        queue.register(entry.type, key, value, source, options);
      });
    };

    const unregisterEntry = (queue, entry) => {
      const source = entry.source || 'static';
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.keys(entry.items).forEach((key) => {
        queue.unregister(entry.type, key, { ...options, source });
      });
    };

    batch((queue) => {
      normalizedEntries.forEach((entry) => registerEntry(queue, entry));
    });

    return () => {
      batch((queue) => {
        normalizedEntries.forEach((entry) => unregisterEntry(queue, entry));
      });
    };
  }, [batch, entries]);

  return null;
}

export function createRouteRegistry({ displayName = 'RouteRegistry', resolveConfig }) {
  function RouteRegistry(props) {
    const config = typeof resolveConfig === 'function' ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
