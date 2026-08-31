'use client';

import { createContext } from 'react';

import { MODAL_BREAKPOINTS, MODAL_CHROME, MODAL_LABELS, MODAL_POSITIONS } from './config';

// ── Modal runtime ───────────────────────────────────────────────────────────
// Stack bookkeeping, focus handling, and context fallbacks stay React-facing
// but render-free. The provider in index.js owns the callbacks that mutate the
// stack; this file owns the deterministic state helpers those callbacks use.

export const FALLBACK_MODAL_STATE = Object.freeze({
  position: MODAL_POSITIONS.CENTER,
  responsivePosition: null,
  modalType: null,
  activeModalId: null,
  isOpen: false,
  chrome: MODAL_CHROME.PANEL,
  title: null,
  headerActions: null,
  showClose: true,
  props: {},
  modalStack: [],
});

export const FALLBACK_MODAL_ACTIONS = Object.freeze({
  openModal: async () => null,
  closeModal: () => {},
  closeAllModals: () => {},
});

export const ModalActionsContext = createContext(FALLBACK_MODAL_ACTIONS);
export const ModalStateContext = createContext(FALLBACK_MODAL_STATE);

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getResponsivePosition(position, responsivePosition) {
  if (
    !isPlainObject(responsivePosition) ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return position;
  }

  const isMobileViewport = window.matchMedia(
    `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`,
  ).matches;

  if (isMobileViewport && responsivePosition.mobile) {
    return responsivePosition.mobile;
  }

  if (!isMobileViewport && responsivePosition.desktop) {
    return responsivePosition.desktop;
  }

  return position;
}

export function normalizePositionConfig(positionInput, config = {}) {
  const basePosition = typeof positionInput === 'string' ? positionInput : MODAL_POSITIONS.CENTER;

  const responsivePosition =
    (isPlainObject(config.responsivePosition) && config.responsivePosition) ||
    (isPlainObject(positionInput) && positionInput) ||
    null;

  return {
    position: getResponsivePosition(basePosition, responsivePosition),
    responsivePosition,
  };
}

export function createModalState(modalStack = []) {
  const activeModal = modalStack[modalStack.length - 1] || null;

  return {
    position: activeModal?.position || MODAL_POSITIONS.CENTER,
    responsivePosition: activeModal?.responsivePosition || null,
    modalType: activeModal?.modalType || null,
    activeModalId: activeModal?.id || null,
    isOpen: modalStack.length > 0,
    chrome: activeModal?.chrome || MODAL_CHROME.PANEL,
    title: activeModal?.title || null,
    headerActions: activeModal?.headerActions || null,
    showClose: activeModal?.showClose ?? true,
    props: activeModal?.props || {},
    modalStack,
  };
}

export function finalizeModalClose(
  modalId,
  result,
  { onCloseMapRef, resolveMapRef, logCloseErrors = false },
) {
  const onClose = onCloseMapRef.current.get(modalId);

  if (typeof onClose === 'function') {
    const handleCloseError = (error) => {
      if (logCloseErrors) {
        console.error('[Modal] onClose handler failed:', error);
      }
    };

    try {
      const callbackResult = onClose(result);
      if (callbackResult && typeof callbackResult.then === 'function') {
        callbackResult.catch(handleCloseError);
      }
    } catch (error) {
      handleCloseError(error);
    }
  }

  onCloseMapRef.current.delete(modalId);

  const resolve = resolveMapRef.current.get(modalId);
  if (typeof resolve === 'function') {
    resolve(result);
  }
  resolveMapRef.current.delete(modalId);
}

export const INITIAL_MODAL_STATE = createModalState([]);

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';

export function resolveActivePosition(position, responsivePosition, isMobileViewport) {
  if (!responsivePosition || typeof responsivePosition !== 'object') {
    return position;
  }

  if (isMobileViewport && responsivePosition.mobile) {
    return responsivePosition.mobile;
  }

  if (!isMobileViewport && responsivePosition.desktop) {
    return responsivePosition.desktop;
  }

  return position;
}

export function getViewportIsMobile() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(`(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`).matches;
}

export function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) {
    return;
  }

  const elements = getFocusableElements(container);
  if (elements.length === 0) {
    return;
  }

  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    }
    return;
  }

  if (document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
}

export function getModalLabel(modalType) {
  return MODAL_LABELS[modalType] || modalType || 'Modal';
}

export function isSidePosition(position) {
  return position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT;
}

export function isVerticalEdgePosition(position) {
  return position === MODAL_POSITIONS.TOP || position === MODAL_POSITIONS.BOTTOM;
}
