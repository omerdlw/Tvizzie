'use client';

import { forwardRef, Suspense, useState, useMemo, useRef, memo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AnimatePresence, motion } from 'framer-motion';

import { useElementHeight, useActionHeight, useNavBadge } from '@/core/modules/nav/hooks';
import { useActionComponent } from '@/core/modules/nav/inline-action-model';

import { LoadingItemContent, StandardItemContent, SurfaceItemContent } from './item-content';
import {
  estimateCompactCardWidth,
  getItemMeasurementKey,
  getNavItemCardProps,
  getRouteMeasurementKey,
} from './item-model';
import { NAV_ACTION_PANEL_MOTION } from '@/core/modules/motion';
import { resolveNavVisualStyle } from './utils';

const Item = memo(
  forwardRef(function Item(
    {
      onActionHeightChange,
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
      isMobile,
      containerHeight,
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

    const actionNode = ActionComponent;
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
        {...getNavItemCardProps({
          expanded,
          position,
          showBorder,
          cardStyle: itemStyle.card,
          cardScale: itemStyle.scale,
          cardWidth,
          isMobile,
          containerHeight,
          isAnchoredToBottom: link.isSurface,
          globalCompact,
        })}
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
