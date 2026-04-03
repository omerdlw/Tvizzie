'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

import { DURATION, EASING, Z_INDEX } from '@/core/constants'
import { useClickOutside } from '@/core/hooks'
import { useModal } from '@/core/modules/modal/context'
import { useNavigation } from '@/core/modules/nav/hooks'
import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state'

import Item, { NAV_CARD_LAYOUT } from './item'

function getNavStackClassName({ isModalOpen, isFullscreenStateActive }) {
  const baseClassName =
    'fixed right-2 bottom-1 left-2 h-auto touch-manipulation select-none transition-opacity duration-(--motion-duration-normal) sm:right-auto sm:bottom-1 sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2'

  if (isModalOpen || isFullscreenStateActive) {
    return `${baseClassName} pointer-events-none opacity-0`
  }

  return `${baseClassName} opacity-100`
}

function getItemKey(link, index) {
  const pathPart = String(link?.path || '').trim() || 'no-path'
  const namePart = String(link?.name || '').trim() || 'no-name'
  const typePart = String(link?.type || '').trim() || 'no-type'

  if (link.isChild) {
    const parentPart = String(link?.parentName || '').trim() || 'no-parent'
    return `${parentPart}::${pathPart}::${namePart}::${typePart}::${index}`
  }

  return `${pathPart}::${namePart}::${typePart}::${index}`
}

function getIsItemActive(link, activeItem) {
  return (link.path || link.name) === (activeItem?.path || activeItem?.name)
}

function getItemPosition(index, expanded) {
  if (!expanded) {
    return index
  }

  return index
}

function getContainerHeight({ actionHeight, activeItemHasAction, cardContentHeight }) {
  const nextCardHeight = Math.max(
    NAV_CARD_LAYOUT.baseHeight,
    cardContentHeight + NAV_CARD_LAYOUT.chromeHeight
  )

  return (
    nextCardHeight +
    (activeItemHasAction && actionHeight > 0
      ? actionHeight
      : 0)
  )
}

function getActiveItemLayoutKey(activeItem) {
  if (!activeItem) {
    return 'none'
  }

  const pathPart = String(activeItem.path || '').trim() || 'no-path'
  const namePart = String(activeItem.name || '').trim() || 'no-name'
  const typePart = String(activeItem.type || '').trim() || 'no-type'

  return [
    pathPart,
    namePart,
    typePart,
    activeItem.isLoading ? 'loading' : 'ready',
    activeItem.isOverlay ? 'overlay' : 'base',
    activeItem.isSurface ? 'surface' : 'content',
    activeItem.isConfirmation ? 'confirmation' : 'standard',
    activeItem.action ? 'action' : 'no-action',
  ].join('::')
}

function getBackdropAnimation(isVisible) {
  if (isVisible) {
    return {
      opacity: 1,
      backdropFilter: 'blur(10px)',
      display: 'block',
    }
  }

  return {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transitionEnd: { display: 'none' },
  }
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function Nav() {
  const {
    activeItemHasAction,
    activeItem,
    navigationItems,
    toggleParent,
    setNavHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    expanded,
    pathname,
    navigate,
  } = useNavigation()

  const { isOpen: isModalOpen } = useModal()
  const isFullscreenStateActive = useIsFullscreenStateActive()

  const [isStackHovered, setIsStackHovered] = useState(false)
  const [containerHeight, setContainerHeight] = useState(
    NAV_CARD_LAYOUT.baseHeight
  )
  const [cardContentHeight, setCardContentHeight] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [actionHeight, setActionHeight] = useState(0)
  const [portalTarget, setPortalTarget] = useState(null)

  const navRef = useRef(null)
  const previousPathRef = useRef(pathname)
  const activeItemLayoutKey = useMemo(
    () => getActiveItemLayoutKey(activeItem),
    [activeItem]
  )
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey)

  const isOverlayActive = !!activeItem?.isOverlay
  const isBackdropVisible =
    !isFullscreenStateActive && (expanded || isOverlayActive)

  const handleOutsideDismiss = useCallback(() => {
    if (isOverlayActive) return

    setExpanded(false)
  }, [isOverlayActive, setExpanded])

  const handleKeyDown = useCallback(
    (event) => {
      if (isOverlayActive || !expanded) return

      const { key } = event

      if (key === 'Escape') {
        event.preventDefault()
        setExpanded(false)
        return
      }

      if (key === 'Enter' && focusedIndex !== -1) {
        event.preventDefault()
        navigate(navigationItems[focusedIndex]?.path)
        return
      }

      if (key === 'ArrowDown') {
        event.preventDefault()
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : navigationItems.length - 1
        )
        return
      }

      if (key === 'ArrowUp') {
        event.preventDefault()
        setFocusedIndex((prev) =>
          prev < navigationItems.length - 1 ? prev + 1 : 0
        )
      }
    },
    [
      expanded,
      focusedIndex,
      isOverlayActive,
      navigate,
      navigationItems,
      setExpanded,
    ]
  )

  useEffect(() => {
    if (!expanded) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [expanded, handleKeyDown])

  useIsomorphicLayoutEffect(() => {
    if (previousPathRef.current === pathname) {
      return
    }

    previousPathRef.current = pathname
    setActionHeight(0)
    setCardContentHeight(0)
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight)
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + 16)
  }, [pathname, setNavHeight])

  useIsomorphicLayoutEffect(() => {
    if (activeItem?.isOverlay) {
      return
    }

    if (previousActiveItemLayoutKeyRef.current === activeItemLayoutKey) {
      return
    }

    previousActiveItemLayoutKeyRef.current = activeItemLayoutKey
    setActionHeight(0)
    setCardContentHeight(0)
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight)
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + 16)
  }, [activeItem?.isOverlay, activeItemLayoutKey, setNavHeight])

  useIsomorphicLayoutEffect(() => {
    const height = getContainerHeight({
      actionHeight,
      activeItemHasAction,
      cardContentHeight,
    })

    setContainerHeight(height)
    setNavHeight(height + 16)
  }, [actionHeight, activeItemHasAction, cardContentHeight, setNavHeight])

  useEffect(() => {
    if (expanded) {
      setIsStackHovered(false)
      setFocusedIndex(activeIndex)
      return
    }

    setFocusedIndex(-1)
  }, [expanded, activeIndex])

  useClickOutside(navRef, handleOutsideDismiss)

  useEffect(() => {
    if (typeof document === 'undefined') return
    setPortalTarget(document.body)
  }, [])

  useEffect(() => {
    if (!isFullscreenStateActive) {
      return
    }

    setExpanded(false)
    setIsHovered(false)
    setIsStackHovered(false)
  }, [isFullscreenStateActive, setExpanded, setIsHovered])

  const stackClassName = useMemo(
    () =>
      getNavStackClassName({
        isModalOpen,
        isFullscreenStateActive,
      }),
    [isFullscreenStateActive, isModalOpen]
  )

  const navContent = (
    <MotionConfig transition={NAV_CARD_LAYOUT.transition}>
      <motion.div
        className="fixed inset-0 cursor-pointer"
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: isBackdropVisible ? 'auto' : 'none',
        }}
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={getBackdropAnimation(isBackdropVisible)}
        transition={{
          ease: EASING.EASE_OUT,
          duration: DURATION.SNAPPY,
        }}
        onClick={handleOutsideDismiss}
      >
        <div className="fixed inset-0 -z-10 h-screen w-screen bg-linear-to-t from-black via-black to-transparent" />
      </motion.div>

      <div
        id="nav-card-stack"
        ref={navRef}
        className={stackClassName}
        style={{ zIndex: Z_INDEX.NAV }}
      >
        <motion.div
          style={{ position: 'relative' }}
          animate={{ height: containerHeight }}
          transition={NAV_CARD_LAYOUT.transition}
        >
          <AnimatePresence initial={false} mode="sync">
            {navigationItems.map((link, index) => {
              const position = getItemPosition(index, expanded)
              const isTop = position === 0
              const isActive = getIsItemActive(link, activeItem)

              const handleMouseEnter = () => {
                if (expanded) {
                  setFocusedIndex(index)
                }

                if (!isTop) return

                setIsStackHovered(true)

                if (pathname !== '/') {
                  setIsHovered(true)
                }
              }

              const handleMouseLeave = () => {
                if (expanded) {
                  setFocusedIndex(-1)
                }

                if (!isTop) return

                setIsStackHovered(false)

                if (pathname !== '/') {
                  setIsHovered(false)
                }
              }

              const handleClick = () => {
                if (link.type === 'COUNTDOWN' || link.isOverlay) {
                  return
                }

                if (!expanded) {
                  if (isTop) {
                    setExpanded(true)
                  }
                  return
                }

                if (link.isParent) {
                  if (link.path && link.isExpanded) {
                    navigate(link.path)
                    return
                  }

                  toggleParent(link.name)
                  return
                }

                if (link.path) {
                  navigate(link.path)
                }
              }

              return (
                <Item
                  key={getItemKey(link, index)}
                  link={link}
                  expanded={expanded}
                  position={position}
                  isTop={isTop}
                  isActive={isActive}
                  isStackHovered={isStackHovered}
                  totalItems={navigationItems.length}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick}
                  onActionHeightChange={isTop ? setActionHeight : null}
                  onContentHeightChange={isTop ? setCardContentHeight : null}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  )

  if (!portalTarget) {
    return null
  }

  return createPortal(navContent, portalTarget)
}
