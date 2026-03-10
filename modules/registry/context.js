'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

const RegistryActionsContext = createContext(null)
const RegistryStateContext = createContext(null)

export const REGISTRY_TYPES = {
  CONTEXT_MENU: 'CONTEXT_MENU',
  BACKGROUND: 'BACKGROUND',
  CONTROLS: 'CONTROLS',
  LOADING: 'LOADING',
  THEME: 'THEME',
  MODAL: 'MODAL',
  NAV: 'NAV',
}

const MERGE_TYPES = new Set([REGISTRY_TYPES.NAV])

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  )
    return false
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    )
      return false
  }
  return true
}

export function RegistryProvider({ children }) {
  const [registries, setRegistries] = useState({
    [REGISTRY_TYPES.CONTEXT_MENU]: {},
    [REGISTRY_TYPES.BACKGROUND]: {},
    [REGISTRY_TYPES.CONTROLS]: {},
    [REGISTRY_TYPES.LOADING]: {},
    [REGISTRY_TYPES.THEME]: {},
    [REGISTRY_TYPES.MODAL]: {},
    [REGISTRY_TYPES.NAV]: {},
  })

  const register = useCallback((type, key, item, source = 'dynamic') => {
    setRegistries((prev) => {
      const typeRegistry = prev[type] || {}
      const keyEntry = typeRegistry[key] || { static: null, dynamic: null }

      const existing = keyEntry[source]
      if (existing === item) return prev
      if (
        typeof existing === 'object' &&
        typeof item === 'object' &&
        shallowEqual(existing, item)
      )
        return prev

      return {
        ...prev,
        [type]: {
          ...typeRegistry,
          [key]: {
            ...keyEntry,
            [source]: item,
          },
        },
      }
    })
  }, [])

  const unregister = useCallback((type, key, source = 'dynamic') => {
    setRegistries((prev) => {
      const typeRegistry = prev[type]
      if (!typeRegistry || !typeRegistry[key]) return prev

      return {
        ...prev,
        [type]: {
          ...typeRegistry,
          [key]: {
            ...typeRegistry[key],
            [source]: null,
          },
        },
      }
    })
  }, [])

  const actionsValue = useMemo(
    () => ({ register, unregister }),
    [register, unregister]
  )

  const get = useCallback(
    (type, key) => {
      const entry = registries[type]?.[key]
      if (!entry) return undefined

      if (MERGE_TYPES.has(type)) {
        return { ...(entry.static || {}), ...(entry.dynamic || {}) }
      }
      return entry.dynamic || entry.static
    },
    [registries]
  )

  const getAll = useCallback(
    (type) => {
      const typeRegistry = registries[type] || {}
      const isMergeType = MERGE_TYPES.has(type)
      const result = {}

      Object.keys(typeRegistry).forEach((key) => {
        const { static: s, dynamic: d } = typeRegistry[key]
        if (isMergeType) {
          if (s || d) result[key] = { ...(s || {}), ...(d || {}) }
        } else {
          if (d || s) result[key] = d || s
        }
      })
      return result
    },
    [registries]
  )

  const stateValue = useMemo(
    () => ({ registries, get, getAll }),
    [registries, get, getAll]
  )

  return (
    <RegistryActionsContext.Provider value={actionsValue}>
      <RegistryStateContext.Provider value={stateValue}>
        {children}
      </RegistryStateContext.Provider>
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

function useModalRegistryActions() {
  const { register, unregister } = useRegistryActions()

  const modalRegister = useCallback(
    (key, component) =>
      register(REGISTRY_TYPES.MODAL, key, component, 'dynamic'),
    [register]
  )
  const modalUnregister = useCallback(
    (key) => unregister(REGISTRY_TYPES.MODAL, key, 'dynamic'),
    [unregister]
  )

  return useMemo(
    () => ({ register: modalRegister, unregister: modalUnregister }),
    [modalRegister, modalUnregister]
  )
}

export function useNavRegistryActions() {
  const { register, unregister } = useRegistryActions()

  const navRegister = useCallback(
    (key, config, source = 'dynamic') =>
      register(REGISTRY_TYPES.NAV, key, config, source),
    [register]
  )

  const navUnregister = useCallback(
    (key, source = 'dynamic') => unregister(REGISTRY_TYPES.NAV, key, source),
    [unregister]
  )

  return useMemo(
    () => ({ register: navRegister, unregister: navUnregister }),
    [navRegister, navUnregister]
  )
}

export function useModalRegistry() {
  const { get } = useRegistryState()
  const { register, unregister } = useModalRegistryActions()

  const modalGet = useCallback((key) => get(REGISTRY_TYPES.MODAL, key), [get])

  return useMemo(
    () => ({
      unregister,
      register,
      get: modalGet,
    }),
    [register, unregister, modalGet]
  )
}

export function useNavRegistry() {
  const { getAll, get } = useRegistryState()
  const { register, unregister } = useNavRegistryActions()

  const navGet = useCallback((key) => get(REGISTRY_TYPES.NAV, key), [get])
  const navGetAll = useCallback(() => getAll(REGISTRY_TYPES.NAV), [getAll])

  return useMemo(
    () => ({
      get: navGet,
      getAll: navGetAll,
      unregister,
      register,
    }),
    [register, unregister, navGet, navGetAll]
  )
}

export function useContextMenuRegistry() {
  const { getAll, get } = useRegistryState()
  const { register, unregister } = useRegistryActions()

  const contextMenuGet = useCallback(
    (key) => get(REGISTRY_TYPES.CONTEXT_MENU, key),
    [get]
  )

  const contextMenuGetAll = useCallback(
    () => getAll(REGISTRY_TYPES.CONTEXT_MENU),
    [getAll]
  )

  const contextMenuRegister = useCallback(
    (key, config) =>
      register(REGISTRY_TYPES.CONTEXT_MENU, key, config, 'dynamic'),
    [register]
  )

  const contextMenuUnregister = useCallback(
    (key) => unregister(REGISTRY_TYPES.CONTEXT_MENU, key, 'dynamic'),
    [unregister]
  )

  return useMemo(
    () => ({
      get: contextMenuGet,
      getAll: contextMenuGetAll,
      register: contextMenuRegister,
      unregister: contextMenuUnregister,
    }),
    [
      contextMenuGet,
      contextMenuGetAll,
      contextMenuRegister,
      contextMenuUnregister,
    ]
  )
}
