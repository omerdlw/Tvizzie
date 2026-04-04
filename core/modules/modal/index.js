'use client';

import { useLayoutEffect, useEffect, useState, useMemo, useRef } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { cn } from '@/core/utils';
import { ModuleError } from '@/core/modules/error-boundary';
import { MODAL_BREAKPOINTS, MODAL_POSITIONS, MODAL_CHROME } from '@/core/modules/modal/config';
import { useModal } from '@/core/modules/modal/context';
import { ModalTitle } from '@/core/modules/modal/title';

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
  const shellRef = useRef(null);
  const focusableRef = useRef([]);
  const [shellWidth, setShellWidth] = useState(null);

  const activePosition = useMemo(() => {
    return resolveActivePosition(entry.position, entry.responsivePosition, isMobileViewport);
  }, [entry.position, entry.responsivePosition, isMobileViewport]);

  const SpecificModalComponent = registry.get(entry.modalType);

  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT;
  const isTopModalPosition = activePosition === MODAL_POSITIONS.TOP;
  const isBottomModalPosition = activePosition === MODAL_POSITIONS.BOTTOM;
  const isCenterModal = activePosition === MODAL_POSITIONS.CENTER;

  const shouldRenderAttachedTitle = Boolean(entry.title && !isLeftModal && !isRightModal);
  const shouldRenderEmbeddedTitle = Boolean(entry.title && (isLeftModal || isRightModal));

  const titlePlacement = isTopModalPosition ? 'attached-bottom' : 'attached-top';
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

  useLayoutEffect(() => {
    if (!shellRef.current || !shouldRenderAttachedTitle) {
      setShellWidth(null);
      return;
    }

    function updateWidth() {
      const nextWidth = shellRef.current?.offsetWidth;
      setShellWidth(Number.isFinite(nextWidth) ? nextWidth : null);
    }

    updateWidth();

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(shellRef.current);

    return () => {
      observer.disconnect();
    };
  }, [entry.id, shouldRenderAttachedTitle]);

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
      {isTopModal && (
        <motion.div
          className={`fixed inset-0 bg-[#67e8f9] backdrop-blur-2xl`}
          style={{ zIndex: backdropZIndex }}
          variants={BACKDROP_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={() => closeModal(null, entry.id)}
        />
      )}

      <motion.div
        ref={modalRef}
        className={cn(
          'relative flex max-w-full transform-gpu flex-col items-center',
          !isCenterModal && 'w-full self-stretch sm:w-auto sm:self-auto',
          shouldRenderAttachedTitle && isTopModalPosition && 'flex-col-reverse'
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
        {shouldRenderAttachedTitle && (
          <ModalTitle
            title={entry.title}
            close={(result) => closeModal(result, entry.id)}
            titleId={titleId}
            placement={titlePlacement}
            className={isTopModalPosition ? '-mt-px' : '-mb-px'}
            style={shellWidth ? { width: `${Math.round(shellWidth * 0.9)}px` } : undefined}
          />
        )}

        <div
          ref={shellRef}
          data-lenis-prevent
          data-lenis-prevent-wheel
          className={cn(
            'relative flex flex-col',
            isPanelChrome
              ? 'overflow-hidden rounded-[16px] bg-[#fef3c7]'
              : 'overflow-visible rounded-[16px] border border-transparent bg-transparent backdrop-blur-none',
            isPanelChrome && isCenterModal && 'rounded-[16px] border border-[#f97316]',
            isPanelChrome &&
              isTopModalPosition &&
              'w-full self-stretch rounded-t-none border-b border-[#f43f5e] sm:mt-2 sm:rounded-t-[16px] sm:border',
            isPanelChrome &&
              isBottomModalPosition &&
              'w-full self-stretch rounded-b-none border-t border-[#c026d3] sm:mb-2 sm:rounded-b-[16px] sm:border',
            isPanelChrome &&
              (isLeftModal || isRightModal) && [
                'h-screen max-h-screen w-full self-stretch border border-[#f59e0b] sm:w-auto sm:self-auto',
                isLeftModal ? 'rounded-l-none border-l-0' : 'rounded-r-none border-r-0',
              ]
          )}
        >
          <ModuleError name={entry.modalType}>
            <SpecificModalComponent
              header={{
                title: entry.title,
                position: activePosition,
                renderInside: shouldRenderEmbeddedTitle,
                titleId,
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
