'use client'

import { useCallback, useEffect, useRef } from 'react'

import { usePathname } from 'next/navigation'

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

const CURRENT_PAGE_KEY = 'current-page'
const GLOBAL_MENU_KEY = '*'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeMenuCandidates(registryMenus) {
  const entries = Object.entries(registryMenus || {})
  const candidates = []
  let order = 0

  entries.forEach(([registryKey, rawConfig]) => {
    if (!isObject(rawConfig)) return

    const { menus, ...sharedConfig } = rawConfig
    const sharedClassNames = sharedConfig.classNames || {}
    const sharedHasItems =
      Array.isArray(sharedConfig.items) && sharedConfig.items.length > 0

    if (sharedHasItems) {
      candidates.push({
        registryKey,
        config: sharedConfig,
        order: order++,
      })
    }

    const nestedMenus = toArray(menus).filter((menu) => isObject(menu))
    nestedMenus.forEach((menu) => {
      candidates.push({
        registryKey,
        config: {
          ...sharedConfig,
          ...menu,
          classNames: {
            ...sharedClassNames,
            ...(menu.classNames || {}),
          },
        },
        order: order++,
      })
    })

    if (!sharedHasItems && nestedMenus.length === 0) {
      candidates.push({
        registryKey,
        config: rawConfig,
        order: order++,
      })
    }
  })

  return candidates
}

function isPathAllowed(config, registryKey, pathname) {
  if (!pathname) return true

  const explicitPath = config.path
  if (typeof explicitPath === 'string' && explicitPath) {
    return explicitPath === pathname
  }

  const explicitPaths = toArray(config.paths || config.pathnames).filter(
    (path) => typeof path === 'string' && path
  )
  if (explicitPaths.length > 0) {
    return explicitPaths.includes(pathname)
  }

  const matcher = config.pathMatcher
  if (typeof matcher === 'function') {
    try {
      return Boolean(matcher(pathname))
    } catch {
      return false
    }
  }

  if (
    registryKey === pathname ||
    registryKey === CURRENT_PAGE_KEY ||
    registryKey === GLOBAL_MENU_KEY
  ) {
    return true
  }

  return false
}

function isWhenAllowed(config, event, pathname, targetElement) {
  if (typeof config.when === 'function') {
    try {
      return Boolean(config.when(event, { pathname, target: targetElement }))
    } catch {
      return false
    }
  }

  if (config.when === undefined) return true
  return Boolean(config.when)
}

function getMatchDepth(sourceElement, matchedElement) {
  let depth = 0
  let node = sourceElement

  while (node && node !== matchedElement) {
    node = node.parentElement
    depth += 1
  }

  return depth
}

function getTargetScore(config, targetElement) {
  const selectors = toArray(config.target).filter(
    (selector) => typeof selector === 'string' && selector.trim()
  )

  if (selectors.length === 0) return 0
  if (!targetElement) return null

  let minDepth = Infinity

  selectors.forEach((selector) => {
    let matchedElement = null
    try {
      matchedElement = targetElement.closest(selector)
    } catch {
      matchedElement = null
    }

    if (matchedElement) {
      const depth = getMatchDepth(targetElement, matchedElement)
      if (depth < minDepth) {
        minDepth = depth
      }
    }
  })

  if (minDepth === Infinity) return null
  return Math.max(0, 100 - minDepth)
}

function getRouteScore(config, registryKey, pathname) {
  if (!pathname) return 0

  if (
    config.path === pathname ||
    toArray(config.paths || config.pathnames).includes(pathname) ||
    registryKey === pathname
  ) {
    return 100
  }

  if (registryKey === CURRENT_PAGE_KEY) return 70
  if (registryKey === GLOBAL_MENU_KEY) return 40
  return 10
}

function resolveContextMenuConfig(registryMenus, pathname, event) {
  const candidates = normalizeMenuCandidates(registryMenus)
  const targetElement =
    event.target instanceof Element || event.target instanceof SVGElement
      ? event.target
      : null

  let winner = null

  candidates.forEach((candidate) => {
    const { config, registryKey, order } = candidate

    if (config.enabled === false) return
    if (!Array.isArray(config.items) || config.items.length === 0) return
    if (!isPathAllowed(config, registryKey, pathname)) return
    if (!isWhenAllowed(config, event, pathname, targetElement)) return

    const targetScore = getTargetScore(config, targetElement)
    if (targetScore === null) return

    const routeScore = getRouteScore(config, registryKey, pathname)
    const priority = Number.isFinite(Number(config.priority))
      ? Number(config.priority)
      : 0
    const score = priority * 10000 + routeScore * 100 + targetScore

    if (
      !winner ||
      score > winner.score ||
      (score === winner.score && order < winner.order)
    ) {
      winner = { config, score, order }
    }
  })

  return winner?.config || null
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
  const pathname = usePathname()

  useEffect(() => {
    const handleContextMenu = (e) => {
      const allMenus = getAll()
      const config = resolveContextMenuConfig(allMenus, pathname, e)

      if (config && config.items && config.items.length > 0) {
        e.preventDefault()
        if (typeof config.onOpen === 'function') {
          try {
            config.onOpen(e)
          } catch (openError) {
            void openError
          }
        }
        openMenu(config, e.clientX, e.clientY)
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [getAll, openMenu, pathname])
}

export function ContextMenuGlobal() {
  useContextMenuListener()
  return <ContextMenuRenderer />
}

export { ContextMenuProvider, useContextMenu } from './context'
