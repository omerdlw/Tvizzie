'use client';

import { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { DURATION, EASING } from '@/core/constants';
import { cn } from '@/core/utils';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useInitialPageAnimationsEnabled } from '@/features/motion-runtime';
import { useActionComponent, useElementHeight, useActionHeight, useNavBadge } from '@/core/modules/nav/hooks';
import { default as Iconify } from '@/ui/icon';
import { Skeleton } from '@/ui/skeletons/components/nav';

import { NavActionsContainer } from './actions/container';
import { Icon as BadgeIcon, Description, Title } from './elements';
import {
  getNavCardSpring,
  getNavCardStaggerDelay,
  NAV_BADGE_SPRING,
  NAV_CARD_BLUR_TRANSITION,
  NAV_CARD_OPACITY_TRANSITION,
  NAV_CARD_WIDTH_SPRING,
  NAV_CONTENT_TRANSITION,
  NAV_MICRO_SPRING,
} from './motion';
import ConfirmationSurface from './surfaces/confirmation-surface';
import { resolveNavVisualStyle } from './utils';

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 24,
  collapsedY: -8,
  compactHeight: 52,
  expandedY: -78,
  actionGap: 10,
  height: 74,
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
  transition: Object.freeze({
    ease: EASING.EMPHASIZED,
    duration: DURATION.SNAPPY,
    type: 'tween',
  }),
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

function getNavItemCardProps(expanded, position, showBorder, cardStyle, cardScale, reduceMotion, cardWidth) {
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded;
  const { offsetY: collapsedOffsetY, scale: collapsedScale } = NAV_CARD_LAYOUT.collapsed;
  const safeCardStyle = cardStyle
    ? Object.fromEntries(Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'))
    : {};

  const staggerDelay = getNavCardStaggerDelay(position, expanded);

  // Reduced-motion fallback: simple and quick fade/position transitions.
  if (reduceMotion) {
    return {
      className: cn(
        'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer border-[1.5px] rounded-[20px] p-2 backdrop-blur-lg',
        'border-black/15 bg-white/80',
        showBorder && 'border-black/20',
        cardStyle?.className
      ),
      style: { ...safeCardStyle, willChange: 'auto' },
      animate: {
        width: cardWidth,
        y: expanded ? position * expandedOffsetY : position * collapsedOffsetY,
        scale: expanded ? cardScale || 1 : collapsedScale ** position,
        zIndex: 10 - position,
        opacity: 1,
      },
      initial: { opacity: 0, scale: 0.97 },
      exit: {
        opacity: 0,
        scale: 0.97,
        transition: { duration: 0.1, ease: 'easeOut' },
      },
      transition: {
        width: { ...NAV_CONTENT_TRANSITION, delay: staggerDelay },
        y: { ...NAV_CONTENT_TRANSITION, delay: staggerDelay },
        scale: { ...NAV_CONTENT_TRANSITION, delay: staggerDelay },
        opacity: { ...NAV_CONTENT_TRANSITION, delay: staggerDelay },
        zIndex: { duration: 0, delay: staggerDelay },
      },
    };
  }

  const spring = getNavCardSpring(position);

  return {
    className: cn(
      'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer border-[1.5px] rounded-[20px] p-2 backdrop-blur-lg',
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
      y: expanded ? position * expandedOffsetY : position * collapsedOffsetY,
      scale: expanded ? cardScale || 1 : collapsedScale ** position,
      zIndex: 10 - position,
      opacity: 1,
      filter: 'blur(0px)',
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
        duration: DURATION.QUICK,
        ease: EASING.EMPHASIZED,
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
  const initialPageAnimationsEnabled = useInitialPageAnimationsEnabled();

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute -top-1 -right-1 z-10 flex size-6 items-center justify-center',
        isImageIcon ? 'bg-cover bg-center bg-no-repeat' : 'rounded-[8px] border border-black/5 bg-white'
      )}
      style={isImageIcon ? { backgroundImage: `url(${icon})` } : undefined}
      transition={NAV_MICRO_SPRING}
      initial={initialPageAnimationsEnabled ? { opacity: 0, scale: 0.7 } : false}
      animate={{ opacity: 1, scale: 1 }}
    >
      {!isImageIcon && <Iconify icon={icon} size={14} className={'text-[#831843]'} />}
    </motion.div>
  );
}

function Badge({ badge }) {
  const initialPageAnimationsEnabled = useInitialPageAnimationsEnabled();

  return (
    <AnimatePresence>
      {badge.visible && (
        <motion.div
          className={cn(
            'center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring'
          )}
          initial={initialPageAnimationsEnabled ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={NAV_BADGE_SPRING}
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
      <div ref={contentContainerRef} className="flex h-7 w-full items-center justify-center px-5">
        <div className="min-w-0">
          <Title text={link.title || link.name} style={compactTitleStyle} />
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
              <Title text={link.title || link.name} style={itemStyle.title} />
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
      initialPageAnimationsEnabled,
    },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);

    const pathname = usePathname();
    const router = useRouter();
    const reduceMotion = useReducedMotion();

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

    const cardProps = useMemo(() => {
      const resolvedCardProps = getNavItemCardProps(
        expanded,
        position,
        showBorder,
        itemStyle.card,
        itemStyle.scale,
        !!reduceMotion,
        cardWidth
      );

      if (!link.isSurface) {
        return resolvedCardProps;
      }

      return {
        ...resolvedCardProps,
        className: cn(resolvedCardProps.className, 'cursor-default'),
      };
    }, [cardWidth, expanded, position, showBorder, itemStyle.card, itemStyle.scale, link.isSurface, reduceMotion]);

    useActionHeight(onActionHeightChange, actionContainerRef, renderedActionNode, isTop);

    useElementHeight(
      onContentHeightChange,
      contentContainerRef,
      isTop,
      getItemMeasurementKey({
        link,
        expanded,
        isHovered,
        isStackHovered,
        compact,
      })
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
        {...cardProps}
        initial={initialPageAnimationsEnabled ? cardProps.initial : false}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {renderContent()}

        {renderedActionNode && (
          <div ref={actionContainerRef} onClick={(event) => event.stopPropagation()}>
            <Suspense>{renderedActionNode}</Suspense>
          </div>
        )}
      </motion.div>
    );
  })
);

export default Item;
