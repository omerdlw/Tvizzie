import { cn } from '@/core/utils/classnames';
import {
  getNavCardSpring,
  getNavCardStaggerDelay,
  NAV_CARD_BLUR_TRANSITION,
  NAV_CARD_OPACITY_TRANSITION,
  NAV_CARD_WIDTH_SPRING,
  NAV_CONTAINER_SPRING,
  NAV_DEFAULT_TRANSITION,
} from '@/core/modules/motion';

export const NAV_VIEWPORT_GAP = 4;
export const NAV_HEIGHT_BUFFER = 16;

function getNavStackOffset(cardHeight) {
  return -(cardHeight + NAV_VIEWPORT_GAP);
}

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

export function estimateCompactCardWidth(title, stackWidth) {
  const titleLength = String(title || '').trim().length;
  const estimatedWidth = titleLength * 10 + COMPACT_CARD_HORIZONTAL_PADDING;
  const maxWidth = Math.max(COMPACT_CARD_MIN_WIDTH, stackWidth - COMPACT_CARD_MAX_OFFSET);

  return clamp(estimatedWidth, COMPACT_CARD_MIN_WIDTH, maxWidth);
}

function getExpandedItemY(position, isMobile) {
  const baseExpandedOffsetY = isMobile ? -68 : NAV_CARD_LAYOUT.expanded.offsetY;
  return position * baseExpandedOffsetY;
}

export function getNavItemCardProps({
  cardScale,
  cardStyle,
  cardWidth,
  containerHeight,
  expanded,
  isAnchoredToBottom,
  isMobile,
  position,
  showBorder,
  globalCompact,
}) {
  const { offsetY: collapsedOffsetY, scale: collapsedScale } = NAV_CARD_LAYOUT.collapsed;
  const safeCardStyle = cardStyle
    ? Object.fromEntries(Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'))
    : {};

  const staggerDelay = getNavCardStaggerDelay(position, expanded);
  const spring = getNavCardSpring(position);
  const isTop = position === 0;
  const collapsedScaleValue = collapsedScale ** position;

  return {
    className: cn(
      'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer border-[1.5px] p-1.5 sm:p-2 backdrop-blur-lg',
      isAnchoredToBottom && 'bottom-0',
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
      y: expanded ? getExpandedItemY(position, isMobile) : position * collapsedOffsetY,
      scale: expanded ? cardScale || 1 : collapsedScaleValue,
      zIndex: 10 - position,
      opacity: 1,
      filter: isTop
        ? expanded
          ? ['blur(0px)', 'blur(1.5px)', 'blur(0.001px)']
          : ['blur(0.001px)', 'blur(1.2px)', 'blur(0px)']
        : expanded
          ? ['blur(0px)', 'blur(2.2px)', 'blur(0.001px)']
          : ['blur(0.001px)', 'blur(1.8px)', 'blur(0px)'],
      ...(isTop && containerHeight ? { height: containerHeight } : {}),
    },
    initial: {
      opacity: 0,
      scale: 0.96,
      y: 12,
      filter: `blur(${BLUR_AMOUNT}px)`,
      width: isTop ? cardWidth : isMobile ? 120 : 160,
    },
    exit: {
      opacity: 0,
      scale: isTop ? 0.96 : globalCompact ? collapsedScaleValue * 0.9 : collapsedScaleValue,
      y: isTop ? 4 : globalCompact ? position * collapsedOffsetY - 4 : position * collapsedOffsetY,
      width: globalCompact ? (isMobile ? 120 : 160) : cardWidth,
      filter: isTop ? `blur(${Math.round(BLUR_AMOUNT * 0.6)}px)` : 'blur(4px)',
      transition: {
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
        filter: { duration: 0.18 },
        opacity: { duration: 0.2 },
        width: { ...NAV_CARD_WIDTH_SPRING },
        scale: { ...spring },
        y: { ...spring },
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

export function isImageIconSource(icon) {
  return (
    typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

export function shouldShowVideoIcon({ isActive, isVideo, link }) {
  return isActive && isVideo && link.type !== 'COUNTDOWN';
}

export function getItemMeasurementKey({ link, expanded, isHovered, isStackHovered, compact }) {
  const state = link.isLoading ? 'loading' : link.isSurface ? 'surface' : 'standard';

  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${isHovered ? 'hovered' : 'idle'}:${isStackHovered ? 'stack' : 'base'}:${compact ? 'compact' : 'full'}`;
}

export function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ''}:${key}`;
}

export function getItemDescription({ expanded, isHovered, link }) {
  if (isHovered && !expanded && !link.isOverlay && link.type !== 'COUNTDOWN') {
    return 'click to see the pages';
  }

  return link.description;
}
