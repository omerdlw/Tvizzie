'use client';

import React, { forwardRef, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useElementHeight, useNavBadge } from '@/core/modules/nav/hooks';
import {
  NAV_BADGE_TRANSITION,
  NAV_CARD_SPRING,
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
} from '@/core/modules/nav/motion';
import { cn } from '@/core/utils/classnames';
import Iconify from '@/ui/icon';
import { Skeleton } from '@/ui/skeletons/components/nav';

import { NavActionsContainer } from './actions';
import { Description, Icon as BadgeIcon, Title } from './elements';
import {
  estimateCompactCardWidth,
  getItemDescription,
  getItemMeasurementKey,
  getNavItemCardProps,
  getRouteMeasurementKey,
  isImageIconSource,
  shouldShowVideoIcon,
} from './layout';
import NavSurfaceShell from './surface';
import { resolveNavVisualStyle, shouldRenderInlineAction } from './utils';

// --- HELPER FUNCTIONS ---

function resolveInlineActionNode(action) {
  if (React.isValidElement(action)) return action;

  if (typeof action === 'function') {
    const ActionComponent = action;
    return <ActionComponent />;
  }

  return null;
}

function useActionComponent(link, pathname) {
  const { action, isLoading, isOverlay, path } = link;

  return useMemo(() => {
    if (!shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname)) {
      return null;
    }

    return resolveInlineActionNode(action);
  }, [action, isLoading, isOverlay, path, pathname]);
}

// --- SUB COMPONENTS ---

function VideoOverlayIcon({ icon }) {
  const isImageIcon = isImageIconSource(icon);

  return (
    <div
      className={cn(
        'pointer-events-none absolute -top-1 -right-1 z-10 flex size-6 items-center justify-center',
        isImageIcon ? 'bg-cover bg-center bg-no-repeat' : 'border border-black/5 bg-white',
      )}
      style={isImageIcon ? { backgroundImage: `url(${icon})` } : undefined}
    >
      {!isImageIcon && <Iconify icon={icon} size={14} className="text-black" />}
    </div>
  );
}

function Badge({ badge }) {
  return (
    <AnimatePresence mode="wait">
      {badge?.visible ? (
        <motion.div
          key={badge.value}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={NAV_BADGE_TRANSITION}
          className="center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1.5 py-0.5 text-[11px] font-semibold ring"
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LoadingItemContent() {
  return (
    <div>
      <Skeleton />
    </div>
  );
}

function SurfaceItemContent({ link }) {
  const SurfaceComponent = link.surfaceComponent;
  const surfaceContent = link.surfaceContent;
  const icon = link.surfaceIcon ?? link.icon ?? null;
  const title = link.surfaceTitle ?? link.title ?? link.name ?? '';
  const description = link.surfaceDescription ?? link.description ?? '';
  const trailing = link.surfaceTrailing ?? link.trailing ?? null;
  const closeLabel = link.surfaceCloseLabel ?? link.closeLabel ?? 'Close surface';
  const onClose = link.dismissible === false ? null : link.closeSurface || link.onClose;

  return (
    <div className="relative w-full overflow-visible" onClick={(event) => event.stopPropagation()}>
      <div className="w-full">
        <NavSurfaceShell
          icon={icon}
          title={title}
          description={description}
          trailing={trailing}
          onClose={onClose}
          closeLabel={closeLabel}
          descriptionMaxLines={2}
          contentClassName="w-full"
        >
          {typeof SurfaceComponent === 'function' ? (
            <SurfaceComponent close={link.closeSurface} {...link.surfaceProps} />
          ) : (
            surfaceContent
          )}
        </NavSurfaceShell>
      </div>
    </div>
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
  footerNode,
  footerRef,
}) {
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();
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
    <div className="relative flex h-auto w-full flex-col gap-0">
      <div className="relative flex w-full items-center space-x-3">
        <div className="center relative">
          {link.icon ? (
            <div
              className={link.onClick || showVideoIcon ? 'relative cursor-pointer' : 'relative'}
              onClick={handleIconClick}
            >
              <BadgeIcon
                isStackHovered={iconHoverState}
                icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
                iconOverlay={showVideoIcon ? null : link.iconOverlay}
                style={itemStyle.icon}
              />
              {showVideoIcon ? <VideoOverlayIcon icon={link.icon} /> : null}
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
                  className: cn(itemStyle.title?.className, 'text-[16px]'),
                }}
              />
            </div>
            <Description text={description} style={itemStyle.description} />
          </div>
          {isTop && link.type !== 'COUNTDOWN' ? <NavActionsContainer activeItem={link} /> : null}
        </div>
      </div>

      {footerNode ? (
        <div key="nav-surface-footer" ref={footerRef} className="w-full overflow-hidden pt-2.5">
          {footerNode}
        </div>
      ) : null}
    </div>
  );
}

// --- MAIN ITEM COMPONENT ---

const Item = memo(
  forwardRef(function Item(
    {
      onContentHeightChange,
      isStackHovered,
      onMouseEnter,
      onMouseLeave,
      compact,
      globalCompact,
      expanded,
      position,
      onClick,
      isTop,
      link,
      isActive,
      stackWidth,
      cardWidth: cardWidthProp,
      containerHeight,
    },
    ref,
  ) {
    const [isHovered, setIsHovered] = useState(false);
    const [isExpandingOrCollapsing, setIsExpandingOrCollapsing] = useState(false);

    const pathname = usePathname();
    const router = useRouter();

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname);

    const cardContentRef = useRef(null);
    const prevExpandedRef = useRef(expanded);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;
    const cardWidth =
      cardWidthProp ||
      (compact ? estimateCompactCardWidth(link.title || link.name, stackWidth) : stackWidth);

    const itemStyle = useMemo(
      () => resolveNavVisualStyle(link.style, { isActive, isHovered: showBorder }),
      [link.style, isActive, showBorder],
    );

    const renderedActionNode = link.isSurface ? null : ActionComponent;

    useElementHeight(
      onContentHeightChange,
      cardContentRef,
      isTop,
      getRouteMeasurementKey(
        pathname,
        getItemMeasurementKey({ link, expanded, isHovered, isStackHovered, compact }),
      ),
    );

    useEffect(() => {
      if (prevExpandedRef.current !== expanded) {
        prevExpandedRef.current = expanded;
        setIsExpandingOrCollapsing(true);
        const timer = setTimeout(() => setIsExpandingOrCollapsing(false), 550);
        return () => clearTimeout(timer);
      }
    }, [expanded]);

    const handleMouseEnter = () => {
      if (link.isOverlay) return;
      setIsHovered(true);

      if (link.path) router.prefetch(link.path);
      if (!expanded) onMouseEnter?.();
    };

    const handleMouseLeave = () => {
      if (link.isOverlay) return;
      setIsHovered(false);
      if (!expanded) onMouseLeave?.();
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
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      onClick?.(event);
    };

    const renderContent = () => {
      if (link.isLoading) return <LoadingItemContent />;
      if (link.isSurface) return <SurfaceItemContent link={link} />;

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
          footerNode={null}
          footerRef={null}
        />
      );
    };

    const {
      className: cardClassName,
      style: cardStyle,
      motionValues,
    } = getNavItemCardProps({
      expanded,
      position,
      showBorder,
      cardStyle: itemStyle.card,
      cardScale: itemStyle.scale,
      cardWidth,
      containerHeight,
      isAnchoredToBottom: link.isSurface,
      globalCompact,
      compact,
      pathname,
      isHovered,
      isStackHovered,
      visibleCount: (globalCompact && !isStackHovered) || link.isStatus ? 1 : 3,
    });

    return (
      <motion.div
        ref={ref}
        className={cardClassName}
        style={{ ...cardStyle, willChange: 'transform, filter, opacity' }}
        initial={false}
        animate={{
          ...(motionValues.width !== undefined ? { width: motionValues.width } : {}),
          y: motionValues.y,
          scale:
            isStackHovered && position > 0
              ? [
                  motionValues.scale,
                  motionValues.scale * 1.05,
                  motionValues.scale * 0.98,
                  motionValues.scale,
                ]
              : motionValues.scale,
          opacity: motionValues.opacity,
          filter:
            isExpandingOrCollapsing && position > 0
              ? [
                  'blur(14px) brightness(1.12)',
                  'blur(5px) brightness(1.04)',
                  'blur(0px) brightness(1)',
                ]
              : isStackHovered && position > 0
                ? [
                    'brightness(1) blur(0px)',
                    'brightness(1.4) blur(4px)',
                    'brightness(1) blur(0px)',
                  ]
                : 'blur(0px) brightness(1)',
        }}
        transition={{
          ...NAV_CARD_SPRING,
          filter:
            isExpandingOrCollapsing && position > 0
              ? { duration: 0.55, ease: [0.16, 1, 0.24, 1] }
              : isStackHovered && position > 0
                ? {
                    duration: 0.5,
                    delay: 0.5 + (position - 1) * 0.1,
                    ease: 'easeInOut',
                  }
                : undefined,
          scale:
            isStackHovered && position > 0
              ? {
                  duration: 0.5,
                  delay: 0.5 + (position - 1) * 0.1,
                  ease: 'easeInOut',
                }
              : undefined,
        }}
        role="button"
        tabIndex={link.isOverlay ? -1 : 0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <AnimatePresence mode="wait">
          {compact && (
            <motion.div
              key="compact-title-overlay"
              variants={textCrossfadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_FADE_TRANSITION}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[38px] items-center justify-center px-5"
            >
              <div className="min-w-0">
                <Title
                  text={link.title || link.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(
                      'tracking-tight normal-case text-center text-[14px]',
                      itemStyle.title?.className,
                    ),
                    textTransform: 'none',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          ref={cardContentRef}
          className="flow-root w-full"
          animate={{ opacity: compact ? 0 : 1 }}
          transition={NAV_FADE_TRANSITION}
          style={{
            pointerEvents: compact ? 'none' : 'auto',
            overflow: compact ? 'hidden' : 'visible',
          }}
        >
          {renderContent()}

          <AnimatePresence mode="popLayout">
            {renderedActionNode && (
              <motion.div
                key="nav-action-component"
                variants={textCrossfadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={NAV_FADE_TRANSITION}
                className="flow-root overflow-visible"
                style={{ overflow: 'visible' }}
                onClick={(event) => event.stopPropagation()}
              >
                <Suspense>{renderedActionNode}</Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }),
);

export default Item;
