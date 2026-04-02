'use client'

import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react'

import { usePathname } from 'next/navigation'

import { useNavRegistry, useRegistry } from '@/modules/registry'
import { SettingsModal } from '@/modules/settings'

const NavigationActionsContext = createContext(undefined)
const NavigationStateContext = createContext(undefined)

function createSurfaceState(surfaceStack = []) {
  const activeSurface = surfaceStack[surfaceStack.length - 1] || null

  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: surfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack,
  }
}

const INITIAL_SURFACE_STATE = createSurfaceState([])

function createSurfaceError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function isSurfaceDescriptor(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !isValidElement(value)
  )
}

function createSurfaceEntryDefinition(input, config = {}) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (typeof input.component === 'function' ||
      Object.prototype.hasOwnProperty.call(input, 'content') ||
      Object.prototype.hasOwnProperty.call(input, 'node') ||
      Object.prototype.hasOwnProperty.call(input, 'element'))
      ? input
      : null

  const component =
    typeof descriptor?.component === 'function'
      ? descriptor.component
      : typeof input === 'function'
        ? input
        : null

  const content =
    descriptor?.content ?? descriptor?.node ?? descriptor?.element ?? null

  if (!component && content == null && !isValidElement(input)) {
    return null
  }

  return {
    renderMode: component ? 'component' : 'node',
    component,
    content: component ? null : content ?? input,
    props: component
      ? descriptor?.props && typeof descriptor.props === 'object'
        ? descriptor.props
        : config
      : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction: descriptor?.showAction ?? config?.showAction ?? false,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
  }
}

export function NavigationProvider({ children, config = {} }) {
  const pathname = usePathname()
  const [dismissedConfirmationKey, setDismissedConfirmationKey] = useState(null)
  const [guardConfirmation, setGuardConfirmation] = useState(null)
  const [expandedParents, setExpandedParents] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const [surfaceState, setSurfaceState] = useState(INITIAL_SURFACE_STATE)

  const { batch, getAll, register, unregister } = useNavRegistry()
  const previousPathRef = useRef(pathname)
  const surfaceStackRef = useRef([])
  const surfaceResolveMapRef = useRef(new Map())
  const surfaceOnCloseMapRef = useRef(new Map())
  const surfaceIdRef = useRef(0)

  useRegistry({
    modal: {
      SETTINGS_MODAL: SettingsModal,
    },
  })

  const navItems = useMemo(() => config?.items || {}, [config])

  useEffect(() => {
    const entries = Object.values(navItems).map((item) => [
      item.path || item.name,
      { ...item, isParent: !!item.children },
    ])

    if (entries.length === 0) return

    if (typeof batch === 'function') {
      batch((queue) => {
        entries.forEach(([key, item]) => {
          queue.register(key, item, 'static')
        })
      })
    } else {
      entries.forEach(([key, item]) => {
        register(key, item, 'static')
      })
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          entries.forEach(([key]) => {
            queue.unregister(key, 'static')
          })
        })
        return
      }

      entries.forEach(([key]) => {
        unregister(key, 'static')
      })
    }
  }, [batch, register, unregister, navItems])

  const toggleParent = useCallback((parentName) => {
    setExpandedParents((prev) => {
      if (prev.has(parentName)) {
        return new Set()
      }
      return new Set([parentName])
    })
  }, [])

  const isParentExpanded = useCallback(
    (parentName) => expandedParents.has(parentName),
    [expandedParents]
  )

  const expandParentForPath = useCallback(
    (pathname) => {
      Object.values(getAll()).forEach((item) => {
        if (item.children) {
          const hasChild = item.children.some(
            (child) => child.path === pathname
          )
          if (hasChild) {
            setExpandedParents((prev) => new Set([...prev, item.name]))
          }
        }
      })
    },
    [getAll]
  )

  useEffect(() => {
    if (!expanded) {
      setExpandedParents(new Set())
    }
  }, [expanded])

  const collapse = useCallback(() => {
    setExpanded(false)
  }, [])

  const expand = useCallback(() => {
    setExpanded(true)
  }, [])

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const dismissConfirmation = useCallback((key) => {
    if (!key) return
    setDismissedConfirmationKey(key)
  }, [])

  const clearDismissedConfirmation = useCallback(() => {
    setDismissedConfirmationKey(null)
  }, [])

  const clearGuardConfirmation = useCallback(() => {
    setGuardConfirmation(null)
  }, [])

  const syncSurfaceStack = useCallback((nextStack) => {
    surfaceStackRef.current = nextStack
    setSurfaceState(createSurfaceState(nextStack))
  }, [])

  const finalizeSurfaceClose = useCallback((surfaceId, result) => {
    const onClose = surfaceOnCloseMapRef.current.get(surfaceId)

    if (typeof onClose === 'function') {
      try {
        onClose(result)
      } catch (error) {
        console.error('Nav surface onClose handler failed:', error)
      }
    }

    surfaceOnCloseMapRef.current.delete(surfaceId)

    const resolve = surfaceResolveMapRef.current.get(surfaceId)

    if (typeof resolve === 'function') {
      resolve(result)
    }

    surfaceResolveMapRef.current.delete(surfaceId)
  }, [])

  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current

      if (currentStack.length === 0) {
        return
      }

      const surfaceId =
        targetSurfaceId || currentStack[currentStack.length - 1]?.id || null

      if (!surfaceId) {
        return
      }

      const surfaceToClose = currentStack.find((entry) => entry.id === surfaceId)

      if (!surfaceToClose) {
        return
      }

      const nextStack = currentStack.filter((entry) => entry.id !== surfaceId)
      syncSurfaceStack(nextStack)
      finalizeSurfaceClose(surfaceId, result)
    },
    [finalizeSurfaceClose, syncSurfaceStack]
  )

  const closeAllSurfaces = useCallback(
    (result = null) => {
      const currentStack = [...surfaceStackRef.current]

      if (currentStack.length === 0) {
        return
      }

      syncSurfaceStack([])
      currentStack.forEach((entry) => {
        finalizeSurfaceClose(entry.id, result)
      })
    },
    [finalizeSurfaceClose, syncSurfaceStack]
  )

  const openSurface = useCallback(
    (input, config = {}) => {
      const definition = createSurfaceEntryDefinition(input, config)

      if (!definition) {
        const error = createSurfaceError(
          'NAV_SURFACE_INVALID_COMPONENT',
          'Nav surface input is invalid'
        )
        console.error(error)
        return Promise.resolve({
          success: false,
          error,
        })
      }

      const surfaceId = ++surfaceIdRef.current
      const surfaceEntry = {
        id: surfaceId,
        ...definition,
      }

      setExpanded(false)
      setSearchQuery('')
      syncSurfaceStack([...surfaceStackRef.current, surfaceEntry])

      return new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve)
        surfaceOnCloseMapRef.current.set(surfaceId, config?.onClose || null)
      })
    },
    [setExpanded, setSearchQuery, syncSurfaceStack]
  )

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return
    }

    closeAllSurfaces({
      success: false,
      cancelled: true,
      reason: 'navigation',
    })

    previousPathRef.current = pathname
  }, [closeAllSurfaces, pathname])

  const stateValue = useMemo(
    () => ({
      dismissedConfirmationKey,
      guardConfirmation,
      ...surfaceState,
      expandedParents,
      searchQuery,
      navHeight,
      expanded,
      config,
    }),
    [
      dismissedConfirmationKey,
      guardConfirmation,
      surfaceState,
      expandedParents,
      searchQuery,
      navHeight,
      expanded,
      config,
    ]
  )

  const actionsValue = useMemo(
    () => ({
      clearDismissedConfirmation,
      clearGuardConfirmation,
      closeSurface,
      dismissConfirmation,
      expandParentForPath,
      isParentExpanded,
      openSurface,
      setGuardConfirmation,
      setSearchQuery,
      toggleParent,
      setNavHeight,
      setExpanded,
      collapse,
      expand,
      toggle,
    }),
    [
      clearDismissedConfirmation,
      clearGuardConfirmation,
      closeSurface,
      dismissConfirmation,
      expandParentForPath,
      isParentExpanded,
      openSurface,
      setGuardConfirmation,
      setSearchQuery,
      toggleParent,
      setNavHeight,
      setExpanded,
      collapse,
      expand,
      toggle,
    ]
  )

  return (
    <NavigationActionsContext.Provider value={actionsValue}>
      <NavigationStateContext.Provider value={stateValue}>
        {children}
      </NavigationStateContext.Provider>
    </NavigationActionsContext.Provider>
  )
}

export function useNavigationState() {
  const context = useContext(NavigationStateContext)
  if (context === undefined) {
    throw new Error(
      'useNavigationState must be used within a NavigationProvider'
    )
  }
  return context
}

export function useNavigationActions() {
  const context = useContext(NavigationActionsContext)
  if (context === undefined) {
    throw new Error(
      'useNavigationActions must be used within a NavigationProvider'
    )
  }
  return context
}

export function useNavigationContext() {
  const actions = useNavigationActions()
  const state = useNavigationState()
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}
