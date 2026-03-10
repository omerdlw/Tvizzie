'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'

import { EASING, Z_INDEX } from '@/lib/constants'
import { useClickOutside } from '@/lib/hooks'
import { useControlsState } from '@/modules/controls/context'
import { useModal } from '@/modules/modal/context'
import { useNavigation } from '@/modules/nav/hooks'

import { MobileControlsToggle } from '../controls/elements'
import { ANIMATION } from './constants'
import Item from './item'

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
    statusState,
    expanded,
    pathname,
    navigate,
  } = useNavigation()

  const [isStackHovered, setIsStackHovered] = useState(false)
  const [containerHeight, setContainerHeight] = useState(0)
  const { isOpen, hasControls } = useControlsState()
  const { isOpen: isModalOpen } = useModal()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [actionHeight, setActionHeight] = useState(0)
  const navRef = useRef(null)

  const showControlsButton = hasControls

  const handleKeyDown = useCallback(
    (e) => {
      if (!expanded) return
      const { key } = e
      if (key === 'Escape') return e.preventDefault() || setExpanded(false)
      if (key === 'Enter' && focusedIndex !== -1)
        return (
          e.preventDefault() || navigate(navigationItems[focusedIndex].path)
        )
      if (key === 'ArrowDown')
        return (
          e.preventDefault() ||
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : navigationItems.length - 1
          )
        )
      if (key === 'ArrowUp')
        return (
          e.preventDefault() ||
          setFocusedIndex((prev) =>
            prev < navigationItems.length - 1 ? prev + 1 : 0
          )
        )
    },
    [expanded, navigationItems, focusedIndex, navigate, setExpanded]
  )

  useEffect(() => {
    if (expanded) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [expanded, handleKeyDown])

  useEffect(() => {
    const isPathChange = pathname !== navRef.current?.dataset?.path
    if (navRef.current) navRef.current.dataset.path = pathname

    let currentActionHeight = actionHeight
    if (isPathChange) {
      currentActionHeight = 0
      setActionHeight(0)
    }

    const h =
      ANIMATION.BASE_CARD_HEIGHT +
      (activeItemHasAction && currentActionHeight > 0
        ? currentActionHeight + ANIMATION.ACTION_GAP
        : 0)

    setContainerHeight(h)
    setNavHeight(h + 16)
  }, [pathname, actionHeight, activeItemHasAction, setNavHeight])

  useEffect(() => {
    if (expanded) {
      setIsStackHovered(false)
      setFocusedIndex(activeIndex)
    } else {
      setFocusedIndex(-1)
    }
  }, [expanded, activeIndex])

  useClickOutside(navRef, () => setExpanded(false))

  return (
    <MotionConfig transition={ANIMATION.transition}>
      <motion.div
        className="fixed inset-0 cursor-pointer"
        transition={{ ease: EASING.SMOOTH, duration: 0.25 }}
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: expanded || statusState?.isOverlay ? 'auto' : 'none',
        }}
        onClick={() => setExpanded(false)}
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={
          expanded || statusState?.isOverlay
            ? { opacity: 1, backdropFilter: 'blur(24px)', display: 'block' }
            : {
              opacity: 0,
              backdropFilter: 'blur(0px)',
              transitionEnd: { display: 'none' },
            }
        }
      >
        <div className="fixed inset-0 -z-10 h-screen w-screen bg-linear-to-t from-black via-black/40 to-black/20" />
      </motion.div>

      <AnimatePresence>
        {showControlsButton && (
          <MobileControlsToggle navHeight={containerHeight} />
        )}
      </AnimatePresence>

      <div
        className={`fixed inset-x-0 bottom-2 mx-auto h-auto w-[calc(100%-16px)] transition-opacity duration-300 select-none sm:w-[460px] ${isModalOpen
          ? 'pointer-events-none'
          : isOpen
            ? 'pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100'
            : 'opacity-100'
          }`}
        style={{ zIndex: Z_INDEX.NAV }}
        id="nav-card-stack"
        ref={navRef}
      >
        <motion.div
          animate={{ height: containerHeight }}
          style={{ position: 'relative' }}
          transition={ANIMATION.transition}
        >
          <AnimatePresence mode="sync">
            {navigationItems.map((link, i) => {
              const position = expanded ? navigationItems.length - 1 - i : i
              const isTop = position === 0
              const itemKey = link.isChild
                ? `${link.parentName}-${link.path || link.name}`
                : link.path || link.name
              const isActive =
                (link.path || link.name) ===
                (activeItem?.path || activeItem?.name)

              return (
                <Item
                  key={itemKey}
                  onMouseLeave={() => {
                    if (expanded) setFocusedIndex(-1)
                    if (isTop) {
                      setIsStackHovered(false)
                      pathname !== '/' && setIsHovered(false)
                    }
                  }}
                  onMouseEnter={() => {
                    if (expanded) setFocusedIndex(i)
                    if (isTop) {
                      setIsStackHovered(true)
                      pathname !== '/' && setIsHovered(true)
                    }
                  }}
                  onClick={() => {
                    if (link.type === 'COUNTDOWN') return

                    expanded
                      ? link.isParent
                        ? toggleParent(link.name)
                        : link.path && navigate(link.path)
                      : isTop && setExpanded(true)
                  }}
                  onActionHeightChange={isTop ? setActionHeight : null}
                  totalItems={navigationItems.length}
                  isStackHovered={isStackHovered}
                  expanded={expanded}
                  position={position}
                  isTop={isTop}
                  isActive={isActive}
                  link={link}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  )
}
