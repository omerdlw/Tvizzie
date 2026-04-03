'use client'

import { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react'
import Link from 'next/link'

import { usePathname, useRouter } from 'next/navigation'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/core/constants'
import { cn } from '@/core/utils'
import {
  useBackgroundActions,
  useBackgroundState,
} from '@/core/modules/background/context'
import {
  useActionComponent,
  useElementHeight,
  useActionHeight,
  useNavBadge,
} from '@/core/modules/nav/hooks'
import Icon, { default as Iconify } from '@/ui/icon'
import { Skeleton } from '@/ui/skeletons/components/nav'

import { NavActionsContainer } from './actions/container'
import { Icon as BadgeIcon, Description, Title } from './elements'
import ConfirmationSurface from './surfaces/confirmation-surface'
import { resolveNavVisualStyle } from './utils'

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 24,
  collapsedY: -8,
  expandedY: -78,
  actionGap: 10,
  height: 74,
})

export const NAV_CARD_LAYOUT = Object.freeze({
  collapsed: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.collapsedY,
    scale: 0.9,
  }),
  expanded: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.expandedY,
    scale: 1,
  }),
  baseHeight: NAV_CARD_DIMENSIONS.height,
  chromeHeight: NAV_CARD_DIMENSIONS.chromeHeight,
  actionGap: NAV_CARD_DIMENSIONS.actionGap,
  transition: Object.freeze({
    ease: EASING.EMPHASIZED,
    duration: DURATION.BALANCED,
    type: 'tween',
  }),
})

function getNavItemCardProps(
  expanded,
  position,
  showBorder,
  cardStyle,
  cardScale,
  expandedLift = 0
) {
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded
  const { offsetY: collapsedOffsetY, scale: collapsedScale } =
    NAV_CARD_LAYOUT.collapsed
  const safeCardStyle = cardStyle
    ? Object.fromEntries(
        Object.entries(cardStyle).filter(
          ([key]) => key !== 'scale' && key !== 'className'
        )
      )
    : {}

  const cardDelay = expanded ? position * 0.02 : 0

  return {
    className: cn(
      'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer border-[1.5px] rounded-[20px] border-white/10 bg-black/50 p-2 backdrop-blur-2xl',
      showBorder && 'border-white/20',
      cardStyle?.className
    ),
    style: {
      ...safeCardStyle,
      willChange: expanded || position === 0 ? 'transform' : 'auto',
    },
    animate: {
      y: expanded
        ? position * expandedOffsetY - expandedLift
        : position * collapsedOffsetY,
      scale: expanded ? cardScale || 1 : collapsedScale ** position,
      zIndex: NAV_CARD_LAYOUT.expanded.scale - position,
      opacity: 1,
    },
    initial: { opacity: 0, scale: 0.92, y: 0 },
    exit: {
      transition: {
        duration: DURATION.FAST,
        ease: EASING.EMPHASIZED,
      },
      scale: 0.92,
      opacity: 0,
    },
    transition: {
      y: {
        ...NAV_CARD_LAYOUT.transition,
        delay: cardDelay,
      },
      scale: {
        ...NAV_CARD_LAYOUT.transition,
        delay: cardDelay,
      },
      opacity: {
        ...NAV_CARD_LAYOUT.transition,
        delay: cardDelay,
      },
      zIndex: {
        delay: cardDelay,
        duration: DURATION.INSTANT,
      },
    },
  }
}

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') ||
      icon.startsWith('/') ||
      icon.startsWith('data:image/'))
  )
}

function shouldShowVideoIcon({ isActive, isVideo, link }) {
  return isActive && isVideo && link.type !== 'COUNTDOWN'
}

function getItemMeasurementKey({ link, expanded, isHovered, isStackHovered }) {
  const state = link.isLoading
    ? 'loading'
    : link.isSurface
      ? 'surface'
      : link.isConfirmation
        ? 'confirmation'
        : 'standard'

  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${isHovered ? 'hovered' : 'idle'}:${isStackHovered ? 'stack' : 'base'}`
}

function getItemDescription({ expanded, isHovered, link }) {
  if (isHovered && !expanded && !link.isOverlay && link.type !== 'COUNTDOWN') {
    return 'click to see the pages'
  }

  return link.description
}

function getActionNode(link, ActionComponent) {
  if (link.isConfirmation) {
    return <ConfirmationSurface item={link} />
  }

  return ActionComponent
}

function ParentArrow({ isExpanded, isHovered }) {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center  ">
      <Icon
        icon={
          isExpanded
            ? isHovered
              ? 'solar:alt-arrow-up-bold'
              : 'solar:alt-arrow-down-bold'
            : 'solar:alt-arrow-right-bold'
        }
        size={16}
      />
    </div>
  )
}

function VideoOverlayIcon({ icon }) {
  const isImageIcon = isImageIconSource(icon)

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute -top-1 -right-1 z-10 flex size-6 items-center justify-center',
        isImageIcon
          ? ' bg-cover bg-center bg-no-repeat'
          : ' border border-white/10 '
      )}
      style={isImageIcon ? { backgroundImage: `url(${icon})` } : undefined}
      transition={{
        duration: DURATION.FAST,
        ease: EASING.SMOOTH,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!isImageIcon && <Iconify icon={icon} size={14} className="text-white" />}
    </motion.div>
  )
}

function Badge({ badge }) {
  return (
    <AnimatePresence>
      {badge.visible && (
        <motion.div
          className={cn(
            'center absolute -top-0.5 -right-0.5 h-4.5 rounded-full min-w-4.5 ring ring-info  text-info px-1.5 py-0.5 text-[11px] font-semibold',
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          {badge.value}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function InlineParentChildren({ items, activeChild }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  const handleChildClick = (event, child) => {
    event.stopPropagation()

    if (typeof child?.onClick === 'function') {
      event.preventDefault()
      child.onClick(event)
    }
  }

  return (
    <div className="flex flex-auto flex-wrap items-center gap-1.5">
      {items.map((child, index) => {
        const key = `${child.path || child.name || 'parent-child'}-${index}`
        const isCurrent = child.path === activeChild?.path
        const className = cn(
          'flex-auto border px-2.5 py-2 text-center text-[11px] rounded-[12px] leading-none transition-all duration-200',
          isCurrent
            ? 'surface-active'
            : 'surface-muted'
        )

        if (child.path) {
          return (
            <Link
              key={key}
              href={child.path}
              className={className}
              onClick={(event) => {
                handleChildClick(event, child)
              }}
            >
              <span className="tracking-wide">
                {child.title || child.name}
              </span>
            </Link>
          )
        }

        return (
          <button
            key={key}
            type="button"
            className={className}
            onClick={(event) => {
              handleChildClick(event, child)
            }}
          >
            <span className="tracking-wide">
              {child.title || child.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StandardItemContent({
  link,
  isTop,
  expanded,
  isHovered,
  isStackHovered,
  itemStyle,
  badge,
  isActive,
  contentContainerRef,
  footerNode,
  footerRef,
}) {
  const { isVideo, isPlaying } = useBackgroundState()
  const { toggleVideo } = useBackgroundActions()

  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo, link })
  const description = getItemDescription({ expanded, isHovered, link })
  const iconHoverState = expanded ? isHovered : isStackHovered

  const handleIconClick = (event) => {
    if (showVideoIcon) {
      event.stopPropagation()
      event.preventDefault()
      toggleVideo()
      return
    }

    if (link.onClick) {
      event.stopPropagation()
      event.preventDefault()
      link.onClick(event)
    }
  }

  return (
    <div
      ref={contentContainerRef}
      className="relative flex h-auto w-full flex-col gap-0"
    >
      <div className="relative flex w-full items-center space-x-3">
        <div className="center relative">
          {link.icon ? (
            <div
              className={
                link.onClick || showVideoIcon
                  ? 'relative cursor-pointer transition-transform'
                  : 'relative'
              }
              onClick={handleIconClick}
            >
              <BadgeIcon
                isStackHovered={iconHoverState}
                icon={
                  showVideoIcon
                    ? isPlaying
                      ? 'mdi:pause'
                      : 'mdi:play'
                    : link.icon
                }
                style={itemStyle.icon}
              />

              {showVideoIcon && <VideoOverlayIcon icon={link.icon} />}
            </div>
          ) : (
            <div className="h-12" />
          )}
          <Badge badge={badge} />
        </div>
        <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Title text={link.title || link.name} style={itemStyle.title} />
            </div>
            <Description text={description} style={itemStyle.description} />
          </div>
          {isTop && link.type !== 'COUNTDOWN' && (
            <NavActionsContainer activeItem={link} />
          )}
        </div>
      </div>

      {footerNode ? (
        <div ref={footerRef} className="pt-2.5 w-full">
            {footerNode}
        </div>
      ) : null}
    </div>
  )
}

function ConfirmationItemContent({ link, itemStyle, contentContainerRef }) {
  return (
    <div
      ref={contentContainerRef}
      className="flex w-full flex-col gap-3 px-1 py-1"
    >
      {link.icon ? (
        <div className="self-start">
          <BadgeIcon
            isStackHovered={false}
            icon={link.icon}
            style={itemStyle.icon}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Title text={link.title || link.name} style={itemStyle.title} />
        {link.description ? (
          <Description
            text={link.description}
            style={itemStyle.description}
            maxLines={6}
          />
        ) : null}
      </div>
    </div>
  )
}

function SurfaceItemContent({ link, contentContainerRef }) {
  const SurfaceComponent = link.surfaceComponent
  const surfaceContent = link.surfaceContent

  return (
    <div
      ref={contentContainerRef}
      className="relative w-full"
      onClick={(event) => event.stopPropagation()}
    >
      {typeof SurfaceComponent === 'function' ? (
        <SurfaceComponent close={link.closeSurface} {...link.surfaceProps} />
      ) : (
        surfaceContent
      )}
    </div>
  )
}

function LoadingItemContent({ contentContainerRef }) {
  return (
    <div ref={contentContainerRef}>
      <Skeleton />
    </div>
  )
}

const Item = memo(
  forwardRef(function Item(
    {
      onActionHeightChange,
      onContentHeightChange,
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

    const pathname = usePathname()
    const router = useRouter()

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge)
    const ActionComponent = useActionComponent(link, pathname)

    const actionContainerRef = useRef(null)
    const contentContainerRef = useRef(null)
    const inlineFooterRef = useRef(null)

    const showBorder = expanded ? isHovered : isHovered || isStackHovered
    const shouldInlineParentChildren = Boolean(
      link.isParent &&
        link.isExpanded &&
        Array.isArray(link.children) &&
        link.children.length > 0
    )
    const [inlineFooterHeight, setInlineFooterHeight] = useState(0)

    const itemStyle = useMemo(() => {
      return resolveNavVisualStyle(link.style, {
        isActive,
        isHovered: showBorder,
      })
    }, [link.style, isActive, showBorder])

    const actionNode = useMemo(() => {
      return getActionNode(link, ActionComponent)
    }, [link, ActionComponent])
    const inlineChildrenNode = useMemo(() => {
      if (!shouldInlineParentChildren) {
        return null
      }

      return (
        <InlineParentChildren
          items={link.children}
          activeChild={link.activeChild}
        />
      )
    }, [
      link.activeChild,
      link.children,
      shouldInlineParentChildren,
    ])
    const inlineFooterNode = useMemo(() => {
      if (!shouldInlineParentChildren) {
        return null
      }

      if (!actionNode) {
        return inlineChildrenNode
      }

      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{inlineChildrenNode}</div>
          <div onClick={(event) => event.stopPropagation()}>
            <Suspense>{actionNode}</Suspense>
          </div>
        </div>
      )
    }, [actionNode, inlineChildrenNode, shouldInlineParentChildren])
    const cardProps = useMemo(() => {
      const resolvedCardProps = getNavItemCardProps(
        expanded,
        position,
        showBorder,
        itemStyle.card,
        itemStyle.scale,
        shouldInlineParentChildren ? inlineFooterHeight : 0
      )

      if (!link.isSurface) {
        return resolvedCardProps
      }

      return {
        ...resolvedCardProps,
        className: cn(resolvedCardProps.className, 'cursor-default'),
      }
    }, [
      expanded,
      position,
      showBorder,
      itemStyle.card,
      itemStyle.scale,
      inlineFooterHeight,
      link.isSurface,
      shouldInlineParentChildren,
    ])

    useActionHeight(
      onActionHeightChange,
      actionContainerRef,
      actionNode,
      isTop && !shouldInlineParentChildren
    )

    useElementHeight(
      setInlineFooterHeight,
      inlineFooterRef,
      shouldInlineParentChildren,
      inlineFooterNode
    )

    useElementHeight(
      onContentHeightChange,
      contentContainerRef,
      isTop,
      getItemMeasurementKey({
        link,
        expanded,
        isHovered,
        isStackHovered,
      })
    )

    const handleMouseEnter = () => {
      if (link.isOverlay) return

      setIsHovered(true)

      if (link.path) {
        router.prefetch(link.path)
      }

      if (!expanded) {
        onMouseEnter?.()
      }
    }

    const handleMouseLeave = () => {
      if (link.isOverlay) return

      setIsHovered(false)

      if (!expanded) {
        onMouseLeave?.()
      }
    }

    const renderContent = () => {
      if (link.isLoading) {
        return <LoadingItemContent contentContainerRef={contentContainerRef} />
      }

      if (link.isSurface) {
        return (
          <SurfaceItemContent
            link={link}
            contentContainerRef={contentContainerRef}
          />
        )
      }

      if (link.isConfirmation) {
        return (
          <ConfirmationItemContent
            link={link}
            itemStyle={itemStyle}
            contentContainerRef={contentContainerRef}
          />
        )
      }

      return (
        <StandardItemContent
          link={link}
          isTop={isTop}
          expanded={expanded}
          isHovered={isHovered}
          isStackHovered={isStackHovered}
          itemStyle={itemStyle}
          badge={badge}
          isActive={isActive}
          contentContainerRef={contentContainerRef}
          footerNode={inlineFooterNode}
          footerRef={inlineFooterRef}
        />
      )
    }

    return (
      <motion.div
        ref={ref}
        {...cardProps}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {!isTop && link.isParent && (
          <ParentArrow isExpanded={link.isExpanded} isHovered={isHovered} />
        )}

        {renderContent()}

        {actionNode && !shouldInlineParentChildren && (
          <div
            ref={actionContainerRef}
            onClick={(event) => event.stopPropagation()}
          >
            <Suspense>{actionNode}</Suspense>
          </div>
        )}
      </motion.div>
    )
  })
)

export default Item
