import { cn } from '@/core/utils/classnames';

export const NAV_VIEWPORT_GAP = 4;
export const NAV_HEIGHT_BUFFER = 16;

function getNavStackOffset(cardHeight) {
  return -(cardHeight + NAV_VIEWPORT_GAP);
}

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 18,
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

function getExpandedItemY(position) {
  return position * NAV_CARD_LAYOUT.expanded.offsetY;
}

export function getNavItemCardProps({
  cardScale,
  cardStyle,
  cardWidth,
  compact,
  containerHeight,
  expanded,
  isAnchoredToBottom,
  position,
  showBorder,
  globalCompact,
  visibleCount = 3,
}) {
  const { offsetY: collapsedOffsetY, scale: collapsedScale } = NAV_CARD_LAYOUT.collapsed;
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded;
  const safeCardStyle = cardStyle
    ? Object.fromEntries(
        Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'),
      )
    : {};

  const isTop = position === 0;
  const collapsedScaleValue = collapsedScale ** position;

  const y = expanded ? position * expandedOffsetY : position * collapsedOffsetY;

  const scale = expanded ? cardScale || 1 : collapsedScaleValue;

  const opacity = expanded || position < visibleCount ? 1 : 0;

  return {
    className: cn(
      'absolute h-auto w-full border rounded-[24px] p-2',
      compact ? 'bg-white' : 'bg-white/80 backdrop-blur-md',
      isAnchoredToBottom || isTop ? 'bottom-0' : 'top-0',
      isAnchoredToBottom ? 'cursor-default' : 'cursor-pointer',
      'border-black/10',
      showBorder && 'border-black/15',
      cardStyle?.className,
    ),
    style: {
      ...safeCardStyle,
      overflow: compact ? 'hidden' : undefined,
      isolation: compact ? undefined : 'isolate',
      left: '50%',
      x: '-50%',
      transformOrigin: isAnchoredToBottom || isTop ? 'bottom center' : 'top center',
      zIndex: 10 - position,
      ...(isTop ? { height: '100%' } : {}),
      pointerEvents: expanded || position < visibleCount ? undefined : 'none',
    },

    // Only expose width for top card (compact pill) — inactive cards use w-full from container.
    motionValues: { width: isTop ? cardWidth : undefined, y, scale, opacity },
  };
}

export function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

export function shouldShowVideoIcon({ isActive, isVideo, link }) {
  return isActive && isVideo && link.type !== 'COUNTDOWN';
}

export function getItemMeasurementKey({ link, expanded, compact }) {
  const state = link.isLoading ? 'loading' : link.isSurface ? 'surface' : 'standard';

  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${compact ? 'compact' : 'full'}`;
}

export function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ''}:${key}`;
}

export function getItemDescription({ link }) {
  return link.description;
}

const VIEWPORT_MARGIN = 24;
export const NAV_SPACER_BOTTOM_LOCK_DISTANCE = 40;

export function getViewportMaxHeight() {
  if (typeof window === 'undefined') return Infinity;
  return window.innerHeight - VIEWPORT_MARGIN;
}

export function getDistanceToBottom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Infinity;
  }

  const root = document.documentElement;
  const maxScrollY = Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
  const scrollY = window.scrollY || 0;
  return Math.max(maxScrollY - scrollY, 0);
}

export function getContainerHeight({ cardContentHeight, compact }) {
  const chromeHeight = NAV_CARD_LAYOUT.chromeHeight;
  const minCardHeight = compact ? NAV_CARD_LAYOUT.compactHeight : NAV_CARD_LAYOUT.baseHeight;
  const nextCardHeight = Math.max(minCardHeight, cardContentHeight + chromeHeight);

  return Math.min(nextCardHeight, getViewportMaxHeight());
}

export function getNavCardWidth(activeItem = null) {
  if (typeof window === 'undefined') {
    return 460;
  }

  const isDesktop = window.innerWidth >= 640;
  if (isDesktop && activeItem) {
    if (activeItem.width) {
      const targetWidth = Number(activeItem.width);
      return Math.min(targetWidth, Math.max(window.innerWidth - 32, 0));
    }
    if (activeItem.expandHorizontal) {
      return Math.min(640, Math.max(window.innerWidth - 32, 0));
    }
  }

  return Math.min(460, Math.max(window.innerWidth - 16, 0));
}
