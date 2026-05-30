'use client';

import { useEffect, useRef, useState } from 'react';

const COMPACT_SCROLL_THRESHOLD = 148;
const COMPACT_RELEASE_THRESHOLD = 36;
const SCROLL_DIRECTION_EPSILON = 0.5;
const COMPACT_ACTIVATION_BUFFER = 88;
const COMPACT_MIN_ACTIVATION_DELTA = 4.5;
const COMPACT_TOGGLE_COOLDOWN_MS = 300;
const OVERSCROLL_THRESHOLD = -1;
const HORIZONTAL_GESTURE_DELTA_THRESHOLD = 8;
const HORIZONTAL_GESTURE_DOMINANCE_RATIO = 1.15;
const HORIZONTAL_GESTURE_SUPPRESSION_MS = 260;
const BOTTOM_LOCK_ACTIVATION_DISTANCE = 2;
const BOTTOM_LOCK_RELEASE_DISTANCE = 40;

function getDistanceToBottom(scrollY) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Infinity;
  }

  const root = document.documentElement;
  const maxScrollY = Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
  return Math.max(maxScrollY - scrollY, 0);
}

function getScrollableHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const root = document.documentElement;
  return Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function canUseCompactNav({
  hasActiveItem,
  isActionEngaged,
  isConfirmation,
  isLoading,
  isOverlay,
  isStatus,
  isSurface,
  title,
  type,
}) {
  if (!hasActiveItem) {
    return false;
  }

  if (isOverlay || isSurface || isConfirmation || isLoading || isStatus || isActionEngaged || type === 'COUNTDOWN') {
    return false;
  }

  return Boolean(String(title || '').trim());
}

function resolveCompactState(scrollY, previousScrollY, currentValue, downwardTravel, compactActivationSuppressed) {
  const scrollDelta = scrollY - previousScrollY;

  if (scrollY <= COMPACT_RELEASE_THRESHOLD) {
    return false;
  }

  if (scrollDelta < -SCROLL_DIRECTION_EPSILON) {
    return false;
  }

  if (compactActivationSuppressed) {
    return currentValue;
  }

  if (
    scrollY >= COMPACT_SCROLL_THRESHOLD &&
    scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA &&
    downwardTravel >= COMPACT_ACTIVATION_BUFFER
  ) {
    return true;
  }

  return currentValue;
}

export function useNavigationCompact({ activeItem, expanded, pathname, searchQuery = '', compactLocked = false }) {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const restoreCompactRef = useRef(false);
  const suppressCompactUntilRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const downwardTravelRef = useRef(0);
  const lastToggleTimeRef = useRef(0);
  const bottomLockRef = useRef(false);
  const hasActiveItem = Boolean(activeItem);
  const activeItemPath = activeItem?.path || '';
  const activeItemName = activeItem?.name || '';
  const activeItemTitle = activeItem?.title || activeItem?.name || '';
  const activeItemType = activeItem?.type || '';
  const isOverlay = Boolean(activeItem?.isOverlay);
  const isSurface = Boolean(activeItem?.isSurface);
  const isConfirmation = Boolean(activeItem?.isConfirmation);
  const isLoading = Boolean(activeItem?.isLoading);
  const isStatus = Boolean(activeItem?.isStatus);
  const isActionEngaged = Boolean(searchQuery?.trim());

  useEffect(() => {
    const compactAllowed = canUseCompactNav({
      hasActiveItem,
      isActionEngaged,
      isConfirmation,
      isLoading,
      isOverlay,
      isStatus,
      isSurface,
      title: activeItemTitle,
      type: activeItemType,
    });
    const canPreserveCompactRestore = typeof window !== 'undefined' && isSurface && restoreCompactRef.current;

    if (!compactAllowed || compactLocked || typeof window === 'undefined') {
      if (canPreserveCompactRestore) {
        compactRef.current = false;
        lastScrollYRef.current = window.scrollY || 0;
        downwardTravelRef.current = 0;
        setCompact(false);
        return undefined;
      }

      restoreCompactRef.current = false;
      compactRef.current = false;
      bottomLockRef.current = false;
      lastScrollYRef.current = 0;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const currentScrollY = window.scrollY || 0;
    const initialDistanceToBottom = getDistanceToBottom(currentScrollY);
    const initialScrollableHeight = getScrollableHeight();
    const hasScrollableContent = initialScrollableHeight > 0;
    const shouldStartBottomLocked = hasScrollableContent && initialDistanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

    if (expanded) {
      restoreCompactRef.current = compactRef.current;
      compactRef.current = false;
      bottomLockRef.current = false;
      suppressCompactUntilRef.current = 0;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const shouldRestoreCompact = restoreCompactRef.current && currentScrollY > COMPACT_RELEASE_THRESHOLD;

    restoreCompactRef.current = false;
    bottomLockRef.current = shouldStartBottomLocked;
    compactRef.current = shouldStartBottomLocked ? true : shouldRestoreCompact;
    lastScrollYRef.current = currentScrollY;
    downwardTravelRef.current = 0;
    setCompact(shouldStartBottomLocked ? true : shouldRestoreCompact);

    let frameId = 0;

    const updateCompactState = () => {
      frameId = 0;

      const scrollY = window.scrollY || 0;
      const distanceToBottom = getDistanceToBottom(scrollY);
      const scrollableHeight = getScrollableHeight();
      const hasScrollableContent = scrollableHeight > 0;
      const shouldActivateBottomLock = hasScrollableContent && distanceToBottom <= BOTTOM_LOCK_ACTIVATION_DISTANCE;
      const shouldKeepBottomLock = hasScrollableContent && distanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

      if (shouldActivateBottomLock) {
        bottomLockRef.current = true;
      }

      if (bottomLockRef.current && shouldKeepBottomLock) {
        lastScrollYRef.current = scrollY;
        downwardTravelRef.current = 0;
        suppressCompactUntilRef.current = 0;

        if (!compactRef.current) {
          compactRef.current = true;
          lastToggleTimeRef.current = getNow();
          setCompact(true);
        }

        return;
      }

      if (bottomLockRef.current && !shouldKeepBottomLock) {
        bottomLockRef.current = false;
      }

      if (scrollY < OVERSCROLL_THRESHOLD) {
        lastScrollYRef.current = scrollY;
        return;
      }

      const scrollDelta = scrollY - lastScrollYRef.current;
      const compactActivationSuppressed = !compactRef.current && getNow() < suppressCompactUntilRef.current;

      if (scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA) {
        downwardTravelRef.current += scrollDelta;
      } else if (scrollDelta < -SCROLL_DIRECTION_EPSILON || scrollY <= COMPACT_RELEASE_THRESHOLD) {
        downwardTravelRef.current = 0;
      }

      const nextValue = resolveCompactState(
        scrollY,
        lastScrollYRef.current,
        compactRef.current,
        downwardTravelRef.current,
        compactActivationSuppressed
      );
      lastScrollYRef.current = scrollY;

      if (nextValue === compactRef.current) {
        return;
      }

      if (getNow() - lastToggleTimeRef.current < COMPACT_TOGGLE_COOLDOWN_MS) {
        return;
      }

      compactRef.current = nextValue;
      lastToggleTimeRef.current = getNow();

      if (nextValue) {
        downwardTravelRef.current = 0;
      }

      setCompact(nextValue);
    };

    const handleWheel = (event) => {
      const horizontalDelta = Math.abs(event.deltaX);
      const verticalDelta = Math.abs(event.deltaY);

      if (horizontalDelta < HORIZONTAL_GESTURE_DELTA_THRESHOLD) {
        return;
      }

      if (horizontalDelta <= verticalDelta * HORIZONTAL_GESTURE_DOMINANCE_RATIO) {
        return;
      }

      suppressCompactUntilRef.current = getNow() + HORIZONTAL_GESTURE_SUPPRESSION_MS;
      downwardTravelRef.current = 0;
    };

    const queueUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateCompactState);
    };

    queueUpdate();
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
    };
  }, [
    pathname,
    expanded,
    compactLocked,
    hasActiveItem,
    isActionEngaged,
    activeItemName,
    activeItemPath,
    activeItemTitle,
    activeItemType,
    isConfirmation,
    isLoading,
    isOverlay,
    isStatus,
    isSurface,
  ]);

  return compact;
}
