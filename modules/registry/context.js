'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'

const RegistryActionsContext = createContext(null)
const RegistryHistoryContext = createContext(null)
const RegistryStateContext = createContext(null)

export const REGISTRY_TYPES = {
  CONTEXT_MENU: 'CONTEXT_MENU',
  BACKGROUND: 'BACKGROUND',
  LOADING: 'LOADING',
  THEME: 'THEME',
  MODAL: 'MODAL',
  NAV: 'NAV',
}

const DEFAULT_SOURCE = 'dynamic'
const HISTORY_LIMIT = 300

const SOURCE_PRIORITY = {
  static: 100,
  dynamic: 200,
  user: 300,
}

const SOURCE_RANK = {
  static: 10,
  dynamic: 20,
  user: 30,
}

const RESOLVER_KIND = {
  [REGISTRY_TYPES.NAV]: 'merge',
}

function createInitialRegistries() {
  return {
    [REGISTRY_TYPES.CONTEXT_MENU]: {},
    [REGISTRY_TYPES.BACKGROUND]: {},
    [REGISTRY_TYPES.LOADING]: {},
    [REGISTRY_TYPES.THEME]: {},
    [REGISTRY_TYPES.MODAL]: {},
    [REGISTRY_TYPES.NAV]: {},
  }
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true

  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    ) {
      return false
    }
  }

  return true
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwnProperty(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
}

function normalizeTtlMs(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function resolveRegisterInput(sourceOrOptions, optionsArg) {
  if (typeof sourceOrOptions === 'string') {
    return {
      source: sourceOrOptions,
      options: isObject(optionsArg) ? optionsArg : {},
    }
  }

  if (isObject(sourceOrOptions)) {
    return {
      source:
        typeof sourceOrOptions.source === 'string'
          ? sourceOrOptions.source
          : DEFAULT_SOURCE,
      options: sourceOrOptions,
    }
  }

  return {
    source: DEFAULT_SOURCE,
    options: isObject(optionsArg) ? optionsArg : {},
  }
}

function resolveUnregisterInput(sourceOrOptions) {
  if (typeof sourceOrOptions === 'string') {
    return { source: sourceOrOptions }
  }

  if (isObject(sourceOrOptions) && typeof sourceOrOptions.source === 'string') {
    return { source: sourceOrOptions.source }
  }

  return { source: DEFAULT_SOURCE }
}

function buildSourceRecord({ source, value, priority, timestamp, ttlMs }) {
  return {
    updatedAt: timestamp,
    expiresAt: ttlMs ? timestamp + ttlMs : null,
    priority,
    value,
    source,
  }
}

function resolveRecordPriority(options, source) {
  if (isObject(options) && hasOwnProperty(options, 'priority')) {
    const parsedPriority = Number(options.priority)
    if (Number.isFinite(parsedPriority)) {
      return parsedPriority
    }
  }

  return SOURCE_PRIORITY[source] ?? 0
}

function summarizeHistoryValue(value) {
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      size: value.length,
    }
  }

  if (isObject(value)) {
    const keys = Object.keys(value)
    return {
      kind: 'object',
      keys: keys.slice(0, 8),
      size: keys.length,
    }
  }

  if (typeof value === 'string') {
    return {
      kind: 'string',
      size: value.length,
      value: value.slice(0, 120),
    }
  }

  if (typeof value === 'function') {
    return { kind: 'function' }
  }

  return {
    kind: typeof value,
    value,
  }
}

function toSourceRecord(rawRecord, source = DEFAULT_SOURCE) {
  if (!rawRecord) return null

  if (isObject(rawRecord) && hasOwnProperty(rawRecord, 'value')) {
    const parsedPriority = Number(rawRecord.priority)

    return {
      updatedAt: Number(rawRecord.updatedAt) || 0,
      expiresAt:
        Number(rawRecord.expiresAt) > 0 ? Number(rawRecord.expiresAt) : null,
      priority: Number.isFinite(parsedPriority)
        ? parsedPriority
        : (SOURCE_PRIORITY[source] ?? 0),
      source: typeof rawRecord.source === 'string' ? rawRecord.source : source,
      value: rawRecord.value,
    }
  }

  return {
    updatedAt: 0,
    expiresAt: null,
    priority: SOURCE_PRIORITY[source] ?? 0,
    source,
    value: rawRecord,
  }
}

function isRecordExpired(record, now = Date.now()) {
  return Number(record?.expiresAt) > 0 && now >= Number(record.expiresAt)
}

function getSourceRank(source) {
  return SOURCE_RANK[source] ?? 0
}

function compareRecords(a, b) {
  if (a.priority !== b.priority) {
    return a.priority - b.priority
  }

  const rankDiff = getSourceRank(a.source) - getSourceRank(b.source)
  if (rankDiff !== 0) {
    return rankDiff
  }

  return a.updatedAt - b.updatedAt
}

function recordsHaveSameValue(prevRecord, nextRecord) {
  if (Object.is(prevRecord?.value, nextRecord?.value)) return true

  if (isObject(prevRecord?.value) && isObject(nextRecord?.value)) {
    return shallowEqual(prevRecord.value, nextRecord.value)
  }

  return false
}

function hasRecordChanged(prevRecord, nextRecord) {
  if (!prevRecord) return true
  if (prevRecord.priority !== nextRecord.priority) return true
  if (prevRecord.expiresAt !== nextRecord.expiresAt) return true
  if (prevRecord.source !== nextRecord.source) return true
  if (!recordsHaveSameValue(prevRecord, nextRecord)) return true
  return false
}

function hasAnySourceRecord(entry) {
  return Object.entries(entry || {}).some(([, rawRecord]) => Boolean(rawRecord))
}

function setSourceRecord(state, type, key, source, record) {
  const typeRegistry = state[type] || {}
  const currentEntry = typeRegistry[key] || {}
  const prevRecord = toSourceRecord(currentEntry[source], source)

  if (!hasRecordChanged(prevRecord, record)) {
    return state
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
  }
}

function removeSourceRecord(state, type, key, source) {
  const typeRegistry = state[type]
  const currentEntry = typeRegistry?.[key]

  if (!typeRegistry || !currentEntry || !currentEntry[source]) {
    return state
  }

  const nextEntry = {
    ...currentEntry,
    [source]: null,
  }

  if (!hasAnySourceRecord(nextEntry)) {
    const nextTypeRegistry = { ...typeRegistry }
    delete nextTypeRegistry[key]

    return {
      ...state,
      [type]: nextTypeRegistry,
    }
  }

  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: nextEntry,
    },
  }
}

function getResolverKind(type) {
  return RESOLVER_KIND[type] || 'priority'
}

function resolveEntryValue(type, entry, now = Date.now()) {
  if (!entry) return undefined

  const activeRecords = Object.entries(entry)
    .map(([source, rawRecord]) => toSourceRecord(rawRecord, source))
    .filter((record) => record && !isRecordExpired(record, now))

  if (activeRecords.length === 0) return undefined

  if (getResolverKind(type) === 'merge') {
    const sortedRecords = [...activeRecords].sort(compareRecords)
    const mergeCandidate = sortedRecords.every((record) =>
      isObject(record.value)
    )

    if (mergeCandidate) {
      return sortedRecords.reduce(
        (acc, record) => ({
          ...acc,
          ...record.value,
        }),
        {}
      )
    }

    return sortedRecords[sortedRecords.length - 1].value
  }

  let winner = activeRecords[0]

  for (let index = 1; index < activeRecords.length; index += 1) {
    const current = activeRecords[index]
    if (compareRecords(current, winner) > 0) {
      winner = current
    }
  }

  return winner.value
}

function createTimerKey(type, key, source) {
  return `${type}:${key}:${source}`
}

function createRegisterOperation(
  type,
  key,
  item,
  sourceOrOptions,
  optionsArg,
  timestamp
) {
  const { source, options } = resolveRegisterInput(sourceOrOptions, optionsArg)
  const ttlMs = normalizeTtlMs(options.ttlMs)
  const priority = resolveRecordPriority(options, source)
  const record = buildSourceRecord({
    source,
    value: item,
    priority,
    timestamp,
    ttlMs,
  })

  return {
    kind: 'register',
    source,
    record,
    type,
    key,
    ttlMs,
  }
}

function createUnregisterOperation(type, key, sourceOrOptions) {
  const { source } = resolveUnregisterInput(sourceOrOptions)

  return {
    kind: 'unregister',
    source,
    type,
    key,
  }
}

function applyOperation(state, operation) {
  if (!operation?.type || !operation?.key) {
    return state
  }

  if (operation.kind === 'register') {
    return setSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.record
    )
  }

  if (operation.kind === 'unregister') {
    return removeSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source
    )
  }

  return state
}

function hasOperationEffect(state, operation) {
  if (!operation?.type || !operation?.key) {
    return false
  }

  if (operation.kind === 'register') {
    const currentRecord = toSourceRecord(
      state[operation.type]?.[operation.key]?.[operation.source],
      operation.source
    )

    return hasRecordChanged(currentRecord, operation.record)
  }

  if (operation.kind === 'unregister') {
    return Boolean(state[operation.type]?.[operation.key]?.[operation.source])
  }

  return false
}

function resolveEffectiveOperations(state, operations) {
  const effectiveOperations = []
  let nextState = state

  operations.forEach((operation) => {
    if (!hasOperationEffect(nextState, operation)) return
    effectiveOperations.push(operation)
    nextState = applyOperation(nextState, operation)
  })

  return { effectiveOperations, nextState }
}

export function RegistryProvider({ children, enableHistory = true }) {
  const historyEnabled = Boolean(enableHistory)
  const [registries, setRegistries] = useState(createInitialRegistries)
  const [historyVersion, setHistoryVersion] = useState(0)
  const registriesRef = useRef(registries)
  const expiryTimersRef = useRef(new Map())
  const historyRef = useRef([])

  const commitRegistries = useCallback((nextState) => {
    registriesRef.current = nextState
    setRegistries(nextState)
  }, [])

  const appendHistory = useCallback(
    (entry) => {
      if (!historyEnabled) return

      const nextEntry = {
        timestamp: Date.now(),
        ...entry,
      }

      const nextHistory = [...historyRef.current, nextEntry]

      if (nextHistory.length > HISTORY_LIMIT) {
        historyRef.current = nextHistory.slice(
          nextHistory.length - HISTORY_LIMIT
        )
        setHistoryVersion((prev) => prev + 1)
        return
      }

      historyRef.current = nextHistory
      setHistoryVersion((prev) => prev + 1)
    },
    [historyEnabled]
  )

  const clearExpiryTimer = useCallback((type, key, source = DEFAULT_SOURCE) => {
    const timerKey = createTimerKey(type, key, source)
    const timeoutId = expiryTimersRef.current.get(timerKey)

    if (!timeoutId) return

    clearTimeout(timeoutId)
    expiryTimersRef.current.delete(timerKey)
  }, [])

  const scheduleExpiry = useCallback(
    (type, key, source, record) => {
      clearExpiryTimer(type, key, source)

      if (!record?.expiresAt) return

      const timerKey = createTimerKey(type, key, source)
      const delay = Math.max(0, record.expiresAt - Date.now())

      const timeoutId = setTimeout(() => {
        expiryTimersRef.current.delete(timerKey)

        const currentState = registriesRef.current
        const currentRecord = toSourceRecord(
          currentState[type]?.[key]?.[source],
          source
        )

        if (!currentRecord || currentRecord.expiresAt !== record.expiresAt) {
          return
        }

        const nextState = removeSourceRecord(currentState, type, key, source)
        if (nextState === currentState) return

        commitRegistries(nextState)

        appendHistory({
          action: 'expire',
          expiresAt: record.expiresAt,
          source,
          type,
          key,
        })
      }, delay)

      expiryTimersRef.current.set(timerKey, timeoutId)
    },
    [appendHistory, clearExpiryTimer, commitRegistries]
  )

  useEffect(() => {
    const expiryTimers = expiryTimersRef.current

    return () => {
      expiryTimers.forEach((timeoutId) => clearTimeout(timeoutId))
      expiryTimers.clear()
    }
  }, [])

  const register = useCallback(
    (type, key, item, sourceOrOptions = DEFAULT_SOURCE, optionsArg = {}) => {
      if (!type || !key) return

      const timestamp = Date.now()
      const operation = createRegisterOperation(
        type,
        key,
        item,
        sourceOrOptions,
        optionsArg,
        timestamp
      )

      const currentState = registriesRef.current
      if (!hasOperationEffect(currentState, operation)) return

      const nextState = applyOperation(currentState, operation)
      commitRegistries(nextState)
      scheduleExpiry(type, key, operation.source, operation.record)

      appendHistory({
        action: 'register',
        expiresAt: operation.record.expiresAt,
        payload: summarizeHistoryValue(operation.record.value),
        priority: operation.record.priority,
        source: operation.source,
        type,
        key,
      })
    },
    [appendHistory, commitRegistries, scheduleExpiry]
  )

  const unregister = useCallback(
    (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
      if (!type || !key) return

      const operation = createUnregisterOperation(type, key, sourceOrOptions)
      const currentState = registriesRef.current
      if (!hasOperationEffect(currentState, operation)) return

      const nextState = applyOperation(currentState, operation)
      clearExpiryTimer(type, key, operation.source)
      commitRegistries(nextState)

      appendHistory({
        action: 'unregister',
        source: operation.source,
        type,
        key,
      })
    },
    [appendHistory, clearExpiryTimer, commitRegistries]
  )

  const batch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0

      const timestamp = Date.now()
      const operations = []

      const queue = {
        register: (
          type,
          key,
          item,
          sourceOrOptions = DEFAULT_SOURCE,
          optionsArg = {}
        ) => {
          if (!type || !key) return
          operations.push(
            createRegisterOperation(
              type,
              key,
              item,
              sourceOrOptions,
              optionsArg,
              timestamp
            )
          )
        },
        unregister: (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
          if (!type || !key) return
          operations.push(createUnregisterOperation(type, key, sourceOrOptions))
        },
      }

      executor(queue)

      if (operations.length === 0) return 0

      const { effectiveOperations, nextState } = resolveEffectiveOperations(
        registriesRef.current,
        operations
      )
      if (effectiveOperations.length === 0) return 0

      commitRegistries(nextState)

      effectiveOperations.forEach((operation) => {
        if (operation.kind === 'register') {
          scheduleExpiry(
            operation.type,
            operation.key,
            operation.source,
            operation.record
          )
          return
        }

        clearExpiryTimer(operation.type, operation.key, operation.source)
      })

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
            }
          }

          return {
            action: operation.kind,
            source: operation.source,
            type: operation.type,
            key: operation.key,
          }
        }),
      })

      return effectiveOperations.length
    },
    [appendHistory, clearExpiryTimer, commitRegistries, scheduleExpiry]
  )

  const get = useCallback(
    (type, key) => {
      return resolveEntryValue(type, registries[type]?.[key])
    },
    [registries]
  )

  const getAll = useCallback(
    (type) => {
      const typeRegistry = registries[type] || {}
      const resolved = {}

      Object.keys(typeRegistry).forEach((key) => {
        const value = resolveEntryValue(type, typeRegistry[key])
        if (value !== undefined) {
          resolved[key] = value
        }
      })

      return resolved
    },
    [registries]
  )

  const getHistory = useCallback(
    (limit = HISTORY_LIMIT) => {
      if (!historyEnabled) return []

      const parsedLimit = Number(limit)
      const safeLimit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.floor(parsedLimit)
          : HISTORY_LIMIT

      return historyRef.current.slice(-safeLimit)
    },
    [historyEnabled]
  )

  const clearHistory = useCallback(() => {
    if (!historyEnabled) return

    historyRef.current = []
    setHistoryVersion((prev) => prev + 1)
  }, [historyEnabled])

  const actionsValue = useMemo(
    () => ({
      clearHistory,
      unregister,
      getHistory,
      register,
      batch,
    }),
    [batch, clearHistory, getHistory, register, unregister]
  )

  const stateValue = useMemo(
    () => ({ registries, get, getAll }),
    [registries, get, getAll]
  )

  const historyValue = useMemo(
    () => ({
      clearHistory,
      enabled: historyEnabled,
      getHistory,
      historyVersion,
    }),
    [clearHistory, getHistory, historyEnabled, historyVersion]
  )

  return (
    <RegistryActionsContext.Provider value={actionsValue}>
      <RegistryHistoryContext.Provider value={historyValue}>
        <RegistryStateContext.Provider value={stateValue}>
          {children}
        </RegistryStateContext.Provider>
      </RegistryHistoryContext.Provider>
    </RegistryActionsContext.Provider>
  )
}

export function useRegistryActions() {
  const context = useContext(RegistryActionsContext)
  if (!context) {
    throw new Error('useRegistryActions must be used within a RegistryProvider')
  }
  return context
}

export function useRegistryState() {
  const context = useContext(RegistryStateContext)
  if (!context) {
    throw new Error('useRegistryState must be used within a RegistryProvider')
  }
  return context
}

export function useRegistryContext() {
  const actions = useRegistryActions()
  const state = useRegistryState()
  return useMemo(() => ({ ...actions, ...state }), [actions, state])
}

export function useRegistryHistory(limit = HISTORY_LIMIT) {
  const context = useContext(RegistryHistoryContext)

  if (!context) {
    throw new Error('useRegistryHistory must be used within a RegistryProvider')
  }

  const { clearHistory, enabled, getHistory } = context

  const history = getHistory(limit)

  const resetHistory = useCallback(() => {
    clearHistory()
  }, [clearHistory])

  return useMemo(
    () => ({
      clearHistory: resetHistory,
      enabled,
      history,
    }),
    [enabled, history, resetHistory]
  )
}

function useModalRegistryActions() {
  const { batch, register, unregister } = useRegistryActions()

  const modalRegister = useCallback(
    (key, component, options = {}) =>
      register(REGISTRY_TYPES.MODAL, key, component, 'dynamic', options),
    [register]
  )

  const modalUnregister = useCallback(
    (key) => unregister(REGISTRY_TYPES.MODAL, key, 'dynamic'),
    [unregister]
  )

  const modalBatch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0

      return batch((queue) => {
        executor({
          register: (key, component, options = {}) => {
            queue.register(
              REGISTRY_TYPES.MODAL,
              key,
              component,
              'dynamic',
              options
            )
          },
          unregister: (key) => {
            queue.unregister(REGISTRY_TYPES.MODAL, key, 'dynamic')
          },
        })
      })
    },
    [batch]
  )

  return useMemo(
    () => ({
      batch: modalBatch,
      register: modalRegister,
      unregister: modalUnregister,
    }),
    [modalBatch, modalRegister, modalUnregister]
  )
}

export function useNavRegistryActions() {
  const { batch, register, unregister } = useRegistryActions()

  const navRegister = useCallback(
    (key, config, sourceOrOptions = DEFAULT_SOURCE, options = {}) =>
      register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options),
    [register]
  )

  const navUnregister = useCallback(
    (key, sourceOrOptions = DEFAULT_SOURCE) =>
      unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions),
    [unregister]
  )

  const navBatch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0

      return batch((queue) => {
        executor({
          register: (
            key,
            config,
            sourceOrOptions = DEFAULT_SOURCE,
            options = {}
          ) => {
            queue.register(
              REGISTRY_TYPES.NAV,
              key,
              config,
              sourceOrOptions,
              options
            )
          },
          unregister: (key, sourceOrOptions = DEFAULT_SOURCE) => {
            queue.unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions)
          },
        })
      })
    },
    [batch]
  )

  return useMemo(
    () => ({
      batch: navBatch,
      register: navRegister,
      unregister: navUnregister,
    }),
    [navBatch, navRegister, navUnregister]
  )
}

export function useModalRegistry() {
  const { get } = useRegistryState()
  const { batch, register, unregister } = useModalRegistryActions()

  const modalGet = useCallback((key) => get(REGISTRY_TYPES.MODAL, key), [get])

  return useMemo(
    () => ({
      batch,
      unregister,
      register,
      get: modalGet,
    }),
    [batch, register, unregister, modalGet]
  )
}

export function useNavRegistry() {
  const { getAll, get } = useRegistryState()
  const { batch, register, unregister } = useNavRegistryActions()

  const navGet = useCallback((key) => get(REGISTRY_TYPES.NAV, key), [get])
  const navGetAll = useCallback(() => getAll(REGISTRY_TYPES.NAV), [getAll])

  return useMemo(
    () => ({
      batch,
      get: navGet,
      getAll: navGetAll,
      unregister,
      register,
    }),
    [batch, register, unregister, navGet, navGetAll]
  )
}

export function useContextMenuRegistry() {
  const { getAll, get } = useRegistryState()
  const { batch, register, unregister } = useRegistryActions()

  const contextMenuGet = useCallback(
    (key) => get(REGISTRY_TYPES.CONTEXT_MENU, key),
    [get]
  )

  const contextMenuGetAll = useCallback(
    () => getAll(REGISTRY_TYPES.CONTEXT_MENU),
    [getAll]
  )

  const contextMenuRegister = useCallback(
    (key, config, options = {}) =>
      register(REGISTRY_TYPES.CONTEXT_MENU, key, config, 'dynamic', options),
    [register]
  )

  const contextMenuUnregister = useCallback(
    (key, sourceOrOptions = 'dynamic') =>
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions),
    [unregister]
  )

  const contextMenuBatch = useCallback(
    (executor) => {
      if (typeof executor !== 'function') return 0

      return batch((queue) => {
        executor({
          register: (key, config, options = {}) => {
            queue.register(
              REGISTRY_TYPES.CONTEXT_MENU,
              key,
              config,
              'dynamic',
              options
            )
          },
          unregister: (key, sourceOrOptions = 'dynamic') => {
            queue.unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions)
          },
        })
      })
    },
    [batch]
  )

  return useMemo(
    () => ({
      batch: contextMenuBatch,
      get: contextMenuGet,
      getAll: contextMenuGetAll,
      register: contextMenuRegister,
      unregister: contextMenuUnregister,
    }),
    [
      contextMenuBatch,
      contextMenuGet,
      contextMenuGetAll,
      contextMenuRegister,
      contextMenuUnregister,
    ]
  )
}
