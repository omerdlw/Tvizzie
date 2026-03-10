'use client'

import { useCallback, useEffect, useRef } from 'react'

import { createPortal } from 'react-dom'

import { Z_INDEX } from '@/lib/constants'
import { useContextMenuRegistry } from '@/modules/registry/context'
import Icon from '@/ui/icon'

import { useContextMenu } from './context'

const DEFAULT_CLASS_NAMES = {
  overlay: '',
  content: '',
  item: '',
  itemIcon: '',
  itemLabel: '',
  itemDanger: '',
  separator: '',
}

function ContextMenuItem({ item, classNames, onClose }) {
  const handleClick = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      item.onClick?.(e)
      onClose()
    },
    [item, onClose]
  )

  if (item.type === 'separator') {
    return <div className={classNames.separator} />
  }

  const itemClassName = [classNames.item, item.danger && classNames.itemDanger]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={itemClassName} onClick={handleClick} type="button">
      {item.icon && (
        <Icon icon={item.icon} className={classNames.itemIcon} size={16} />
      )}
      <span className={classNames.itemLabel}>{item.label}</span>
    </button>
  )
}

function ContextMenuContent({ config, position, onClose }) {
  const menuRef = useRef(null)
  const classNames = { ...DEFAULT_CLASS_NAMES, ...config.classNames }

  useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = position

    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10
    }

    menu.style.left = `${Math.max(10, x)}px`
    menu.style.top = `${Math.max(10, y)}px`
  }, [position])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <>
      <div className={classNames.overlay} onClick={onClose} />
      <div
        ref={menuRef}
        className={classNames.content}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: Z_INDEX.DEBUG_OVERLAY,
        }}
      >
        {config.items?.map((item, index) => (
          <ContextMenuItem
            key={item.key || `separator-${index}`}
            item={item}
            classNames={classNames}
            onClose={onClose}
          />
        ))}
      </div>
    </>
  )
}

export function ContextMenuRenderer() {
  const { menuConfig, position, isOpen, closeMenu } = useContextMenu()

  if (!isOpen || !menuConfig) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <ContextMenuContent
      config={menuConfig}
      position={position}
      onClose={closeMenu}
    />,
    document.body
  )
}

export function useContextMenuListener() {
  const { getAll } = useContextMenuRegistry()
  const { openMenu } = useContextMenu()

  useEffect(() => {
    const handleContextMenu = (e) => {
      const allMenus = getAll()
      const menuConfigs = Object.values(allMenus)

      const config = menuConfigs[0]

      if (config && config.items && config.items.length > 0) {
        e.preventDefault()
        openMenu(config, e.clientX, e.clientY)
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [getAll, openMenu])
}

export function ContextMenuGlobal() {
  useContextMenuListener()
  return <ContextMenuRenderer />
}

export { ContextMenuProvider, useContextMenu } from './context'
