'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { cn } from '@/core/utils';
import { ModuleError } from '@/core/modules/error-boundary';
import { MODAL_BREAKPOINTS, MODAL_CHROME, MODAL_POSITIONS } from '@/core/modules/modal/config';
import { useModal } from '@/core/modules/modal/context';

import { useModalRegistry } from '../registry/context';
import { BACKDROP_VARIANTS, getModalVariants, POSITION_CLASSES } from './utils';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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

function ModalLayer({ entry, stackIndex, isTopModal, isMobileViewport, closeModal, registry }) {
  const modalRef = useRef(null);
  const focusableRef = useRef([]);

  const activePosition = useMemo(() => {
    return resolveActivePosition(entry.position, entry.responsivePosition, isMobileViewport);
  }, [entry.position, entry.responsivePosition, isMobileViewport]);

  const SpecificModalComponent = registry.get(entry.modalType);

  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT;
  const isTopModalPosition = activePosition === MODAL_POSITIONS.TOP;
  const isBottomModalPosition = activePosition === MODAL_POSITIONS.BOTTOM;

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
        isTopModal ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {isTopModal ? (
        <motion.div
          className="fixed inset-0 bg-white/60 backdrop-blur-md"
          style={{ zIndex: backdropZIndex }}
          variants={BACKDROP_VARIANTS}
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
          (isLeftModal || isRightModal || isTopModalPosition || isBottomModalPosition) &&
            'w-full self-stretch sm:w-auto sm:self-auto'
        )}
        style={{
          zIndex: modalZIndex,
          willChange: 'transform',
        }}
        variants={getModalVariants(activePosition)}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div
          className={cn(
            'relative flex flex-col',
            isPanelChrome
              ? 'overflow-hidden border border-black/10 bg-white/80'
              : 'overflow-visible border border-transparent bg-transparent backdrop-blur-none',
            isPanelChrome && isTopModalPosition && '',
            isPanelChrome && isBottomModalPosition && '',
            isPanelChrome &&
              (isLeftModal || isRightModal) && [
                'h-screen max-h-screen w-full self-stretch sm:w-auto sm:self-auto',
                isLeftModal ? 'border-l-0' : 'border-r-0',
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

    return () => {
      document.body.style.overflow = 'unset';
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
        />
      ))}
    </AnimatePresence>,
    document.body
  );
}
