'use client';

import { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useActionComponent, useElementHeight, useActionHeight, useNavBadge } from '@/core/modules/nav/hooks';
import { default as Iconify } from '@/ui/icon';
import { Skeleton } from '@/ui/skeletons/components/nav';

import { NavActionsContainer } from './actions/container';
import { Icon as BadgeIcon, Description, Title } from './elements';
import { getNavStackOffset } from './layout';
import {
  getNavCardSpring,
  getNavCardStaggerDelay,
  NAV_ACTION_PANEL_MOTION,
  NAV_BADGE_MOTION,
  NAV_CARD_BLUR_TRANSITION,
  NAV_CARD_OPACITY_TRANSITION,
  NAV_CARD_WIDTH_SPRING,
  NAV_CONTAINER_SPRING,
  NAV_DEFAULT_TRANSITION,
  NAV_VIDEO_ICON_MOTION,
} from '@/core/modules/motion';
import ConfirmationSurface from './surfaces/confirmation-surface';
import { resolveNavVisualStyle } from './utils';

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 20,
  collapsedY: -8,
  compactHeight: 38,
  expandedY: getNavStackOffset(68),
  actionGap: 10,
  height: 64,
});

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
  compactHeight: NAV_CARD_DIMENSIONS.compactHeight,
  actionGap: NAV_CARD_DIMENSIONS.actionGap,
  transition: NAV_DEFAULT_TRANSITION,
});

const BLUR_AMOUNT = 7;

const COMPACT_CARD_MIN_WIDTH = 148;
const COMPACT_CARD_HORIZONTAL_PADDING = 56;
const COMPACT_CARD_MAX_OFFSET = 72;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function estimateCompactCardWidth(title, stackWidth) {
  const titleLength = String(title || '').trim().length;
  const estimatedWidth = titleLength * 10 + COMPACT_CARD_HORIZONTAL_PADDING;
  const maxWidth = Math.max(COMPACT_CARD_MIN_WIDTH, stackWidth - COMPACT_CARD_MAX_OFFSET);

  return clamp(estimatedWidth, COMPACT_CARD_MIN_WIDTH, maxWidth);
}

function getExpandedItemY(position, isMobile, expandedTopCardHeight) {
  const baseExpandedOffsetY = isMobile ? -68 : NAV_CARD_LAYOUT.expanded.offsetY;

  if (position === 0) {
    return 0;
  }

  const topCardExtraHeight = Math.max(
    (expandedTopCardHeight || NAV_CARD_LAYOUT.baseHeight) - NAV_CARD_LAYOUT.baseHeight,
    0
  );
  const firstExpandedOffsetY = baseExpandedOffsetY - topCardExtraHeight;

  return firstExpandedOffsetY + (position - 1) * baseExpandedOffsetY;
}

function getNavItemCardProps(
  expanded,
  position,
  showBorder,
  cardStyle,
  cardScale,
  cardWidth,
  isMobile,
  isInteractive,
  containerHeight,
  expandedTopCardHeight
) {
  const { offsetY: collapsedOffsetY, scale: collapsedScale } = NAV_CARD_LAYOUT.collapsed;
  const safeCardStyle = cardStyle
    ? Object.fromEntries(Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'))
    : {};

  const staggerDelay = getNavCardStaggerDelay(position, expanded);
  const spring = getNavCardSpring(position);
  const isTop = position === 0;

  return {
    className: cn(
      'absolute inset-x-0 bottom-0 mx-auto h-auto w-full cursor-pointer border-[1.5px] p-1.5 sm:p-2 backdrop-blur-lg',
      'border-black/15 bg-white/80',
      showBorder && 'border-black/20',
      cardStyle?.className
    ),
    style: {
      ...safeCardStyle,
      willChange: position <= 1 ? 'transform, opacity, filter' : 'auto',
    },
    animate: {
      width: cardWidth,
      y: expanded ? getExpandedItemY(position, isMobile, expandedTopCardHeight) : position * collapsedOffsetY,
      scale: expanded ? cardScale || 1 : collapsedScale ** position,
      zIndex: 10 - position,
      opacity: 1,
      filter: 'blur(0px)',
      ...(isTop && containerHeight ? { height: containerHeight } : {}),
    },
    initial: {
      opacity: 0,
      scale: 0.94,
      y: 10,
      filter: `blur(${BLUR_AMOUNT}px)`,
    },
    exit: {
      opacity: 0,
      scale: 0.92,
      filter: `blur(${Math.round(BLUR_AMOUNT * 0.6)}px)`,
      transition: {
        duration: 0.15,
        ease: [0.23, 1, 0.32, 1],
        filter: { duration: 0.14 },
      },
    },
    transition: {
      width: { ...NAV_CARD_WIDTH_SPRING, delay: staggerDelay },
      y: { ...spring, delay: staggerDelay },
      scale: { ...spring, delay: staggerDelay },
      opacity: { ...NAV_CARD_OPACITY_TRANSITION, delay: staggerDelay },
      filter: { ...NAV_CARD_BLUR_TRANSITION, delay: staggerDelay },
      zIndex: { duration: 0, delay: staggerDelay },
      ...(isTop && containerHeight ? { height: { ...NAV_CONTAINER_SPRING, delay: staggerDelay } } : {}),
    },
  };
}

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

function shouldShowVideoIcon({ isActive, isVideo, link }) {
  return isActive && isVideo && link.type !== 'COUNTDOWN';
}

function getItemMeasurementKey({ link, expanded, isHovered, isStackHovered, compact }) {
  const state = link.isLoading
    ? 'loading'
    : link.isSurface
      ? 'surface'
      : link.isConfirmation
        ? 'confirmation'
        : 'standard';

  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${isHovered ? 'hovered' : 'idle'}:${isStackHovered ? 'stack' : 'base'}:${compact ? 'compact' : 'full'}`;
}

function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ''}:${key}`;
}

function getItemDescription({ expanded, isHovered, link }) {
  if (isHovered && !expanded && !link.isOverlay && link.type !== 'COUNTDOWN') {
    return 'click to see the pages';
  }

  return link.description;
}

function getActionNode(link, ActionComponent) {
  if (link.isConfirmation) {
    return <ConfirmationSurface item={link} />;
  }

  return ActionComponent;
}

function VideoOverlayIcon({ icon }) {
  const isImageIcon = isImageIconSource(icon);

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute -top-1 -right-1 z-10 flex size-6 items-center justify-center',
        isImageIcon ? 'bg-cover bg-center bg-no-repeat' : 'border border-black/5 bg-white'
      )}
      style={isImageIcon ? { backgroundImage: `url(${icon})` } : undefined}
      {...NAV_VIDEO_ICON_MOTION}
    >
      {!isImageIcon && <Iconify icon={icon} size={14} className="text-black" />}
    </motion.div>
  );
}

function Badge({ badge }) {
  return (
    <AnimatePresence initial={false} mode="sync">
      {badge.visible && (
        <motion.div
          className={cn(
            'center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1.5 py-0.5 text-[11px] font-semibold ring'
          )}
          {...NAV_BADGE_MOTION}
        >
          {badge.value}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StandardItemContent({
  compact,
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
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();

  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo, link });
  const description = getItemDescription({ expanded, isHovered, link });
  const iconHoverState = expanded ? isHovered : isStackHovered;

  if (compact) {
    const compactTitleStyle = {
      ...itemStyle.title,
      className: cn('tracking-tight normal-case text-center', itemStyle.title?.className),
      textTransform: 'none',
    };

    return (
      <div ref={contentContainerRef} className="flex h-5 w-full items-center justify-center px-4 sm:h-6 sm:px-5">
        <div className="min-w-0">
          <Title
            text={link.title || link.name}
            style={{ ...compactTitleStyle, className: cn(compactTitleStyle.className, 'text-[12px] sm:text-[14px]') }}
          />
        </div>
      </div>
    );
  }

  const handleIconClick = (event) => {
    if (showVideoIcon) {
      event.stopPropagation();
      event.preventDefault();
      toggleVideo();
      return;
    }

    if (link.onClick) {
      event.stopPropagation();
      event.preventDefault();
      link.onClick(event);
    }
  };

  return (
    <div ref={contentContainerRef} className="relative flex h-auto w-full flex-col gap-0">
      <div className="relative flex w-full items-center space-x-3">
        <div className="center relative">
          {link.icon ? (
            <div
              className={link.onClick || showVideoIcon ? 'relative cursor-pointer transition-transform' : 'relative'}
              onClick={handleIconClick}
            >
              <BadgeIcon
                isStackHovered={iconHoverState}
                icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
                iconOverlay={showVideoIcon ? null : link.iconOverlay}
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
              <Title
                text={link.title || link.name}
                style={{
                  ...itemStyle.title,
                  className: cn(itemStyle.title?.className, 'text-[14px] sm:text-[16px]'),
                }}
              />
            </div>
            <Description text={description} style={itemStyle.description} />
          </div>
          {isTop && link.type !== 'COUNTDOWN' && <NavActionsContainer activeItem={link} />}
        </div>
      </div>

      {footerNode ? (
        <div ref={footerRef} className="w-full pt-2.5">
          {footerNode}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmationItemContent({ link, itemStyle, contentContainerRef }) {
  return (
    <div ref={contentContainerRef} className="flex w-full flex-col gap-3 px-1 py-1">
      {link.icon ? (
        <div className="self-start">
          <BadgeIcon isStackHovered={false} icon={link.icon} iconOverlay={link.iconOverlay} style={itemStyle.icon} />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Title text={link.title || link.name} style={itemStyle.title} />
        {link.description ? <Description text={link.description} style={itemStyle.description} maxLines={6} /> : null}
      </div>
    </div>
  );
}

function SurfaceItemContent({ link, contentContainerRef }) {
  const SurfaceComponent = link.surfaceComponent;
  const surfaceContent = link.surfaceContent;

  return (
    <div ref={contentContainerRef} className="relative w-full" onClick={(event) => event.stopPropagation()}>
      {typeof SurfaceComponent === 'function' ? (
        <SurfaceComponent close={link.closeSurface} {...link.surfaceProps} />
      ) : (
        surfaceContent
      )}
    </div>
  );
}

function LoadingItemContent({ contentContainerRef }) {
  return (
    <div ref={contentContainerRef}>
      <Skeleton />
    </div>
  );
}

const Item = memo(
  forwardRef(function Item(
    {
      onActionHeightChange,
      onContentHeightChange,
      isStackHovered,
      onMouseEnter,
      onMouseLeave,
      compact,
      expanded,
      position,
      onClick,
      isTop,
      link,
      isActive,
      stackWidth,
      isMobile,
      containerHeight,
      expandedTopCardHeight,
    },

    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);

    const pathname = usePathname();
    const router = useRouter();

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname);

    const actionContainerRef = useRef(null);
    const contentContainerRef = useRef(null);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;
    const cardWidth = compact ? estimateCompactCardWidth(link.title || link.name, stackWidth) : stackWidth;

    const itemStyle = useMemo(() => {
      return resolveNavVisualStyle(link.style, {
        isActive,
        isHovered: showBorder,
      });
    }, [link.style, isActive, showBorder]);

    const actionNode = useMemo(() => {
      return getActionNode(link, ActionComponent);
    }, [link, ActionComponent]);
    const renderedActionNode = compact ? null : actionNode;

    useActionHeight(
      onActionHeightChange,
      actionContainerRef,
      renderedActionNode,
      isTop,
      getRouteMeasurementKey(pathname, renderedActionNode ? 'action' : 'no-action')
    );

    useElementHeight(
      onContentHeightChange,
      contentContainerRef,
      isTop,
      getRouteMeasurementKey(
        pathname,
        getItemMeasurementKey({
          link,
          expanded,
          isHovered,
          isStackHovered,
          compact,
        })
      )
    );

    const handleMouseEnter = () => {
      if (link.isOverlay) return;

      setIsHovered(true);

      if (link.path) {
        router.prefetch(link.path);
      }

      if (!expanded) {
        onMouseEnter?.();
      }
    };

    const handleMouseLeave = () => {
      if (link.isOverlay) return;

      setIsHovered(false);

      if (!expanded) {
        onMouseLeave?.();
      }
    };

    const handleFocus = () => {
      if (link.isOverlay) return;

      setIsHovered(true);
      onMouseEnter?.();
    };

    const handleBlur = () => {
      if (link.isOverlay) return;

      setIsHovered(false);
      onMouseLeave?.();
    };

    const handleKeyDown = (event) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onClick?.(event);
    };

    const renderContent = () => {
      if (link.isLoading) {
        return <LoadingItemContent contentContainerRef={contentContainerRef} />;
      }

      if (link.isSurface) {
        return <SurfaceItemContent link={link} contentContainerRef={contentContainerRef} />;
      }

      if (link.isConfirmation) {
        return <ConfirmationItemContent link={link} itemStyle={itemStyle} contentContainerRef={contentContainerRef} />;
      }

      return (
        <StandardItemContent
          link={link}
          compact={compact}
          isTop={isTop}
          expanded={expanded}
          isHovered={isHovered}
          isStackHovered={isStackHovered}
          itemStyle={itemStyle}
          badge={badge}
          isActive={isActive}
          contentContainerRef={contentContainerRef}
          footerNode={null}
          footerRef={null}
        />
      );
    };

    return (
      <motion.div
        ref={ref}
        {...getNavItemCardProps(
          expanded,
          position,
          showBorder,
          itemStyle.card,
          itemStyle.scale,
          cardWidth,
          isMobile,
          link.type !== 'COUNTDOWN' && !link.isOverlay,
          containerHeight,
          expandedTopCardHeight
        )}
        role="button"
        tabIndex={link.isOverlay ? -1 : 0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {renderContent()}

        <AnimatePresence initial={false}>
          {renderedActionNode ? (
            <motion.div
              key="nav-action-component"
              ref={actionContainerRef}
              onClick={(event) => event.stopPropagation()}
              {...NAV_ACTION_PANEL_MOTION}
            >
              <Suspense>{renderedActionNode}</Suspense>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  })
);

export default Item;
