'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { cn } from '@/core/utils';
import { ModuleError } from '@/core/modules/error-boundary';
import { MODAL_BREAKPOINTS, MODAL_CHROME, MODAL_LABELS, MODAL_POSITIONS } from '@/core/modules/modal/config';
import { useModal } from '@/core/modules/modal/context';

import { useModalRegistry } from '../registry/context';
import { getBackdropVariants, getModalVariants, POSITION_CLASSES } from './utils';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
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

function trapFocus(event, elements) {
  if (event.key !== 'Tab' || elements.length === 0) {
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
    <div className="center gap-1.5 border-t border-black/10 px-3 py-1.5">
      <button
        type="button"
        onClick={onSwitchToPrevious}
        className="flex items-center gap-1.5  px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition-colors hover:bg-black/5 hover:text-black"
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
      </button>

      <span className="text-[10px] text-black/20">/</span>

      <span className="bg-primary  px-2.5 py-1.5 text-[11px] font-bold tracking-wide uppercase">
        {getModalLabel(currentEntry.modalType)}
      </span>
    </div>
  );
}

function ModalLayer({ entry, stackIndex, isTopModal, isMobileViewport, closeModal, registry, modalStack }) {
  const modalRef = useRef(null);
  const focusableRef = useRef([]);

  const activePosition = useMemo(() => {
    return resolveActivePosition(entry.position, entry.responsivePosition, isMobileViewport);
  }, [entry.position, entry.responsivePosition, isMobileViewport]);

  const SpecificModalComponent = registry.get(entry.modalType);
  const modalVariants = useMemo(() => getModalVariants(activePosition), [activePosition]);
  const backdropVariants = useMemo(() => getBackdropVariants(), []);

  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT;
  const isSideModal = isSidePosition(activePosition);
  const isTopModalPosition = activePosition === MODAL_POSITIONS.TOP;
  const isBottomModalPosition = activePosition === MODAL_POSITIONS.BOTTOM;
  const isVerticalEdgeModal = isVerticalEdgePosition(activePosition);
  const isMobileSideModal = isMobileViewport && isSideModal;
  const previousEntry = modalStack[stackIndex - 1] || null;

  const titleId = `modal-title-${entry.id}`;

  const baseZIndex = Z_INDEX.MODAL + stackIndex * 2;
  const backdropZIndex = baseZIndex;
  const modalZIndex = baseZIndex + 1;

  useEffect(() => {
    if (!isTopModal || !modalRef.current) {
      focusableRef.current = [];
      return;
    }

    function updateFocusableElements() {
      focusableRef.current = getFocusableElements(modalRef.current);
    }

    updateFocusableElements();

    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(modalRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [entry.id, isTopModal]);

  useEffect(() => {
    if (!isTopModal) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeModal(null, entry.id);
        return;
      }

      trapFocus(event, focusableRef.current);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, entry.id, isTopModal]);

  if (!SpecificModalComponent) {
    return null;
  }

  return (
    <motion.div
      key={entry.id}
      role="dialog"
      aria-modal={isTopModal}
      aria-labelledby={entry.title ? titleId : undefined}
      style={{ zIndex: baseZIndex }}
      className={cn(
        'fixed inset-0 flex flex-col',
        POSITION_CLASSES[activePosition] || POSITION_CLASSES[MODAL_POSITIONS.CENTER],
        isTopModal ? 'pointer-events-auto' : 'pointer-events-none',
        !isSideModal && 'px-3 sm:px-0'
      )}
    >
      {isTopModal ? (
        <motion.div
          className="fixed inset-0 bg-white/50 backdrop-blur-md"
          style={{ zIndex: backdropZIndex }}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={() => closeModal(null, entry.id)}
        />
      ) : null}

      <motion.div
        ref={modalRef}
        className={cn(
          'relative flex max-w-full transform-gpu flex-col',
          'w-full sm:w-auto',
          (isSideModal || isVerticalEdgeModal) && 'self-stretch sm:self-auto'
        )}
        style={{
          zIndex: modalZIndex,
          willChange: 'transform, opacity',
        }}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div
          className={cn(
            'relative flex flex-col',
            isMobileSideModal ? '' : '',
            isPanelChrome
              ? 'overflow-hidden border border-black/10 bg-white/80'
              : 'overflow-visible border border-transparent bg-transparent backdrop-blur-none',
            isPanelChrome && isTopModalPosition && '',
            isPanelChrome && isBottomModalPosition && '',
            isPanelChrome &&
              isSideModal && [
                'h-screen max-h-screen w-full self-stretch sm:w-auto sm:self-auto',
                isLeftModal ? ' sm:border-l-0' : ' sm:border-r-0',
              ]
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

          {isTopModal && stackIndex > 0 && previousEntry && (
            <ModalLayerSwitcher
              currentEntry={entry}
              previousEntry={previousEntry}
              onSwitchToPrevious={() => closeModal(null, entry.id)}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Modal() {
  const { modalStack = [], isOpen, closeModal } = useModal();
  const registry = useModalRegistry();

  const [mounted, setMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getViewportIsMobile);

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
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    window.dispatchEvent(
      new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
        detail: {
          locked: isOpen,
          source: 'modal',
        },
      })
    );

    return () => {
      document.body.style.overflow = 'unset';
      window.dispatchEvent(
        new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
          detail: {
            locked: false,
            source: 'modal',
          },
        })
      );
    };
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="sync">
      {modalStack.map((entry, index) => (
        <ModalLayer
          key={entry.id}
          entry={entry}
          stackIndex={index}
          isTopModal={index === modalStack.length - 1}
          isMobileViewport={isMobileViewport}
          closeModal={closeModal}
          registry={registry}
          modalStack={modalStack}
        />
      ))}
    </AnimatePresence>,
    document.body
  );
}
