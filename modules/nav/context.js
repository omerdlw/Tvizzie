'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import dynamic from 'next/dynamic'

import { NAV_CONFIG } from '@/config/nav.config'
import { useRegistry } from '@/lib/hooks/use-registry'
import { useNavRegistry } from '@/modules/registry/context'

const SettingsModal = dynamic(
  () => import('@/components/modals/settings-modal')
)
const GuardModal = dynamic(() => import('@/components/modals/guard-modal'))

const NavigationActionsContext = createContext(undefined)
const NavigationStateContext = createContext(undefined)

export function NavigationProvider({ children }) {
  const [expandedParents, setExpandedParents] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const config = NAV_CONFIG

  const { register, unregister } = useNavRegistry()

  useRegistry({
    modal: {
      NAV_GUARD_MODAL: GuardModal,
      SETTINGS_MODAL: SettingsModal,
    },
  })

  const navItems = useMemo(() => config?.items || {}, [config])

  useEffect(() => {
    Object.values(navItems).forEach((item) => {
      const key = item.path || item.name
      register(key, { ...item, isParent: !!item.children }, 'static')
    })

    return () => {
      Object.values(navItems).forEach((item) => {
        const key = item.path || item.name
        unregister(key, 'static')
      })
    }
  }, [register, unregister, navItems])

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
      Object.values(navItems).forEach((item) => {
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
    [navItems]
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

  const stateValue = useMemo(
    () => ({
      expandedParents,
      searchQuery,
      navHeight,
      expanded,
      config,
    }),
    [expandedParents, searchQuery, navHeight, expanded, config]
  )

  const actionsValue = useMemo(
    () => ({
      expandParentForPath,
      isParentExpanded,
      setSearchQuery,
      toggleParent,
      setNavHeight,
      setExpanded,
      collapse,
      expand,
      toggle,
    }),
    [
      expandParentForPath,
      isParentExpanded,
      toggleParent,
      setNavHeight,
      setSearchQuery,
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
