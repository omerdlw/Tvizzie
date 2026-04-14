'use client';

import { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { DURATION, EASING } from '@/core/constants';
import { cn } from '@/core/utils';
import { useAuth } from '@/core/modules/auth';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useActionComponent, useElementHeight, useActionHeight, useNavBadge } from '@/core/modules/nav/hooks';
import { getNavItemMode } from '@/core/modules/nav/state-machine';
import { default as Iconify } from '@/ui/icon';
import { Skeleton } from '@/ui/skeletons/components/nav';

import { NavActionsContainer } from './actions/container';
import { Icon as BadgeIcon, Description, Title } from './elements';
import ConfirmationSurface from './surfaces/confirmation-surface';
import { buildNavSignInHref, normalizeNavPathname, resolveNavVisualStyle } from './utils';

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 24,
  collapsedY: -8,
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
  actionGap: NAV_CARD_DIMENSIONS.actionGap,
  transition: Object.freeze({
    ease: EASING.EMPHASIZED,
    duration: DURATION.BALANCED,
    type: 'tween',
  }),
});

function getNavItemCardProps(expanded, position, showBorder, cardStyle, cardScale, motionState) {
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded;
  const { offsetY: collapsedOffsetY, scale: collapsedBaseScale } = NAV_CARD_LAYOUT.collapsed;
  const safeCardStyle = cardStyle
    ? Object.fromEntries(Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'))
    : {};

  const { reduceMotion } = motionState;
  const cardDelay = expanded ? position * 0.02 : 0;
  const targetScale = expanded ? cardScale || 1 : collapsedBaseScale ** position;

  return {
    className: cn(
      'absolute inset-x-0 top-0 mx-auto h-auto w-full cursor-pointer rounded-[20px] border-[1.5px] p-2 backdrop-blur-xl',
      'border-black/15 bg-white/80',
      showBorder && 'border-black/20',
      cardStyle?.className
    ),
    style: {
      ...safeCardStyle,
      willChange: expanded || position === 0 ? 'transform' : 'auto',
    },
    animate: {
      y: expanded ? position * expandedOffsetY : position * collapsedOffsetY,
      scale: targetScale,
      zIndex: NAV_CARD_LAYOUT.expanded.scale - position,
      opacity: 1,
    },
    initial: reduceMotion ? { opacity: 0, scale: 0.98, y: 0 } : { opacity: 0, scale: 0.95, y: 4 },
    exit: {
      transition: {
        duration: reduceMotion ? DURATION.VERY_FAST : DURATION.QUICK,
        ease: EASING.EASE_OUT,
      },
      scale: reduceMotion ? 0.98 : 0.96,
      y: reduceMotion ? 0 : 2,
      opacity: 0,
    },
    transition: {
      y: {
        duration: reduceMotion ? DURATION.VERY_FAST : DURATION.MODERATE,
        delay: cardDelay,
        ease: EASING.EMPHASIZED,
      },
      scale: {
        duration: reduceMotion ? DURATION.VERY_FAST : DURATION.MODERATE,
        delay: cardDelay,
        ease: EASING.EMPHASIZED,
      },
      opacity: {
        duration: reduceMotion ? DURATION.VERY_FAST : DURATION.NORMAL,
        delay: cardDelay,
        ease: EASING.EASE_OUT,
      },
      zIndex: {
        delay: cardDelay,
        duration: DURATION.INSTANT,
      },
    },
  };
}

function getScrollableCardClassName(className, link) {
  if (link?.isOverlay || link?.isConfirmation || link?.isSurface) {
    return cn(className, 'top-auto bottom-0 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain');
  }

  return className;
}

function getContentTransition(reduceMotion, delay = 0) {
  if (reduceMotion) {
    return {
      duration: DURATION.VERY_FAST,
      delay: 0,
      ease: EASING.EASE_OUT,
    };
  }

  return {
    duration: DURATION.FAST,
    delay,
    ease: EASING.SMOOTH,
  };
}

function getContentVariants(reduceMotion, { baseDelay = 0, distance = 14 } = {}) {
  return {
    container: {
      initial: {},
      animate: {
        transition: reduceMotion
          ? undefined
          : {
              staggerChildren: 0.045,
              delayChildren: baseDelay,
            },
      },
      exit: {},
    },
    item: {
      initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance * 0.35 },
      animate: { opacity: 1, y: 0 },
      exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 },
      transition: getContentTransition(reduceMotion, baseDelay),
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

function getItemMeasurementKey({ link, expanded, isHovered, isStackHovered }) {
  const state = getNavItemMode(link);

  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${isHovered ? 'hovered' : 'idle'}:${isStackHovered ? 'stack' : 'base'}`;
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
        isImageIcon ? 'bg-cover bg-center bg-no-repeat' : 'rounded-[8px] border border-black/5 bg-white'
      )}
      style={isImageIcon ? { backgroundImage: `url(${icon})` } : undefined}
      transition={{
        duration: DURATION.FAST,
        ease: EASING.SMOOTH,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!isImageIcon && <Iconify icon={icon} size={14} className={'text-[#831843]'} />}
    </motion.div>
  );
}

function Badge({ badge }) {
  return (
    <AnimatePresence>
      {badge.visible && (
        <motion.div
          className={cn(
            'center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring'
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          {badge.value}
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  const reduceMotion = useReducedMotion();
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();
  const contentMotion = useMemo(() => getContentVariants(reduceMotion), [reduceMotion]);

  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo, link });
  const description = getItemDescription({ expanded, isHovered, link });
  const iconHoverState = expanded ? isHovered : isStackHovered;

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
    <motion.div
      ref={contentContainerRef}
      className="relative flex h-auto w-full flex-col gap-0"
      variants={contentMotion.container}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="relative flex w-full items-center space-x-3">
        <motion.div className="center relative" variants={contentMotion.item}>
          {link.icon ? (
            <div
              className={link.onClick || showVideoIcon ? 'relative cursor-pointer transition-transform' : 'relative'}
              onClick={handleIconClick}
            >
              <BadgeIcon
                isStackHovered={iconHoverState}
                icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
                style={itemStyle.icon}
              />

              {showVideoIcon && <VideoOverlayIcon icon={link.icon} />}
            </div>
          ) : (
            <div className="h-12" />
          )}
          <Badge badge={badge} />
        </motion.div>
        <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
          <motion.div
            className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5"
            variants={contentMotion.item}
          >
            <div className="flex items-center gap-1.5">
              <Title text={link.title || link.name} style={itemStyle.title} />
            </div>
            <Description text={description} style={itemStyle.description} />
          </motion.div>
          {isTop && link.type !== 'COUNTDOWN' && (
            <motion.div variants={contentMotion.item}>
              <NavActionsContainer activeItem={link} />
            </motion.div>
          )}
        </div>
      </div>

      {footerNode ? (
        <motion.div ref={footerRef} className="w-full pt-2.5" variants={contentMotion.item}>
          {footerNode}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function ConfirmationItemContent({ link, itemStyle, contentContainerRef }) {
  const reduceMotion = useReducedMotion();
  const contentMotion = useMemo(
    () => getContentVariants(reduceMotion, { baseDelay: 0.03, distance: 12 }),
    [reduceMotion]
  );

  return (
    <motion.div
      ref={contentContainerRef}
      className="flex w-full flex-col gap-3 px-1 py-1"
      variants={contentMotion.container}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {link.icon ? (
        <motion.div className="self-start" variants={contentMotion.item}>
          <BadgeIcon isStackHovered={false} icon={link.icon} style={itemStyle.icon} />
        </motion.div>
      ) : null}

      <motion.div className="flex flex-col gap-1.5" variants={contentMotion.item}>
        <Title text={link.title || link.name} style={itemStyle.title} />
        {link.description ? <Description text={link.description} style={itemStyle.description} maxLines={6} /> : null}
      </motion.div>
    </motion.div>
  );
}

function SurfaceItemContent({ link, contentContainerRef }) {
  const SurfaceComponent = link.surfaceComponent;
  const surfaceContent = link.surfaceContent;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={contentContainerRef}
      className="relative w-full"
      onClick={(event) => event.stopPropagation()}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={getContentTransition(reduceMotion, 0.02)}
    >
      {typeof SurfaceComponent === 'function' ? (
        <SurfaceComponent close={link.closeSurface} {...link.surfaceProps} />
      ) : (
        surfaceContent
      )}
    </motion.div>
  );
}

function LoadingItemContent({ contentContainerRef }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={contentContainerRef}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
      transition={getContentTransition(reduceMotion)}
    >
      <Skeleton />
    </motion.div>
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
      expanded,
      position,
      onClick,
      isTop,
      link,
      isActive,
    },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);

    const pathname = usePathname();
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const { isAuthenticated, isReady } = useAuth();

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname);

    const actionContainerRef = useRef(null);
    const contentContainerRef = useRef(null);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;

    const itemStyle = useMemo(() => {
      return resolveNavVisualStyle(link.style, {
        isActive,
        isHovered: showBorder,
      });
    }, [link.style, isActive, showBorder]);

    const actionNode = useMemo(() => {
      return getActionNode(link, ActionComponent);
    }, [link, ActionComponent]);
    const cardProps = useMemo(() => {
      const resolvedCardProps = getNavItemCardProps(expanded, position, showBorder, itemStyle.card, itemStyle.scale, {
        reduceMotion,
      });

      if (!link.isSurface) {
        return resolvedCardProps;
      }

      return {
        ...resolvedCardProps,
        className: cn(resolvedCardProps.className, 'cursor-default'),
      };
    }, [expanded, position, showBorder, itemStyle.card, itemStyle.scale, link.isSurface, reduceMotion]);
    const cardClassName = useMemo(() => getScrollableCardClassName(cardProps.className, link), [cardProps.className, link]);

    useActionHeight(onActionHeightChange, actionContainerRef, actionNode, isTop);

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
    );

    const handleMouseEnter = () => {
      if (link.isOverlay) return;

      setIsHovered(true);

      if (link.path) {
        const targetPath =
          isReady && !isAuthenticated && normalizeNavPathname(link.path) === '/account'
            ? buildNavSignInHref(link.path)
            : link.path;

        router.prefetch(targetPath);
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
        className={cardClassName}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {renderContent()}

        {actionNode && (
          <motion.div
            ref={actionContainerRef}
            onClick={(event) => event.stopPropagation()}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={getContentTransition(reduceMotion, 0.06)}
          >
            <Suspense>{actionNode}</Suspense>
          </motion.div>
        )}
      </motion.div>
    );
  })
);

export default Item;
