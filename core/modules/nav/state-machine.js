'use client';

export const NAV_ITEM_MODES = Object.freeze({
  IDLE: 'idle',
  ROUTE_LOADING: 'route_loading',
  PAGE_LOADING: 'page_loading',
  SURFACE: 'surface',
  CONFIRMATION: 'confirmation',
  STATUS_INLINE: 'status_inline',
  STATUS_OVERLAY: 'status_overlay',
});

const NAV_MODE_MIN_CARD_HEIGHTS = Object.freeze({
  [NAV_ITEM_MODES.IDLE]: 0,
  [NAV_ITEM_MODES.ROUTE_LOADING]: 74,
  [NAV_ITEM_MODES.PAGE_LOADING]: 74,
  [NAV_ITEM_MODES.SURFACE]: 0,
  [NAV_ITEM_MODES.CONFIRMATION]: 148,
  [NAV_ITEM_MODES.STATUS_INLINE]: 74,
  [NAV_ITEM_MODES.STATUS_OVERLAY]: 148,
});

export function getNavItemMode(item) {
  if (item?.navMode) {
    return item.navMode;
  }

  if (item?.isLoading) {
    return NAV_ITEM_MODES.PAGE_LOADING;
  }

  if (item?.isSurface) {
    return NAV_ITEM_MODES.SURFACE;
  }

  if (item?.isConfirmation) {
    return NAV_ITEM_MODES.CONFIRMATION;
  }

  if (item?.isStatus) {
    return item?.isOverlay ? NAV_ITEM_MODES.STATUS_OVERLAY : NAV_ITEM_MODES.STATUS_INLINE;
  }

  return NAV_ITEM_MODES.IDLE;
}

export function isNavOverlayMode(value) {
  const mode = typeof value === 'string' ? value : getNavItemMode(value);
  return (
    mode === NAV_ITEM_MODES.SURFACE || mode === NAV_ITEM_MODES.CONFIRMATION || mode === NAV_ITEM_MODES.STATUS_OVERLAY
  );
}

export function getNavModeMinimumCardHeight(value) {
  const mode = typeof value === 'string' ? value : getNavItemMode(value);
  return NAV_MODE_MIN_CARD_HEIGHTS[mode] ?? 0;
}

export function getNavItemIdentity(item) {
  if (!item) {
    return 'nav-item:none';
  }

  const pathPart = String(item?.path || '').trim() || 'no-path';
  const namePart = String(item?.name || '').trim() || 'no-name';
  const typePart = String(item?.type || '').trim() || 'no-type';

  return `${pathPart}::${namePart}::${typePart}`;
}

export function getNavItemRenderKey(item) {
  if (!item) {
    return 'nav-item:none';
  }

  const mode = getNavItemMode(item);
  const surfacePart = item?.surfaceId ? `surface:${item.surfaceId}` : null;
  const statusPart = item?.statusKey
    ? `status:${item.statusKey}`
    : item?.isStatus
      ? `status:${item.type || 'unknown'}`
      : null;
  const confirmationPart = item?.confirmationKey ? `confirmation:${item.confirmationKey}` : null;

  return [getNavItemIdentity(item), mode, surfacePart, statusPart, confirmationPart].filter(Boolean).join('::');
}
