'use client';

import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { Z_INDEX, INFO_ACTION_TONE_CLASS } from '@/shared';
import { cn } from '@/ui/class-names';
import Icon from '@/ui/primitives/icon';
import Button from '@/ui/primitives/button';
import { ModuleError } from '@/modules/error-boundary';
import { useModalRegistry } from '@/modules/registry';
import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';

export const MODAL_POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

export const MODAL_POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
});

export const MODAL_CHROME = Object.freeze({
  PANEL: 'panel',
  BARE: 'bare',
});

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
});

export const MODAL_PRESETS = Object.freeze({
  PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
  VIDEO_PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
});

export const MODAL_LABELS = Object.freeze({
  ACCOUNT_SOCIAL_MODAL: 'Social',
  CAST_MODAL: 'Cast',
  LIST_EDITOR_MODAL: 'Edit List',
  MEDIA_SOCIAL_PROOF_MODAL: 'Social Proof',
  NOTIFICATIONS_MODAL: 'Notifications',
  PREVIEW_MODAL: 'Preview',
  VIDEO_PREVIEW_MODAL: 'Video',
});

const AUTH_VERIFICATION_TITLES = Object.freeze({
  'account-delete': 'Delete Account Verification',
  'email-change': 'Email Verification',
  'sign-in': 'Login Verification',
});

const FOLLOW_LIST_TITLES = Object.freeze({
  following: 'Following',
  requests: 'Inbox',
});

export function resolveAuthVerificationHeader(config = {}) {
  const purpose = String(config?.data?.purpose || '')
    .trim()
    .toLowerCase();

  return {
    title: AUTH_VERIFICATION_TITLES[purpose] || 'Email Verification',
  };
}

function resolveFollowListHeader(config = {}) {
  const type = String(config?.data?.type || '')
    .trim()
    .toLowerCase();

  return {
    title: FOLLOW_LIST_TITLES[type] || 'Followers',
  };
}

function resolveListEditorHeader(config = {}) {
  const isEditing = Boolean(config?.data?.initialData?.id);

  return {
    title: isEditing ? 'Edit List' : 'Create List',
  };
}

function resolveNotificationsHeader() {
  return {
    title: 'Notifications',
  };
}

function isListReviewConfig(config = {}) {
  const data = config?.data || {};

  return (
    data?.review?.subjectType === 'list' || Boolean(data?.listId || data?.ownerId || data?.list)
  );
}

function resolveReviewEditorHeader(config = {}) {
  const hasExistingReview = Boolean(config?.data?.review);
  const isListReview = isListReviewConfig(config);
  const actionLabel = hasExistingReview ? 'Edit' : 'Write';
  const subjectLabel = isListReview ? 'comment' : 'review';

  return {
    title: `${actionLabel} ${subjectLabel}`,
  };
}

const DEFAULT_MODAL_HEADERS = {
  AUTH_VERIFICATION_MODAL: resolveAuthVerificationHeader,
  FOLLOW_LIST_MODAL: resolveFollowListHeader,
  LIST_EDITOR_MODAL: resolveListEditorHeader,
  NOTIFICATIONS_MODAL: resolveNotificationsHeader,
  MEDIA_SOCIAL_PROOF_MODAL: () => ({
    title: 'Social Activity',
  }),
  REVIEW_EDITOR_MODAL: resolveReviewEditorHeader,
};

export function resolveModalHeader(modalType, config = {}) {
  const header = config?.header && typeof config.header === 'object' ? config.header : {};
  const fallbackResolver = DEFAULT_MODAL_HEADERS[modalType];
  const fallbackHeader = typeof fallbackResolver === 'function' ? fallbackResolver(config) : {};

  return {
    title: header.title ?? config?.title ?? fallbackHeader.title ?? null,
    actions: header.actions ?? config?.actions ?? fallbackHeader.actions ?? null,
    showClose: header.showClose ?? config?.showClose ?? fallbackHeader.showClose,
  };
}

const MODAL_EASINGS = Object.freeze({
  CINEMATIC: MOTION_EASINGS.CINEMATIC,
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const MODAL_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: MODAL_EASINGS.EMPHASIZED },
  FAST: { duration: 0.44, distance: 9, scaleDelta: 0.012, ease: MODAL_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.66, distance: 18, scaleDelta: 0.018, ease: MODAL_EASINGS.SOFT },
  SURFACE: { duration: 0.96, distance: 28, scaleDelta: 0.024, ease: MODAL_EASINGS.CINEMATIC },
});

const MODAL_SPRINGS = Object.freeze({
  MICRO: MOTION_SPRINGS.PRESS,
  PANEL: MOTION_SPRINGS.PANEL,
  BADGE: MOTION_SPRINGS.BADGE,
});

function toCssDistance(value = 0) {
  return typeof value === 'number' ? `${value}px` : value;
}

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${toCssDistance(x)}, ${toCssDistance(y)}, 0) scale(${scale})`;
}

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;
export const MODAL_PANEL_SPRING = MODAL_SPRINGS.PANEL;

export const MODAL_MICRO_TAP_SCALE = 0.97;
export const MODAL_MICRO_TAP = Object.freeze({
  transform: toGpuTransform({ scale: MODAL_MICRO_TAP_SCALE }),
});

export const MODAL_CONTENT_STAGGER = 0.06;

export const MODAL_CONTENT_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: MODAL_TIERS.MICRO.distance, scale: 0.992 }),
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: 3, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_HEADER_VARIANTS = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.03,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_FOOTER_VARIANTS = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.12,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EMPHASIZED },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      y: MODAL_TIERS.FAST.distance,
      scale: 1 - MODAL_TIERS.FAST.scaleDelta,
    }),
    filter: 'blur(6px)',
  },
  visible: (index = 0) => ({
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.06 + Math.min(Math.max(Number(index) || 0, 0) * MODAL_CONTENT_STAGGER, 0.42),
    },
  }),
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: -MODAL_TIERS.MICRO.distance, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

function buildVariants(tierName, { axis, fullSlide = false, direction = 1 } = {}) {
  const tier = MODAL_TIERS[tierName];
  const distance = fullSlide ? '100%' : tier.distance;
  const signedDistance = direction < 0 ? (fullSlide ? '-100%' : -distance) : distance;
  const transform = axis === 'x' ? { x: signedDistance } : { y: signedDistance };

  return Object.freeze({
    hidden: {
      opacity: 0,
      transform: toGpuTransform(transform),
      filter: 'blur(10px)',
    },
    visible: {
      opacity: 1,
      transform: toGpuTransform(),
      filter: 'blur(0px)',
      transition: { duration: tier.duration, ease: tier.ease },
    },
    exit: {
      opacity: 0,
      transform: toGpuTransform(transform),
      filter: 'blur(6px)',
      transition: { duration: tier.duration * 0.72, ease: MODAL_EASINGS.EXIT },
    },
  });
}

export const modalBackdropVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.66, ease: MODAL_EASINGS.SOFT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

const CENTER_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: 10, scale: 0.96 }),
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: 6, scale: 0.98 }),
    filter: 'blur(6px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

const BOTTOM_VARIANTS = buildVariants('SURFACE', { axis: 'y', fullSlide: true });
const RIGHT_VARIANTS = buildVariants('SURFACE', { axis: 'x', fullSlide: true });
const LEFT_VARIANTS = buildVariants('SURFACE', {
  axis: 'x',
  fullSlide: true,
  direction: -1,
});
const TOP_VARIANTS = buildVariants('SURFACE', {
  axis: 'y',
  fullSlide: true,
  direction: -1,
});

export function getModalPositionVariants(position) {
  switch (position) {
    case MODAL_POSITIONS.BOTTOM:
      return BOTTOM_VARIANTS;
    case MODAL_POSITIONS.RIGHT:
      return RIGHT_VARIANTS;
    case MODAL_POSITIONS.LEFT:
      return LEFT_VARIANTS;
    case MODAL_POSITIONS.TOP:
      return TOP_VARIANTS;
    case MODAL_POSITIONS.CENTER:
    default:
      return CENTER_VARIANTS;
  }
}

export function getModalTransition(position) {
  return position === MODAL_POSITIONS.CENTER ? MODAL_PANEL_SPRING : undefined;
}

export const MODAL_BACKDROP_VARIANTS = modalBackdropVariants;
export const MODAL_POSITION_VARIANTS = getModalPositionVariants;

export const CANCEL_BUTTON_CLASS =
  'center h-9 shrink-0 cursor-pointer rounded-xl ring-1 ring-inset ring-white/10 px-4 text-xs font-semibold whitespace-nowrap uppercase text-white/70 hover:ring-transparent hover:bg-white hover:text-black';

export const ACTION_BUTTON_CLASS = cn(
  'center h-9 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-semibold whitespace-nowrap uppercase disabled:cursor-not-allowed disabled:ring-white/5 disabled:bg-white/10 disabled:text-white/40',
  INFO_ACTION_TONE_CLASS,
);

const HEIGHT_CONSTRAINT_PATTERN = /(\s|^)(?:[\w-]+:)*(?:h|max-h)-/;

function hasHeightConstraint(className) {
  return typeof className === 'string' && HEIGHT_CONSTRAINT_PATTERN.test(className);
}

function isSideModal(position) {
  return position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT;
}

function getContainerClassName({ className, position }) {
  const sideModal = isSideModal(position);
  const usesExplicitHeightConstraint = hasHeightConstraint(className);

  return cn(
    'flex min-h-0 flex-col overflow-hidden',
    sideModal ? 'h-full max-h-full' : usesExplicitHeightConstraint ? null : 'max-h-[70dvh]',
    className,
  );
}

function getBodyClassName(bodyClassName) {
  return cn('min-h-0 w-full flex-1 overflow-y-auto overscroll-contain modal-body rounded-[20px]', bodyClassName);
}

function resolveHeaderActions(actions, close) {
  if (typeof actions === 'function') {
    return actions({ close });
  }

  return actions || null;
}

function hasSlotContent(value) {
  return !(value === null || value === undefined || value === false || value === '');
}

function isHeaderConfig(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && !isValidElement(value);
}

function CloseButton({ close, label = 'Close modal' }) {
  if (typeof close !== 'function') {
    return null;
  }

  return (
    <Button
      type="button"
      aria-label={label}
      onClick={close}
      className="center inline-flex size-8 cursor-pointer rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:ring-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
    >
      <Icon icon="material-symbols:close-rounded" size={16} />
    </Button>
  );
}

export function Container({
  children,
  className,
  bodyClassName,
  header = {},
  footer,
  close,
  position = null,
}) {
  const isHeaderDisabled = header === false;
  const headerConfig = !isHeaderDisabled && isHeaderConfig(header) ? header : {};
  const hasCustomHeaderNode =
    !isHeaderDisabled && !isHeaderConfig(header) && hasSlotContent(header);
  const resolvedPosition = position || headerConfig?.position || null;
  const showClose = headerConfig?.showClose === true;
  const headerActions = resolveHeaderActions(headerConfig?.actions, close);

  const headerLeft = hasCustomHeaderNode
    ? null
    : (headerConfig?.left ??
      (headerConfig?.title ? (
        <h2 id={headerConfig.titleId} className="truncate text-sm font-semibold text-white">
          {headerConfig.title}
        </h2>
      ) : null));

  const headerCenter = hasCustomHeaderNode ? header : (headerConfig?.center ?? null);

  const headerRight = hasCustomHeaderNode
    ? null
    : (headerConfig?.right ??
      (hasSlotContent(headerActions) || showClose ? (
        <div className="flex items-center justify-end gap-2.5">
          {headerActions}
          {showClose ? <CloseButton close={close} /> : null}
        </div>
      ) : null));

  const headerIsSticky = Boolean(headerConfig?.sticky);
  const shouldRenderHeader =
    !isHeaderDisabled &&
    (hasSlotContent(headerLeft) || hasSlotContent(headerCenter) || hasSlotContent(headerRight));

  const footerConfig = footer && typeof footer === 'object' ? footer : {};
  const footerLeft = footerConfig.left ?? null;
  const footerCenter = footerConfig.center ?? null;
  const footerRight = footerConfig.right ?? null;
  const footerIsSticky = Boolean(footerConfig.sticky);
  const shouldRenderFooter =
    footer !== false &&
    (hasSlotContent(footerLeft) || hasSlotContent(footerCenter) || hasSlotContent(footerRight));

  return (
    <div className={getContainerClassName({ className, position: resolvedPosition })}>
      {shouldRenderHeader ? (
        <motion.div
          variants={MODAL_HEADER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(headerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-2.5 px-4 py-3',
            headerIsSticky && 'sticky top-0 z-10 bg-black',
          )}
        >
          <div className="min-w-0">{headerLeft}</div>
          {hasSlotContent(headerCenter) && (
            <div className="flex items-center justify-center">{headerCenter}</div>
          )}
          <div className="min-w-0">{headerRight}</div>
        </motion.div>
      ) : null}

      <motion.div
        variants={MODAL_CONTENT_VARIANTS}
        initial="hidden"
        animate="visible"
        data-lenis-prevent
        data-lenis-prevent-wheel
        className={getBodyClassName(bodyClassName)}
      >
        {children}
      </motion.div>

      {shouldRenderFooter ? (
        <motion.div
          variants={MODAL_FOOTER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(footerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-2.5 px-4 py-3',
            footerIsSticky && 'sticky bottom-0 bg-black',
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          {hasSlotContent(footerCenter) && (
            <div className="flex items-center justify-center">{footerCenter}</div>
          )}
          <div
            className={cn(
              'flex items-center gap-2.5',
              hasSlotContent(footerCenter) ? 'w-full justify-end' : null,
            )}
          >
            {footerRight}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

export const ModalContainer = Container;

const FALLBACK_MODAL_STATE = Object.freeze({
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

const FALLBACK_MODAL_ACTIONS = Object.freeze({
  openModal: async () => null,
  closeModal: () => {},
  closeAllModals: () => {},
});

const ModalActionsContext = createContext(FALLBACK_MODAL_ACTIONS);
const ModalStateContext = createContext(FALLBACK_MODAL_STATE);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getResponsivePosition(position, responsivePosition) {
  if (!isPlainObject(responsivePosition) || typeof window === 'undefined') {
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

function normalizePositionConfig(positionInput, config = {}) {
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

function createModalState(modalStack = []) {
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

function finalizeModalClose(
  modalId,
  result,
  { onCloseMapRef, resolveMapRef, logCloseErrors = false },
) {
  const onClose = onCloseMapRef.current.get(modalId);

  if (typeof onClose === 'function') {
    try {
      onClose(result);
    } catch (error) {
      if (logCloseErrors) {
        console.error('[Modal] onClose handler failed:', error);
      }
    }
  }

  onCloseMapRef.current.delete(modalId);

  const resolve = resolveMapRef.current.get(modalId);
  if (typeof resolve === 'function') {
    resolve(result);
  }
  resolveMapRef.current.delete(modalId);
}

const INITIAL_STATE = createModalState([]);

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';

function resolveActivePosition(position, responsivePosition, isMobileViewport) {
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

function getViewportIsMobile() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(`(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`).matches;
}

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

function trapFocus(event, container) {
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

function getModalLabel(modalType) {
  return MODAL_LABELS[modalType] || modalType || 'Modal';
}

function isSidePosition(position) {
  return position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT;
}

function isVerticalEdgePosition(position) {
  return position === MODAL_POSITIONS.TOP || position === MODAL_POSITIONS.BOTTOM;
}

function ModalLayerSwitcher({ currentEntry, previousEntry, onSwitchToPrevious }) {
  return (
    <div className="center shrink-0 gap-2 border-t border-white/10 bg-white/5 p-2.5">
      <Button
        type="button"
        onClick={onSwitchToPrevious}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 uppercase hover:bg-white hover:text-black"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path
            d="M7.5 2.5L4 6l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {getModalLabel(previousEntry.modalType)}
      </Button>
      <span className="text-xs text-white/15">/</span>
      <span className="rounded-xl ring-1 ring-inset ring-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase">
        {getModalLabel(currentEntry.modalType)}
      </span>
    </div>
  );
}

function ModalLayer({
  entry,
  stackIndex,
  isTopModal,
  isMobileViewport,
  closeModal,
  registry,
  modalStack,
}) {
  const modalRef = useRef(null);
  const activePosition = useMemo(() => {
    return resolveActivePosition(entry.position, entry.responsivePosition, isMobileViewport);
  }, [entry.position, entry.responsivePosition, isMobileViewport]);

  const SpecificModalComponent = registry.get(entry.modalType);
  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT;
  const isSideModal = isSidePosition(activePosition);
  const isTopModalPosition = activePosition === MODAL_POSITIONS.TOP;
  const isBottomModalPosition = activePosition === MODAL_POSITIONS.BOTTOM;
  const isVerticalEdgeModal = isVerticalEdgePosition(activePosition);
  const previousEntry = modalStack[stackIndex - 1] || null;

  const titleId = `modal-title-${entry.id}`;

  const baseZIndex = Z_INDEX.MODAL + stackIndex * 2;
  const modalZIndex = baseZIndex + 1;
  const positionVariants = getModalPositionVariants(activePosition);

  useEffect(() => {
    if (!isTopModal || !modalRef.current) return;

    const initialElements = getFocusableElements(modalRef.current);
    if (initialElements.length > 0) {
      initialElements[0].focus();
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeModal(null, entry.id);
        return;
      }
      trapFocus(event, modalRef.current);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, entry.id, isTopModal]);

  if (!SpecificModalComponent) {
    return null;
  }

  return (
    <div
      key={entry.id}
      role="dialog"
      aria-modal={isTopModal}
      aria-labelledby={entry.title ? titleId : undefined}
      style={{ zIndex: baseZIndex }}
      className={cn(
        'pointer-events-none fixed inset-0 flex flex-col',
        MODAL_POSITION_CLASSES[activePosition] || MODAL_POSITION_CLASSES[MODAL_POSITIONS.CENTER],
        activePosition === MODAL_POSITIONS.CENTER && !isMobileViewport && 'px-3',
      )}
    >
      <motion.div
        ref={modalRef}
        variants={positionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={getModalTransition(activePosition)}
        className={cn(
          'relative flex max-w-full flex-col',
          isTopModal ? 'pointer-events-auto' : 'pointer-events-none select-none',
          activePosition === MODAL_POSITIONS.CENTER && 'w-full sm:w-auto',
          isVerticalEdgeModal && 'w-full',
          isSideModal && (isMobileViewport ? 'w-full' : 'w-auto'),
          isVerticalEdgeModal && 'self-stretch',
          isSideModal && isMobileViewport && 'self-stretch',
        )}
        style={{ zIndex: modalZIndex }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            'modal-panel relative flex flex-col',
            isPanelChrome
              ? 'overflow-hidden ring-1 ring-inset ring-white/10 bg-black/50 shadow-[0_18px_56px_rgba(0,0,0,0.50)] backdrop-blur-xl'
              : 'overflow-visible ring-1 ring-inset ring-transparent bg-transparent',
            isPanelChrome &&
              (activePosition === MODAL_POSITIONS.CENTER
                ? 'rounded-[30px]'
                : activePosition === MODAL_POSITIONS.BOTTOM
                  ? 'rounded-t-[30px]'
                  : activePosition === MODAL_POSITIONS.TOP
                    ? 'rounded-b-[30px]'
                    : activePosition === MODAL_POSITIONS.LEFT
                      ? isMobileViewport
                        ? 'rounded-none'
                        : 'rounded-r-[30px]'
                      : activePosition === MODAL_POSITIONS.RIGHT
                        ? isMobileViewport
                          ? 'rounded-none'
                          : 'rounded-l-[30px]'
                        : 'rounded-[30px]'),
            isPanelChrome && isTopModalPosition && 'border-t-0',
            isPanelChrome && isBottomModalPosition && 'border-b-0',
            isPanelChrome &&
              isVerticalEdgeModal &&
              isMobileViewport &&
              (isTopModalPosition
                ? 'w-full border-t-0 border-r-0 border-l-0 rounded-b-[30px]'
                : 'w-full border-r-0 border-b-0 border-l-0 rounded-t-[30px]'),
            isPanelChrome &&
              isSideModal && [
                isMobileViewport
                  ? isLeftModal
                    ? 'h-screen max-h-screen w-full self-stretch border-0 rounded-none'
                    : 'h-screen max-h-screen w-full self-stretch border-0 rounded-none'
                  : 'h-screen max-h-screen w-full',
                !isMobileViewport && (isLeftModal ? 'border-l-0' : 'border-r-0'),
              ],
          )}
        >
          <ModuleError name={entry.modalType}>
            <SpecificModalComponent
              header={{
                title: entry.title,
                titleId,
                position: activePosition,
                actions: entry.headerActions,
                showClose: entry.showClose,
              }}
              close={(result) => closeModal(result, entry.id)}
              data={entry.props}
            />
          </ModuleError>

          {!isTopModal && (
            <div
              onClick={(event) => {
                event.stopPropagation();
                const topModal = modalStack[modalStack.length - 1];
                if (topModal) {
                  closeModal(null, topModal.id);
                }
              }}
              className="pointer-events-auto absolute inset-0 z-50 cursor-pointer bg-white/10 transition-all duration-300 ease-in-out"
              aria-label="Close active top modal"
            />
          )}

          {isTopModal && stackIndex > 0 && previousEntry && (
            <ModalLayerSwitcher
              currentEntry={entry}
              previousEntry={previousEntry}
              onSwitchToPrevious={() => closeModal(null, entry.id)}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function Modal() {
  const { modalStack = [], isOpen, closeModal } = useModal();
  const registry = useModalRegistry();
  const visibleModalStack = useMemo(
    () => modalStack.filter((entry) => Boolean(registry.get(entry.modalType))),
    [modalStack, registry],
  );
  const topModalEntry = visibleModalStack[visibleModalStack.length - 1] || null;
  const isModalVisible = Boolean(isOpen && topModalEntry);

  const [mounted, setMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getViewportIsMobile);
  const [isTopExitSettling, setIsTopExitSettling] = useState(false);
  const previousTopModalIdRef = useRef(null);

  useLayoutEffect(() => {
    const currentTopModalId = topModalEntry?.id || null;
    const previousTopModalId = previousTopModalIdRef.current;
    const previousTopStillMounted = visibleModalStack.some(
      (entry) => entry.id === previousTopModalId,
    );

    if (
      previousTopModalId &&
      previousTopModalId !== currentTopModalId &&
      !previousTopStillMounted
    ) {
      setIsTopExitSettling(true);
    }

    previousTopModalIdRef.current = currentTopModalId;
  }, [topModalEntry?.id, visibleModalStack]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`);

    function handleViewportChange() {
      setIsMobileViewport(mediaQuery.matches);
    }

    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    window.dispatchEvent(
      new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
        detail: {
          locked: isModalVisible,
          source: 'modal',
        },
      }),
    );

    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(
        new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
          detail: {
            locked: false,
            source: 'modal',
          },
        }),
      );
    };
  }, [isModalVisible]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <AnimatePresence>
        {isModalVisible && (
          <motion.div
            key="global-modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
            style={{ zIndex: Z_INDEX.MODAL }}
            onClick={() => {
              if (!isTopExitSettling) {
                closeModal(null, topModalEntry.id);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => setIsTopExitSettling(false)}>
        {visibleModalStack.map((entry, index) => (
          <ModalLayer
            key={entry.id}
            entry={entry}
            stackIndex={index}
            isTopModal={index === visibleModalStack.length - 1 && !isTopExitSettling}
            isMobileViewport={isMobileViewport}
            closeModal={closeModal}
            registry={registry}
            modalStack={visibleModalStack}
          />
        ))}
      </AnimatePresence>
    </>,
    document.body,
  );
}

export default Modal;

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(INITIAL_STATE);

  const modalStackRef = useRef([]);
  const resolveMapRef = useRef(new Map());
  const onCloseMapRef = useRef(new Map());
  const modalIdRef = useRef(0);

  const syncModalStack = useCallback((nextStack) => {
    modalStackRef.current = nextStack;
    setModalState(createModalState(nextStack));
  }, []);

  const openModal = useCallback(
    (modalType, positionInput = MODAL_POSITIONS.CENTER, config = {}) => {
      const currentStack = modalStackRef.current;
      const topModal = currentStack[currentStack.length - 1];

      if (topModal && topModal.modalType === modalType) {
        return Promise.resolve(null);
      }

      const filteredStack = currentStack.filter((entry) => {
        if (entry.modalType === modalType) {
          finalizeModalClose(entry.id, null, { onCloseMapRef, resolveMapRef });
          return false;
        }
        return true;
      });

      const resolvedConfig = {
        ...(MODAL_PRESETS[modalType] || {}),
        ...config,
      };

      const { position, responsivePosition } = normalizePositionConfig(
        positionInput,
        resolvedConfig,
      );

      const resolvedHeader = resolveModalHeader(modalType, resolvedConfig);
      const modalId = ++modalIdRef.current;

      const modalEntry = {
        id: modalId,
        modalType,
        position,
        responsivePosition,
        title: resolvedHeader.title,
        headerActions: resolvedHeader.actions || null,
        showClose: resolvedHeader.showClose ?? true,
        chrome: resolvedConfig.chrome || MODAL_CHROME.PANEL,
        props: resolvedConfig.data ?? resolvedConfig,
      };

      syncModalStack([...filteredStack, modalEntry]);

      return new Promise((resolve) => {
        resolveMapRef.current.set(modalId, resolve);
        onCloseMapRef.current.set(modalId, resolvedConfig.onClose || null);
      });
    },
    [syncModalStack],
  );

  const closeModal = useCallback(
    (result = null, targetModalId = null) => {
      const currentStack = modalStackRef.current;

      if (currentStack.length === 0) {
        return;
      }

      const modalId = targetModalId || currentStack[currentStack.length - 1]?.id || null;

      if (!modalId) {
        return;
      }

      const modalToClose = currentStack.find((entry) => entry.id === modalId);

      if (!modalToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== modalId);
      syncModalStack(nextStack);

      finalizeModalClose(modalId, result, {
        onCloseMapRef,
        resolveMapRef,
        logCloseErrors: true,
      });
    },
    [syncModalStack],
  );

  const closeAllModals = useCallback(
    (result = null) => {
      const currentStack = modalStackRef.current;

      if (currentStack.length === 0) {
        return;
      }

      syncModalStack([]);

      currentStack.forEach((entry) => {
        finalizeModalClose(entry.id, result, { onCloseMapRef, resolveMapRef });
      });
    },
    [syncModalStack],
  );

  const actionsValue = useMemo(
    () => ({
      openModal,
      closeModal,
      closeAllModals,
    }),
    [openModal, closeModal, closeAllModals],
  );

  return (
    <ModalActionsContext.Provider value={actionsValue}>
      <ModalStateContext.Provider value={modalState}>
        <Modal />
        {children}
      </ModalStateContext.Provider>
    </ModalActionsContext.Provider>
  );
}

export function useModalActions() {
  return useContext(ModalActionsContext);
}

export function useModalState() {
  return useContext(ModalStateContext);
}

export function useModal() {
  const actions = useModalActions();
  const state = useModalState();

  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
