'use client';

export const NAV_VIEWPORT_GAP = 4;
export const NAV_HEIGHT_BUFFER = 16;
export const NAV_NOTIFICATION_OFFSET_ADJUSTMENT = 8;

export function getNavStackOffset(cardHeight) {
  return -(cardHeight + NAV_VIEWPORT_GAP);
}

export function getNotificationBottomOffset(navHeight) {
  return Math.max(NAV_VIEWPORT_GAP, Math.round((navHeight || 0) - NAV_NOTIFICATION_OFFSET_ADJUSTMENT));
}
