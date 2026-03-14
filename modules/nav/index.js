'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'

import { DURATION, EASING, Z_INDEX } from '@/lib/constants'
import { useClickOutside } from '@/lib/hooks'
import { useControlsState } from '@/modules/controls/context'
import { useModal } from '@/modules/modal/context'
import { useNavigation } from '@/modules/nav/hooks'

import { MobileControlsToggle } from '../controls/elements'
import { STYLES } from './constants'
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
    expanded,
    pathname,
    navigate,
  } = useNavigation()

  const [isStackHovered, setIsStackHovered] = useState(false)
  const [containerHeight, setContainerHeight] = useState(0)
  const [cardContentHeight, setCardContentHeight] = useState(0)
  const { isOpen, hasControls } = useControlsState()
  const { isOpen: isModalOpen } = useModal()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [actionHeight, setActionHeight] = useState(0)
  const navRef = useRef(null)

  const showControlsButton = hasControls

  const handleKeyDown = useCallback(
    (e) => {
      if (activeItem?.isOverlay) return
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
    [activeItem?.isOverlay, expanded, navigationItems, focusedIndex, navigate, setExpanded]
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
    let currentCardHeight = Math.max(
      STYLES.animation.baseCardHeight,
      cardContentHeight + STYLES.animation.cardChromeHeight
    )
    if (isPathChange) {
      currentActionHeight = 0
      setActionHeight(0)
      currentCardHeight = STYLES.animation.baseCardHeight
      setCardContentHeight(0)
    }

    const h =
      currentCardHeight +
      (activeItemHasAction && currentActionHeight > 0
        ? currentActionHeight + STYLES.animation.actionGap
        : 0)

    setContainerHeight(h)
    setNavHeight(h + 16)
  }, [
    pathname,
    actionHeight,
    activeItemHasAction,
    cardContentHeight,
    setNavHeight,
  ])

  useEffect(() => {
    if (expanded) {
      setIsStackHovered(false)
      setFocusedIndex(activeIndex)
    } else {
      setFocusedIndex(-1)
    }
  }, [expanded, activeIndex])

  useClickOutside(navRef, () => {
    if (activeItem?.isOverlay) return
    setExpanded(false)
  })

  return (
    <MotionConfig transition={STYLES.animation.transition}>
      <motion.div
        className="fixed inset-0 cursor-pointer"
        transition={{ ease: EASING.EASE_OUT, duration: DURATION.SNAPPY }}
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: expanded || activeItem?.isOverlay ? 'auto' : 'none',
        }}
        onClick={() => {
          if (activeItem?.isOverlay) return
          setExpanded(false)
        }}
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={
          expanded || activeItem?.isOverlay
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
        className={`fixed right-2 bottom-2 left-2 h-auto touch-manipulation transition-opacity duration-[var(--motion-duration-normal)] select-none sm:right-auto sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2 ${
          isModalOpen
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
          transition={STYLES.animation.transition}
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
                    if (link.isOverlay) return

                    expanded
                      ? link.isParent
                        ? toggleParent(link.name)
                        : link.path && navigate(link.path)
                      : isTop && setExpanded(true)
                  }}
                  onActionHeightChange={isTop ? setActionHeight : null}
                  onContentHeightChange={isTop ? setCardContentHeight : null}
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
