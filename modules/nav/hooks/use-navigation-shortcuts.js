'use client'

import { useCallback, useEffect } from 'react'

import { useOS } from '@/lib/hooks'

import { useNavigationContext } from '../context'

export const useNavigationShortcuts = ({ navigate, navigationItems } = {}) => {
  const os = useOS()
  const { setExpanded, toggleParent } = useNavigationContext()

  const handleKeyDown = useCallback(
    (e) => {
      if (os !== 'MacOS') return

      if (e.altKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        e.preventDefault()
        e.stopPropagation()
        setExpanded((prev) => !prev)
        return
      }

      if (e.altKey && /^Digit[1-9]$/.test(e.code)) {
        const digit = e.code.replace('Digit', '')
        const targetItem = navigationItems.find(
          (item) => item.shortcut === digit
        )

        if (targetItem) {
          e.preventDefault()
          if (targetItem.isParent || targetItem.children) {
            setExpanded(true)
            toggleParent(targetItem.name)
          } else if (targetItem.onClick) {
            targetItem.onClick()
            setExpanded(false)
          } else if (targetItem.path && navigate) {
            navigate(targetItem.path)
            setExpanded(false)
          }
        }
      }
    },
    [os, navigationItems, setExpanded, toggleParent, navigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [handleKeyDown])

  return {
    isMacOS: os === 'MacOS',
    shortcutSymbol: os === 'MacOS' ? '⌥' : 'Alt +',
  }
}
