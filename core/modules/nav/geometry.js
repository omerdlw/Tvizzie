import { NAV_CARD_LAYOUT } from './item-model';

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

export function getContainerHeight({ actionHeight, activeItemHasAction, cardContentHeight, compact, isMobile }) {
  const chromeHeight = isMobile ? 14 : 20;
  const minCardHeight = compact
    ? NAV_CARD_LAYOUT.compactHeight
    : (activeItemHasAction && isMobile ? 54 : NAV_CARD_LAYOUT.baseHeight);
  const nextCardHeight = Math.max(minCardHeight, cardContentHeight + chromeHeight);
  const nextActionHeight = !compact && activeItemHasAction && actionHeight > 0 ? actionHeight : 0;
  const rawHeight = nextCardHeight + nextActionHeight;

  return Math.min(rawHeight, getViewportMaxHeight());
}

export function getNavCardWidth() {
  if (typeof window === 'undefined') {
    return 460;
  }

  return window.innerWidth >= 640 ? 460 : Math.max(window.innerWidth - 16, 0);
}
