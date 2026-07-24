'use client';

import React, { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useElementHeight, useNavBadge } from '@/core/modules/nav/hooks';
import { Skeleton } from '@/ui/skeletons/components/nav';
import Iconify from '@/ui/icon';

import {
  estimateCompactCardWidth,
  getItemMeasurementKey,
  getNavItemCardProps,
  getRouteMeasurementKey,
  getItemDescription,
  isImageIconSource,
  shouldShowVideoIcon,
} from './layout';
import { NavActionsContainer } from './actions';
import { Icon as BadgeIcon, Description, Title } from './elements';
import NavSurfaceShell from './surface';
import { resolveNavVisualStyle, shouldRenderInlineAction } from './utils';
import {
  NAV_CARD_SPRING,
  NAV_FADE_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_TAP_SCALE,
} from '@/core/modules/nav/motion';

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

    const pathname = usePathname();
    const router = useRouter();

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname);

    const cardContentRef = useRef(null);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;
    const cardWidth = cardWidthProp || (compact
      ? estimateCompactCardWidth(link.title || link.name, stackWidth)
      : stackWidth);

    const itemStyle = useMemo(() => {
      return resolveNavVisualStyle(link.style, {
        isActive,
        isHovered: showBorder,
      });
    }, [link.style, isActive, showBorder]);

    const actionNode = ActionComponent;
    const renderedActionNode = link.isSurface ? null : actionNode;

    useElementHeight(
      onContentHeightChange,
      cardContentRef,
      isTop,
      getRouteMeasurementKey(
        pathname,
        getItemMeasurementKey({
          link,
          expanded,
          isHovered,
          isStackHovered,
          compact,
        }),
      ),
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
        return <LoadingItemContent />;
      }

      if (link.isSurface) {
        return <SurfaceItemContent link={link} />;
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
    });

    return (
      <motion.div
        ref={ref}
        className={cardClassName}
        style={cardStyle}
        initial={false}
        animate={{
          ...(motionValues.width !== undefined ? { width: motionValues.width } : {}),
          y: motionValues.y,
          scale: motionValues.scale,
          opacity: motionValues.opacity,
        }}
        transition={NAV_CARD_SPRING}
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
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={NAV_FADE_TRANSITION}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[38px] items-center justify-center px-5"
            >
              <div className="min-w-0">
                <Title
                  text={link.title || link.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(
                      'tracking-tight normal-case text-center',
                      itemStyle.title?.className,
                      'text-[14px]',
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
          className="flow-root w-full overflow-hidden"
          animate={{ opacity: compact ? 0 : 1 }}
          transition={NAV_FADE_TRANSITION}
          style={{ pointerEvents: compact ? 'none' : 'auto' }}
        >
          {renderContent()}

          
          <AnimatePresence mode="wait">
            {renderedActionNode ? (
              <motion.div
                key="nav-action-component"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={NAV_FADE_TRANSITION}
                className="flow-root"
                style={{ overflow: 'hidden' }}
                onClick={(event) => event.stopPropagation()}
              >
                <Suspense>{renderedActionNode}</Suspense>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }),
);

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
          className={cn(
            'center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1.5 py-0.5 text-[11px] font-semibold ring',
          )}
        >
          {badge.value}
        </motion.div>
      ) : null}
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
    <div className="relative w-full overflow-hidden" onClick={(event) => event.stopPropagation()}>
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

function LoadingItemContent() {
  return (
    <div>
      <Skeleton />
    </div>
  );
}

export default Item;
