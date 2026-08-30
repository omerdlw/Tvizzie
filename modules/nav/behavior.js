'use client';

import { useEffect, useRef, useState } from 'react';

import {
  BEHAVIOR_CHECK_INTERVAL_MS,
  BEHAVIOR_FOCUS_IDLE_MS,
  BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT,
  COMPACT_ACTIVATION_BUFFER,
  COMPACT_MIN_ACTIVATION_DELTA,
  COMPACT_RELEASE_THRESHOLD,
  COMPACT_SCROLL_THRESHOLD,
  NAV_COMPACT_BEHAVIOR,
  SCROLL_DIRECTION_EPSILON,
} from './constants';
import { getCurrentTimestamp, isEditableNavigationTarget } from './utils';

/** Returns whether scrollable content is tall enough to support bottom locking. */
export function canUseBottomLock(scrollableHeight) {
  return scrollableHeight >= BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT;
}

/** Resolves whether navigation interaction should suppress compact behavior. */
export function resolveCompactBehavior({ isInputFocused, isPointerIdle, isVideoPlaying }) {
  return isInputFocused || isVideoPlaying || isPointerIdle
    ? NAV_COMPACT_BEHAVIOR.FOCUSED
    : NAV_COMPACT_BEHAVIOR.BROWSING;
}

/** Tracks focus and idle interaction state for compact-navigation decisions. */
export function useNavigationBehavior({ isVideoPlaying = false }) {
  const [behavior, setBehavior] = useState(NAV_COMPACT_BEHAVIOR.BROWSING);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    lastInteractionRef.current = getCurrentTimestamp();
    let activityFrameId = null;
    const updateBehavior = () => {
      const nextBehavior = resolveCompactBehavior({
        isInputFocused: isEditableNavigationTarget(document.activeElement),
        isPointerIdle: getCurrentTimestamp() - lastInteractionRef.current >= BEHAVIOR_FOCUS_IDLE_MS,
        isVideoPlaying,
      });
      setBehavior((currentBehavior) =>
        currentBehavior === nextBehavior ? currentBehavior : nextBehavior,
      );
    };
    const recordBrowsingActivity = () => {
      lastInteractionRef.current = getCurrentTimestamp();
      if (activityFrameId !== null) return;
      activityFrameId = window.requestAnimationFrame(() => {
        activityFrameId = null;
        updateBehavior();
      });
    };
    const intervalId = window.setInterval(updateBehavior, BEHAVIOR_CHECK_INTERVAL_MS);
    updateBehavior();
    window.addEventListener('pointermove', recordBrowsingActivity, { passive: true });
    window.addEventListener('pointerdown', recordBrowsingActivity, { passive: true });
    window.addEventListener('wheel', recordBrowsingActivity, { passive: true });
    window.addEventListener('keydown', recordBrowsingActivity);
    document.addEventListener('focusin', updateBehavior);
    document.addEventListener('focusout', updateBehavior);
    return () => {
      window.clearInterval(intervalId);
      if (activityFrameId !== null) window.cancelAnimationFrame(activityFrameId);
      window.removeEventListener('pointermove', recordBrowsingActivity);
      window.removeEventListener('pointerdown', recordBrowsingActivity);
      window.removeEventListener('wheel', recordBrowsingActivity);
      window.removeEventListener('keydown', recordBrowsingActivity);
      document.removeEventListener('focusin', updateBehavior);
      document.removeEventListener('focusout', updateBehavior);
    };
  }, [isVideoPlaying]);

  return behavior;
}

/** Determines whether compact mode can activate for the current navigation item. */
export function canUseCompactNav({
  hasActiveItem,
  isActionEngaged,
  isHudActive,
  isLoading,
  isOverlay,
  isStatus,
  isSurface,
  isBehaviorFocused,
  title,
}) {
  return (
    Boolean(hasActiveItem && String(title || '').trim()) &&
    !(
      isOverlay ||
      isSurface ||
      isLoading ||
      isStatus ||
      isActionEngaged ||
      isHudActive ||
      isBehaviorFocused
    )
  );
}

/** Resolves the next compact value from scroll direction and accumulated travel. */
export function resolveCompactState(
  scrollY,
  previousScrollY,
  currentValue,
  downwardTravel,
  compactActivationSuppressed,
) {
  const scrollDelta = scrollY - previousScrollY;
  if (scrollY <= COMPACT_RELEASE_THRESHOLD || scrollDelta < -SCROLL_DIRECTION_EPSILON) return false;
  if (compactActivationSuppressed) return currentValue;
  return scrollY >= COMPACT_SCROLL_THRESHOLD &&
    scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA &&
    downwardTravel >= COMPACT_ACTIVATION_BUFFER
    ? true
    : currentValue;
}
