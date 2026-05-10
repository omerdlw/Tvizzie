import { DEFAULT_SOURCE, HISTORY_LIMIT, REGISTRY_TYPES } from './constants';

const SOURCE_PRIORITY = {
  static: 100,
  dynamic: 200,
  user: 300,
};

const SOURCE_RANK = {
  static: 10,
  dynamic: 20,
  user: 30,
};

const RESOLVER_KIND = {
  [REGISTRY_TYPES.NAV]: 'merge',
};

export function createInitialRegistries() {
  return {
    [REGISTRY_TYPES.CONTEXT_MENU]: {},
    [REGISTRY_TYPES.BACKGROUND]: {},
    [REGISTRY_TYPES.LOADING]: {},
    [REGISTRY_TYPES.THEME]: {},
    [REGISTRY_TYPES.MODAL]: {},
    [REGISTRY_TYPES.NAV]: {},
  };
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

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
  if (!isObject(value)) {
    return null;
  }

  if (typeof value.instanceId === 'string') {
    return value.instanceId;
  }

  return null;
}

function normalizeTtlMs(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  if (isObject(sourceOrOptions) && typeof sourceOrOptions.source === 'string') {
    return {
      instanceId: resolveInstanceId(sourceOrOptions),
      source: sourceOrOptions.source,
    };
  }

  if (isObject(sourceOrOptions)) {
    return {
      instanceId: resolveInstanceId(sourceOrOptions),
      source: DEFAULT_SOURCE,
    };
  }

  return { instanceId: null, source: DEFAULT_SOURCE };
}

function buildSourceRecord({ source, value, instanceId = null, priority, timestamp, ttlMs }) {
  return {
    updatedAt: timestamp,
    expiresAt: ttlMs ? timestamp + ttlMs : null,
    instanceId: typeof instanceId === 'string' ? instanceId : null,
    priority,
    value,
    source,
  };
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

export function summarizeHistoryValue(value) {
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      size: value.length,
    };
  }

  if (isObject(value)) {
    const keys = Object.keys(value);
    return {
      kind: 'object',
      keys: keys.slice(0, 8),
      size: keys.length,
    };
  }

  if (typeof value === 'string') {
    return {
      kind: 'string',
      size: value.length,
      value: value.slice(0, 120),
    };
  }

  if (typeof value === 'function') {
    return { kind: 'function' };
  }

  return {
    kind: typeof value,
    value,
  };
}

export function toSourceRecord(rawRecord, source = DEFAULT_SOURCE) {
  if (!rawRecord) return null;

  if (isObject(rawRecord) && hasOwnProperty(rawRecord, 'value')) {
    const parsedPriority = Number(rawRecord.priority);

    return {
      updatedAt: Number(rawRecord.updatedAt) || 0,
      expiresAt: Number(rawRecord.expiresAt) > 0 ? Number(rawRecord.expiresAt) : null,
      instanceId: typeof rawRecord.instanceId === 'string' ? rawRecord.instanceId : null,
      priority: Number.isFinite(parsedPriority) ? parsedPriority : (SOURCE_PRIORITY[source] ?? 0),
      source: typeof rawRecord.source === 'string' ? rawRecord.source : source,
      value: rawRecord.value,
    };
  }

  return {
    updatedAt: 0,
    expiresAt: null,
    instanceId: null,
    priority: SOURCE_PRIORITY[source] ?? 0,
    source,
    value: rawRecord,
  };
}

function isRecordExpired(record, now = Date.now()) {
  return Number(record?.expiresAt) > 0 && now >= Number(record.expiresAt);
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
  if (prevRecord.expiresAt !== nextRecord.expiresAt) return true;
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
  const prevRecord = toSourceRecord(currentEntry[source], source);

  if (!hasRecordChanged(prevRecord, record)) {
    return state;
  }

  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: {
        ...currentEntry,
        [source]: record,
      },
    },
  };
}

export function removeSourceRecord(state, type, key, source, instanceId = null) {
  const typeRegistry = state[type];
  const currentEntry = typeRegistry?.[key];
  const currentRecord = toSourceRecord(currentEntry?.[source], source);

  if (!typeRegistry || !currentEntry || !currentRecord) {
    return state;
  }

  if (typeof instanceId === 'string' && instanceId.length > 0 && currentRecord.instanceId !== instanceId) {
    return state;
  }

  const nextEntry = {
    ...currentEntry,
    [source]: null,
  };

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
  return RESOLVER_KIND[type] || 'priority';
}

export function resolveEntryValue(type, entry, now = Date.now()) {
  if (!entry) return undefined;

  const activeRecords = Object.entries(entry)
    .map(([source, rawRecord]) => toSourceRecord(rawRecord, source))
    .filter((record) => record && !isRecordExpired(record, now));

  if (activeRecords.length === 0) return undefined;

  if (getResolverKind(type) === 'merge') {
    const sortedRecords = [...activeRecords].sort(compareRecords);
    const mergeCandidate = sortedRecords.every((record) => isObject(record.value));

    if (mergeCandidate) {
      return sortedRecords.reduce(
        (acc, record) => ({
          ...acc,
          ...record.value,
        }),
        {}
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

export function createTimerKey(type, key, source) {
  return `${type}:${key}:${source}`;
}

export function createRegisterOperation(type, key, item, sourceOrOptions, optionsArg, timestamp) {
  const { source, options } = resolveRegisterInput(sourceOrOptions, optionsArg);
  const instanceId = resolveInstanceId(options);
  const ttlMs = normalizeTtlMs(options.ttlMs);
  const priority = resolveRecordPriority(options, source);
  const record = buildSourceRecord({
    source,
    value: item,
    instanceId,
    priority,
    timestamp,
    ttlMs,
  });

  return {
    kind: 'register',
    source,
    record,
    instanceId,
    type,
    key,
    ttlMs,
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
  return Boolean(type && key);
}

export function applyOperation(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return state;
  }

  if (operation.kind === 'register') {
    return setSourceRecord(state, operation.type, operation.key, operation.source, operation.record);
  }

  if (operation.kind === 'unregister') {
    return removeSourceRecord(state, operation.type, operation.key, operation.source, operation.instanceId);
  }

  return state;
}

export function hasOperationEffect(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return false;
  }

  if (operation.kind === 'register') {
    const currentRecord = toSourceRecord(state[operation.type]?.[operation.key]?.[operation.source], operation.source);

    return hasRecordChanged(currentRecord, operation.record);
  }

  if (operation.kind === 'unregister') {
    const currentRecord = toSourceRecord(state[operation.type]?.[operation.key]?.[operation.source], operation.source);

    if (!currentRecord) {
      return false;
    }

    if (
      typeof operation.instanceId === 'string' &&
      operation.instanceId.length > 0 &&
      currentRecord.instanceId !== operation.instanceId
    ) {
      return false;
    }

    return true;
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

export function resolveHistoryLimit(limit = HISTORY_LIMIT) {
  const parsedLimit = Number(limit);
  return Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : HISTORY_LIMIT;
}
