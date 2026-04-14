'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { cn } from '@/core/utils';

const listeners = new Set();
const activeFullscreenStateIds = new Set();
const FULLSCREEN_ROOT_SELECTOR = '[data-fullscreen-state-root="true"][data-affect-global-state="true"]';

let fullscreenStateIdCounter = 0;
let domObserver = null;
let lastSnapshot = false;

function getDomSnapshot() {
  if (typeof document === 'undefined') {
    return activeFullscreenStateIds.size > 0;
  }

  return document.querySelector(FULLSCREEN_ROOT_SELECTOR) !== null;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function emitIfSnapshotChanged() {
  const nextSnapshot = getDomSnapshot();

  if (nextSnapshot === lastSnapshot) {
    return;
  }

  lastSnapshot = nextSnapshot;
  emitChange();
}

function ensureDomObserver() {
  if (typeof document === 'undefined' || domObserver || listeners.size === 0) {
    return;
  }

  domObserver = new MutationObserver(() => {
    emitIfSnapshotChanged();
  });

  domObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['data-fullscreen-state', 'data-fullscreen-state-root', 'data-affect-global-state'],
  });
}

function releaseDomObserver() {
  if (listeners.size > 0 || !domObserver) {
    return;
  }

  domObserver.disconnect();
  domObserver = null;
}

function subscribe(listener) {
  listeners.add(listener);
  ensureDomObserver();
  emitIfSnapshotChanged();

  return () => {
    listeners.delete(listener);
    releaseDomObserver();
  };
}

function getSnapshot() {
  return getDomSnapshot();
}

function registerFullscreenState(id) {
  activeFullscreenStateIds.add(id);
  emitIfSnapshotChanged();
}

function unregisterFullscreenState(id) {
  activeFullscreenStateIds.delete(id);
  emitIfSnapshotChanged();
}

export function useIsFullscreenStateActive() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function FullscreenState({
  children,
  className,
  contentClassName,
  lockScroll = true,
  affectGlobalState = true,
}) {
  const stateIdRef = useRef(null);

  if (stateIdRef.current === null) {
    fullscreenStateIdCounter += 1;
    stateIdRef.current = `fullscreen-state-${fullscreenStateIdCounter}`;
  }

  useEffect(() => {
    const stateId = stateIdRef.current;

    if (affectGlobalState) {
      registerFullscreenState(stateId);
    }

    if (!lockScroll || typeof document === 'undefined') {
      return () => {
        if (affectGlobalState) {
          unregisterFullscreenState(stateId);
        }
      };
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;
    const previousFullscreenState = documentElement.dataset.fullscreenState;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    documentElement.style.overscrollBehavior = 'none';
    documentElement.dataset.fullscreenState = 'true';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;

      if (previousFullscreenState) {
        documentElement.dataset.fullscreenState = previousFullscreenState;
      } else {
        delete documentElement.dataset.fullscreenState;
      }

      if (affectGlobalState) {
        unregisterFullscreenState(stateId);
      }
    };
  }, [affectGlobalState, lockScroll]);

  return (
    <div
      data-affect-global-state={affectGlobalState ? 'true' : 'false'}
      data-fullscreen-state-root="true"
      data-fullscreen-state-id={stateIdRef.current}
      className={cn('fixed inset-0 h-screen w-screen overflow-hidden', className)}
    >
      <div className={cn('center h-screen w-screen p-6', contentClassName)}>{children}</div>
    </div>
  );
}

export default FullscreenState;
