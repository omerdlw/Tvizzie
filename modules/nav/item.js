import { Suspense, forwardRef, memo, useMemo, useRef, useState } from 'react'
import React from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants/index'
import { useOS } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import {
  useBackgroundActions,
  useBackgroundState,
} from '@/modules/background/context'
import {
  useActionComponent,
  useActionHeight,
  useNavBadge,
} from '@/modules/nav/hooks'
import Icon, { default as Iconify } from '@/ui/icon'
import { NavItemSkeleton } from '@/ui/skeletons/nav-skeleton'

import { NavActionsContainer } from './actions'
import { getNavCardProps } from './constants'
import { Icon as BadgeIcon, Description, Title } from './elements'
import { resolveNavVisualStyle } from './utils'

const Item = memo(
  forwardRef(function Item(
    {
      onActionHeightChange,
      isStackHovered,
      onMouseEnter,
      onMouseLeave,
      expanded,
      position,
      onClick,
      isTop,
      link,
      isActive,
    },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false)
    const os = useOS()
    const shortcutSymbol = useMemo(() => (os === 'MacOS' ? '⌥' : 'Alt +'), [os])
    const showBorder = expanded ? isHovered : isHovered || isStackHovered
    const itemStyle = useMemo(
      () =>
        resolveNavVisualStyle(link.style, { isActive, isHovered: showBorder }),
      [link.style, isActive, showBorder]
    )
    const badge = useNavBadge(link.name?.toLowerCase(), link.badge)
    const actionContainerRef = useRef(null)
    const pathname = usePathname()
    const router = useRouter()
    const { isVideo, isPlaying } = useBackgroundState()
    const { toggleVideo } = useBackgroundActions()
    const showVideoIcon = isActive && isVideo && link.type !== 'COUNTDOWN'

    const ActionComponent = useActionComponent(link, pathname)
    useActionHeight(
      onActionHeightChange,
      actionContainerRef,
      ActionComponent,
      isTop
    )

    return (
      <>
        <motion.div
          ref={ref}
          {...getNavCardProps(
            expanded,
            position,
            showBorder,
            itemStyle.card,
            itemStyle.scale
          )}
          onMouseEnter={() => {
            if (link.isOverlay) return
            setIsHovered(true)
            if (link.path) router.prefetch(link.path)
            if (!expanded) onMouseEnter?.()
          }}
          onMouseLeave={() => {
            if (link.isOverlay) return
            setIsHovered(false)
            if (!expanded) onMouseLeave?.()
          }}
          onClick={onClick}
        >
          {!isTop && link.isParent && (
            <div className="absolute top-2 right-2 z-10 flex items-center rounded-full opacity-70">
              <Icon
                icon={
                  link.isExpanded
                    ? isHovered
                      ? 'solar:alt-arrow-up-bold'
                      : 'solar:alt-arrow-down-bold'
                    : 'solar:alt-arrow-right-bold'
                }
                size={16}
              />
            </div>
          )}
          {link.isLoading ? (
            <NavItemSkeleton />
          ) : (
            <div className="relative flex h-auto w-full items-center space-x-3">
              <div className="center relative">
                {link?.icon ? (
                  <div
                    className={
                      link.onClick || showVideoIcon
                        ? 'relative cursor-pointer transition-transform'
                        : 'relative'
                    }
                    onClick={(e) => {
                      if (showVideoIcon) {
                        e.stopPropagation()
                        e.preventDefault()
                        toggleVideo()
                        return
                      }
                      if (link.onClick) {
                        e.stopPropagation()
                        e.preventDefault()
                        link.onClick(e)
                      }
                    }}
                  >
                    <BadgeIcon
                      isStackHovered={expanded ? isHovered : isStackHovered}
                      icon={
                        showVideoIcon
                          ? isPlaying
                            ? 'mdi:pause'
                            : 'mdi:play'
                          : link.icon
                      }
                      style={itemStyle.icon}
                    />
                    {showVideoIcon && (
                      <motion.div
                        className={cn(
                          'pointer-events-none absolute -top-1 -right-1 z-10 flex size-6 items-center justify-center',
                          typeof link.icon === 'string' &&
                            link.icon.startsWith('http')
                            ? 'rounded-[10px] bg-cover bg-center bg-no-repeat'
                            : 'rounded-[10px] border border-white/5 bg-white/15'
                        )}
                        style={
                          typeof link.icon === 'string' &&
                          link.icon.startsWith('http')
                            ? { backgroundImage: `url(${link.icon})` }
                            : {}
                        }
                        transition={{
                          duration: DURATION.FAST,
                          ease: EASING.SMOOTH,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {!(
                          typeof link.icon === 'string' &&
                          link.icon.startsWith('http')
                        ) && (
                          <Iconify
                            icon={link.icon}
                            size={14}
                            className="text-white"
                          />
                        )}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="h-12"></div>
                )}
                <AnimatePresence>
                  {badge.visible && (
                    <motion.div
                      className={cn(
                        'center absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 rounded-xl border border-black/40 px-1.5 py-0.5 text-[10px] font-semibold',
                        badge.color
                      )}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      {badge.value}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
                <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
                  <div className="flex items-center gap-2">
                    {(expanded
                      ? link.shortcut
                      : isTop && link.type !== 'COUNTDOWN'
                        ? 'N'
                        : null) &&
                      os === 'MacOS' && (
                        <span
                          className="hidden rounded-[8px] border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] sm:inline"
                          style={{
                            opacity: itemStyle.shortcutBadge?.opacity ?? 0.7,
                            ...itemStyle.shortcutBadge,
                          }}
                        >
                          {shortcutSymbol}
                          {expanded ? link.shortcut : 'N'}
                        </span>
                      )}
                    <Title
                      text={link.title || link.name}
                      style={itemStyle.title}
                    />
                  </div>
                  <Description
                    text={
                      isHovered &&
                      !expanded &&
                      !link.isOverlay &&
                      link.type !== 'COUNTDOWN'
                        ? 'click to see the pages'
                        : link.description
                    }
                    style={itemStyle.description}
                  />
                </div>
                {isTop && link.type !== 'COUNTDOWN' && (
                  <NavActionsContainer activeItem={link} />
                )}
              </div>
            </div>
          )}
          {ActionComponent && (
            <div ref={actionContainerRef} onClick={(e) => e.stopPropagation()}>
              <Suspense>{ActionComponent}</Suspense>
            </div>
          )}
        </motion.div>
      </>
    )
  })
)

export default Item
