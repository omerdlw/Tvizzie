'use client';

import React, {
  Suspense,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';

import { globalEvents } from '@/shared';
import { NAV_EVENTS, NAV_SURFACE_PHASE } from './constants';
import {
  getImageIconStyle,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  isImageIconSource,
  isValidComponentType,
  resolveNavVisualStyle,
  shouldRenderInlineAction,
  splitStyle,
} from './utils';
import {
  NAV_ACTION_DISMISS_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_HEADER_SWAP_TRANSITION,
  NAV_ICON_TRANSITION,
  NAV_SURFACE_BODY_ENTER_TRANSITION,
  NAV_SURFACE_BODY_EXIT_TRANSITION,
  NAV_TEXT_ENTER_TRANSITION,
  getNavCardContentAnimateProps,
  getNavCardDelay,
  getNavDescriptionVariants,
  getNavItemAnimateValues,
  getNavItemTransition,
  navActionDismissVariants,
  navBadgeVariants,
  navFadeVariants,
  navIconVariants,
  navHeaderSwapVariants,
  navHeaderRestoreVariants,
  navSurfaceBodyVariants,
  textCrossfadeVariants,
} from './motion';
import { getNavItemCardProps, useElementHeight } from './layout';
import { resolveNavigationRoutePolicy, useRoutePrefetch } from './routing';
import { NavHudView } from './hud';
import { NavCommandBar } from './commands';
import { NavSurfaceShell } from './surface';
import { NavMediaControls, NavMediaScrubber } from './media';
import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Iconify from '@/ui/primitives/icon';

// ── Card presentation primitives ─────────────────────────────────────────────

function shouldShowVideoIcon({ isActive, isVideo }) {
  return Boolean(isActive && isVideo);
}

function renderIconNode(icon, size) {
  return typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon;
}

/**
 * Renders animated navigation description text.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavDescription = memo(function NavDescription({ text, style, maxLines = 1 }) {
  const { className, inlineStyle } = splitStyle(style);
  const { opacity = 0.7, ...restStyle } = inlineStyle;
  const isMultiline = Number(maxLines) > 1;
  const targetOpacity = typeof opacity === 'number' ? opacity : 0.7;

  return (
    <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={typeof text === 'string' || typeof text === 'number' ? text : 'desc'}
          variants={getNavDescriptionVariants(targetOpacity)}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          className={cn(
            isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
            'text-white',
            className,
          )}
          style={{ opacity: targetOpacity, ...getLineClampStyle(maxLines, restStyle) }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

const NavIconOverlay = memo(function NavIconOverlay({ overlay }) {
  if (!overlay?.icon) return null;

  const { icon, onClick, title = '' } = overlay;
  const isImageSource = isImageIconSource(icon);
  const isInteractive = typeof onClick === 'function';

  const content = isImageSource ? (
    <span
      className="size-full rounded-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${icon})` }}
    />
  ) : (
    <span className="text-white">{renderIconNode(icon, 12)}</span>
  );

  const sharedClassName = cn(
    'absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black ring ring-black',
    isInteractive ? 'cursor-pointer' : 'cursor-default',
  );

  return (
    <AnimatePresence mode="popLayout">
      {isInteractive ? (
        <Button
          key={icon}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onClick?.(event);
          }}
          title={title || undefined}
          aria-label={title || 'Action'}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </Button>
      ) : (
        <motion.div
          key={icon}
          title={title || undefined}
          aria-label={title || undefined}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * Renders an animated navigation icon with an optional overlay action.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavIcon = memo(function NavIcon({
  icon,
  iconOverlay = null,
  style,
  onClick = null,
  ariaLabel = undefined,
}) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;
  const isImageSource = isImageIconSource(icon);
  const iconKey = typeof icon === 'string' ? icon : 'icon-node';

  const iconElement = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={iconKey}
        variants={navIconVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_ICON_TRANSITION}
        className="size-full"
      >
        {isImageSource ? (
          <div
            className={cn(
              'size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat',
              className,
            )}
            style={{
              ...getImageIconStyle(iconStyle, icon),
            }}
          />
        ) : (
          <div
            className={cn(
              'center size-12 rounded-[20px] bg-white/5 text-white',
              className,
            )}
            style={iconStyle}
          >
            <span>{renderIconNode(icon, size)}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="relative size-12 shrink-0">
      {typeof onClick === 'function' ? (
        <Button
          type="button"
          className="size-full cursor-pointer p-0"
          onClick={onClick}
          aria-label={ariaLabel || 'Open'}
        >
          {iconElement}
        </Button>
      ) : (
        iconElement
      )}
      <NavIconOverlay overlay={iconOverlay} />
    </div>
  );
});

/**
 * Renders animated navigation title text.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavTitle = memo(function NavTitle({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h3
          key={typeof text === 'string' || typeof text === 'number' ? text : 'title'}
          className={cn('truncate font-bold', className)}
          variants={navFadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
});

/**
 * Renders page scroll progress on the active navigation card.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
// ── Card item state and action resolution ────────────────────────────────────

function useNavBadge(navKey, initialBadge) {
  const [badge, setBadge] = useState({
    visible: Boolean(initialBadge),
    value: initialBadge,
    color: 'bg-white/5',
  });

  useEffect(() => {
    const unsubscribe = globalEvents.subscribe(NAV_EVENTS.UPDATE_BADGE, (data) => {
      if (data.key === navKey) {
        setBadge({
          visible: data.value !== undefined && data.value !== null && data.value !== '',
          color: data.color,
          value: data.value,
        });
      }
    });
    return () => unsubscribe();
  }, [navKey]);

  return badge;
}

function resolveInlineActionNode(action) {
  if (React.isValidElement(action)) return action;

  if (typeof action === 'function') {
    const ActionComponent = action;
    return <ActionComponent />;
  }

  return null;
}

function useActionComponent(link, pathname, { isTop = false } = {}) {
  const { action, isLoading, isOverlay, path } = link;
  const { isVideo } = useBackgroundState();

  return useMemo(() => {
    if (isLoading || isOverlay || link.isSurface) {
      return null;
    }

    if (isTop && isVideo) {
      return <NavMediaControls />;
    }

    if (!shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname)) {
      return null;
    }

    return resolveInlineActionNode(action);
  }, [action, isLoading, isOverlay, isTop, isVideo, link.isSurface, path, pathname]);
}

function Badge({ badge }) {
  return (
    <AnimatePresence mode="wait">
      {badge?.visible ? (
        <motion.div
          key={badge.value}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className="absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black text-xs font-semibold text-white ring ring-black"
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LoadingItemContent() {
  return (
    <div className="flex h-auto w-full items-center gap-2.5">
      <div className="skeleton-block size-12 shrink-0 animate-pulse rounded-[20px]" />
      <div className="flex flex-1 flex-col justify-center space-y-2">
        <div className="skeleton-block h-4 w-52 animate-pulse rounded-full" />
        <div className="skeleton-block-soft h-3 w-80 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

// ── Card item rendering ──────────────────────────────────────────────────────

function SurfaceItemContent({ link }) {
  const SurfaceComponent = link.surfaceComponent;
  const surfaceContent = link.surfaceContent;
  const icon = link.surfaceIcon ?? link.icon ?? null;
  const title = link.surfaceTitle ?? link.title ?? link.name ?? '';
  const description = link.surfaceDescription ?? link.description ?? '';
  const trailing = link.surfaceTrailing ?? link.trailing ?? null;
  const headerAction = link.surfaceHeaderAction ?? null;
  const closeLabel = link.surfaceCloseLabel ?? link.closeLabel ?? 'Close surface';
  const onClose =
    link.dismissible === false ? null : link.closeAllSurfaces || link.closeSurface || link.onClose;
  const onBack = link.onBack || (link.canGoBack ? link.popStep || link.closeSurface : null);

  return (
    <div className="relative w-full overflow-visible" onClick={(event) => event.stopPropagation()}>
      <div className="w-full">
        <NavSurfaceShell
          icon={icon}
          title={title}
          description={description}
          trailing={trailing}
          headerAction={headerAction}
          onClose={onClose}
          onBack={onBack}
          stepIndex={link.stepIndex ?? 0}
          totalSteps={link.totalSteps ?? 1}
          badge={link.badge ?? null}
          allowSwipeDismiss={link.allowSwipeDismiss !== false}
          closeLabel={closeLabel}
          descriptionMaxLines={link.surfaceDescriptionMaxLines ?? 2}
          onAnimationComplete={link.onAnimationComplete}
          surfacePhase={link.surfacePhase}
          contentClassName="w-full"
        >
          {isValidComponentType(SurfaceComponent) ? (
            <SurfaceComponent
              close={link.closeSurface}
              closeAll={link.closeAllSurfaces}
              pushStep={link.pushStep}
              popStep={link.popStep}
              goToStep={link.goToStep}
              stepIndex={link.stepIndex ?? 0}
              totalSteps={link.totalSteps ?? 1}
              isFirstStep={link.isFirstStep ?? true}
              isLastStep={link.isLastStep ?? true}
              {...link.surfaceProps}
            />
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
  itemStyle,
  badge,
  isActive,
  footerNode,
  isHudActive = false,
  hud = null,
  clearHud = null,
  contextCommands = [],
  pathname,
}) {
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();
  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo });
  const description = link.description;

  const effectiveIconOverlay = showVideoIcon ? null : link.iconOverlay;
  const isIconInteractive = Boolean(link.onClick || showVideoIcon);

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

  if (isTop && isHudActive) {
    return (
      <div className="relative flex w-full items-center justify-between">
        <NavHudView clearHud={clearHud} hud={hud} pathname={pathname} />
      </div>
    );
  }

  return (
    <div className="relative flex h-auto w-full flex-col gap-2.5">
      <div className="relative flex w-full items-center gap-2.5">
        <div className="center relative">
          {link.icon ? (
            <NavIcon
              icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
              iconOverlay={effectiveIconOverlay}
              style={itemStyle.icon}
              onClick={isIconInteractive ? handleIconClick : null}
              ariaLabel={
                isIconInteractive
                  ? showVideoIcon
                    ? isPlaying
                      ? 'Pause video'
                      : 'Play video'
                    : 'Open'
                  : undefined
              }
            />
          ) : (
            <div className="h-12" />
          )}
          {!showVideoIcon && !effectiveIconOverlay && <Badge badge={badge} />}
        </div>

        <div className="relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5">
              <NavTitle
                text={link.title || link.name}
                style={{
                  ...itemStyle.title,
                  className: cn(itemStyle.title?.className, 'text-base'),
                }}
              />
            </div>
            <NavDescription text={description} style={itemStyle.description} />
          </div>
          {isTop ? <NavCommandBar activeItem={link} contextCommands={contextCommands} /> : null}
        </div>
      </div>

      {footerNode ? (
        <div key="nav-surface-footer" className="relative z-10 w-full overflow-visible">
          {footerNode}
        </div>
      ) : null}
    </div>
  );
}

export const NavCardItem = memo(
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
      statusStyle = null,
      isHudActive = false,
      hud = null,
      clearHud = null,
      contextCommands = [],
    },
    ref,
  ) {
    const [isHovered, setIsHovered] = useState(false);

    const pathname = usePathname();
    const router = useRouter();
    const { cancelRoutePrefetch, prefetchRoute } = useRoutePrefetch(router);

    const { isVideo } = useBackgroundState();
    const isTopHudActive = Boolean(isTop && isHudActive);
    const showVideoScrubber = Boolean(isTop && isVideo && !link.isSurface);

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname, { isTop });

    const cardContentRef = useRef(null);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;
    const effectiveStyle = useMemo(() => {
      if (!statusStyle) return link.style;
      if (!link.style) return statusStyle;
      return {
        ...statusStyle,
        ...link.style,
        card: {
          ...statusStyle.card,
          ...link.style.card,
        },
        icon: {
          ...statusStyle.icon,
          ...link.style.icon,
        },
        title: {
          ...statusStyle.title,
          ...link.style.title,
        },
        description: {
          ...statusStyle.description,
          ...link.style.description,
        },
      };
    }, [link.style, statusStyle]);

    const itemStyle = useMemo(
      () => resolveNavVisualStyle(effectiveStyle, { isActive, isHovered: showBorder }),
      [effectiveStyle, isActive, showBorder],
    );

    const renderedActionNode = link.isSurface || isTopHudActive ? null : ActionComponent;
    const hasNestedInteractiveContent = Boolean(renderedActionNode || link.isSurface);
    const itemIdentity = link.path || link.name || link.type || 'standard';
    const contentKey = link.isSurface
      ? `surface:${link.surfaceId ?? 'active'}`
      : isTopHudActive
        ? `hud:${hud?.id || 'active'}`
        : `standard:${itemIdentity}`;

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
          isHud: isTopHudActive,
        }),
      ),
    );

    const handleMouseEnter = () => {
      if (link.isOverlay) return;
      setIsHovered(true);

      if (resolveNavigationRoutePolicy({ href: link.path, item: link }).prefetch) {
        prefetchRoute(link.path);
      }
      if (!expanded) onMouseEnter?.();
    };

    const handleMouseLeave = () => {
      if (link.isOverlay) return;
      cancelRoutePrefetch(link.path);
      setIsHovered(false);
      if (!expanded) onMouseLeave?.();
    };

    const handleFocus = () => {
      if (link.isOverlay) return;
      setIsHovered(true);
      if (resolveNavigationRoutePolicy({ href: link.path, item: link }).prefetch) {
        prefetchRoute(link.path, { immediate: true });
      }
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
      return (
        <StandardItemContent
          link={link}
          isTop={isTop}
          itemStyle={itemStyle}
          badge={badge}
          isActive={isActive}
          isHudActive={isTopHudActive}
          hud={hud}
          clearHud={clearHud}
          contextCommands={contextCommands}
          pathname={pathname}
          footerNode={
            renderedActionNode ? (
              <AnimatePresence mode="popLayout" initial={false}>
                {link.surfacePhase === NAV_SURFACE_PHASE.DISMISSING_ACTION ? (
                  <motion.div
                    key="nav-action-component-dismiss"
                    variants={navActionDismissVariants}
                    initial="visible"
                    animate="exit"
                    exit="exit"
                    transition={NAV_ACTION_DISMISS_TRANSITION}
                    className="flow-root overflow-visible"
                    style={{ overflow: 'visible' }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Suspense>{renderedActionNode}</Suspense>
                  </motion.div>
                ) : (
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
            ) : null
          }
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
      cardStyle: itemStyle.card,
      cardScale: itemStyle.scale,
      isAnchoredToBottom: link.isSurface,
      visibleCount: globalCompact && !isStackHovered ? 1 : 3,
    });

    const cardDelay = useMemo(
      () => getNavCardDelay({ expanded, isStackHovered, position }),
      [expanded, isStackHovered, position],
    );

    return (
      <motion.div
        ref={ref}
        className={cardClassName}
        style={cardStyle}
        initial={false}
        animate={getNavItemAnimateValues({
          motionValues,
          isStackHovered,
          position,
        })}
        transition={getNavItemTransition({
          isStackHovered,
          position,
          delay: cardDelay,
        })}
        role={hasNestedInteractiveContent ? 'group' : 'button'}
        aria-label={
          compact
            ? `${link.title || link.name || 'Navigation item'}; click again to expand navigation`
            : undefined
        }
        title={compact ? 'Click again to expand navigation' : undefined}
        tabIndex={link.isOverlay ? -1 : 0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onScroll={(event) => {
          if (event.currentTarget.scrollTop !== 0) {
            event.currentTarget.scrollTop = 0;
          }
        }}
        onClick={onClick}
      >
        {showVideoScrubber && <NavMediaScrubber />}

        <AnimatePresence>
          {compact && (
            <motion.div
              key="compact-title-overlay"
              variants={navFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_FADE_TRANSITION}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[38px] items-center justify-center px-5"
            >
              <div className="min-w-0">
                <NavTitle
                  text={link.title || link.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(
                      'normal-case text-center text-sm underline decoration-dotted underline-offset-2',
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
          animate={getNavCardContentAnimateProps({
            compact,
            expanded,
            position,
          })}
          transition={NAV_FADE_TRANSITION}
          style={{
            pointerEvents: compact || (!expanded && position > 0) ? 'none' : 'auto',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {link.isSurface &&
            link.surfacePhase !== NAV_SURFACE_PHASE.DISMISSING_ACTION &&
            link.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER ? (
              <motion.div
                key="surface-content-layer"
                variants={navHeaderSwapVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={NAV_HEADER_SWAP_TRANSITION}
                style={{
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  WebkitFontSmoothing: 'antialiased',
                }}
                className="w-full"
              >
                <SurfaceItemContent link={link} />
              </motion.div>
            ) : (
              <motion.div
                key="standard-content-layer"
                variants={navHeaderRestoreVariants}
                initial={
                  link.surfacePhase === NAV_SURFACE_PHASE.RESTORING_HEADER
                    ? 'hidden'
                    : 'visible'
                }
                animate="visible"
                exit="exit"
                transition={NAV_HEADER_SWAP_TRANSITION}
                style={{
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  WebkitFontSmoothing: 'antialiased',
                }}
                className="w-full"
              >
                {renderContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }),
);
