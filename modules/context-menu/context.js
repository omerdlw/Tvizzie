'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

const ContextMenuContext = createContext(null)

export function ContextMenuProvider({ children }) {
  const [menuConfig, setMenuConfig] = useState(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isOpen, setIsOpen] = useState(false)

  const openMenu = useCallback((config, x, y) => {
    setMenuConfig(config)
    setPosition({ x, y })
    setIsOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      menuConfig,
      position,
      isOpen,
      openMenu,
      closeMenu,
    }),
    [menuConfig, position, isOpen, openMenu, closeMenu]
  )

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
    </ContextMenuContext.Provider>
  )
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext)
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider')
  }
  return context
}
