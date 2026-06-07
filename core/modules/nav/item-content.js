'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { Skeleton } from '@/ui/skeletons/components/nav';
import { default as Iconify } from '@/ui/icon';

import { NavActionsContainer } from './toolbar-actions/container';
import { Icon as BadgeIcon, Description, Title } from './elements';
import NavSurfaceShell from '../../../features/navigation/surfaces/surface-shell';
import { getItemDescription, isImageIconSource, shouldShowVideoIcon } from './item-model';
import { NAV_BADGE_MOTION, NAV_INLINE_SURFACE_PANEL_MOTION, NAV_VIDEO_ICON_MOTION } from '@/core/modules/motion';

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
      {badge.visible ? (
        <motion.div
          key={badge.value}
          className={cn(
            'center ring-info text-info absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1.5 py-0.5 text-[11px] font-semibold ring'
          )}
          {...NAV_BADGE_MOTION}
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function StandardItemContent({
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
                  className: cn(itemStyle.title?.className, 'text-[14px] sm:text-[16px]'),
                }}
              />
            </div>
            <Description text={description} style={itemStyle.description} />
          </div>
          {isTop && link.type !== 'COUNTDOWN' ? <NavActionsContainer activeItem={link} /> : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {footerNode ? (
          <motion.div
            key="nav-surface-footer"
            ref={footerRef}
            className="w-full overflow-hidden pt-2.5"
            style={{ transformOrigin: 'bottom center', willChange: 'height, opacity, clip-path, transform, filter' }}
            {...NAV_INLINE_SURFACE_PANEL_MOTION}
          >
            {footerNode}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SurfaceItemContent({ link, contentContainerRef }) {
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
      <div ref={contentContainerRef} className="w-full">
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

export function LoadingItemContent({ contentContainerRef }) {
  return (
    <div ref={contentContainerRef}>
      <Skeleton />
    </div>
  );
}
