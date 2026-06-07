'use client';

import { isValidElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import Icon from '@/ui/icon';

import { MODAL_POSITIONS } from '@/core/modules/modal/config';
import {
  MODAL_ACTION_MOTION,
  MODAL_BODY_MOTION,
  MODAL_FOOTER_MOTION,
  MODAL_HEADER_MOTION,
} from '@/core/modules/motion';

export const CANCEL_BUTTON_CLASS =
  'h-8 shrink-0 border border-black/10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase rounded-[10px] text-black/70 hover:bg-black/5 hover:text-black transition-all duration-300 ease-out';

export const ACTION_BUTTON_CLASS =
  'hover:bg-info hover:border-info hover:text-primary h-8 border border-black bg-black px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase text-white rounded-[10px] transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/50';

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
    className
  );
}

function getBodyClassName(position, bodyClassName) {
  const isLeftModal = position === MODAL_POSITIONS.LEFT;
  const isRightModal = position === MODAL_POSITIONS.RIGHT;
  const isTopModal = position === MODAL_POSITIONS.TOP;
  const isBottomModal = position === MODAL_POSITIONS.BOTTOM;

  return cn(
    'bg-primary min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-[14px] modal-body',
    isTopModal && ' ',
    isBottomModal && ' ',
    isLeftModal && ' ',
    isRightModal && ' ',
    !(isLeftModal || isRightModal || isTopModal || isBottomModal) && '',
    bodyClassName
  );
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
    <motion.button
      type="button"
      aria-label={label}
      onClick={close}
      className="bg-primary inline-flex size-8 items-center justify-center rounded-full border border-black/5 text-black/70 transition-all duration-300 ease-out hover:bg-white hover:text-black"
      {...MODAL_ACTION_MOTION}
    >
      <Icon icon="material-symbols:close-rounded" size={18} />
    </motion.button>
  );
}

export default function Container({ children, className, bodyClassName, header = {}, footer, close, position = null }) {
  const isHeaderDisabled = header === false;
  const headerConfig = !isHeaderDisabled && isHeaderConfig(header) ? header : {};
  const hasCustomHeaderNode = !isHeaderDisabled && !isHeaderConfig(header) && hasSlotContent(header);
  const resolvedPosition = position || headerConfig?.position || null;
  const showClose = headerConfig?.showClose === true;
  const headerActions = resolveHeaderActions(headerConfig?.actions, close);
  const headerLeft = hasCustomHeaderNode
    ? null
    : (headerConfig?.left ??
      (headerConfig?.title ? (
        <h2 id={headerConfig.titleId} className="truncate text-sm font-semibold text-black">
          {headerConfig.title}
        </h2>
      ) : null));
  const headerCenter = hasCustomHeaderNode ? header : (headerConfig?.center ?? null);
  const headerRight = hasCustomHeaderNode
    ? null
    : (headerConfig?.right ??
      (hasSlotContent(headerActions) || showClose ? (
        <div className="flex items-center justify-end gap-2">
          {headerActions}
          {showClose ? <CloseButton close={close} /> : null}
        </div>
      ) : null));
  const headerIsSticky = Boolean(headerConfig?.sticky);
  const shouldRenderHeader =
    !isHeaderDisabled && (hasSlotContent(headerLeft) || hasSlotContent(headerCenter) || hasSlotContent(headerRight));

  const footerConfig = footer && typeof footer === 'object' ? footer : {};
  const footerLeft = footerConfig.left ?? null;
  const footerCenter = footerConfig.center ?? null;
  const footerRight = footerConfig.right ?? null;
  const footerIsSticky = Boolean(footerConfig.sticky);
  const shouldRenderFooter =
    footer !== false && (hasSlotContent(footerLeft) || hasSlotContent(footerCenter) || hasSlotContent(footerRight));

  return (
    <div className={getContainerClassName({ className, position: resolvedPosition })}>
      <AnimatePresence initial={false}>
        {shouldRenderHeader ? (
          <motion.div
            className={cn(
              hasSlotContent(headerCenter)
                ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
                : 'flex justify-between',
              'items-center gap-3 px-4 py-3',
              headerIsSticky && 'sticky top-0 z-10'
            )}
            {...MODAL_HEADER_MOTION}
          >
            <div className="min-w-0">{headerLeft}</div>
            {hasSlotContent(headerCenter) && <div className="flex items-center justify-center">{headerCenter}</div>}
            <div className="min-w-0">{headerRight}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        data-lenis-prevent
        data-lenis-prevent-wheel
        className={getBodyClassName(resolvedPosition, bodyClassName)}
        {...MODAL_BODY_MOTION}
      >
        {children}
      </motion.div>

      <AnimatePresence initial={false}>
        {shouldRenderFooter ? (
          <motion.div
            className={cn(
              hasSlotContent(footerCenter)
                ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
                : 'flex justify-between',
              'items-center gap-3 px-4 py-3',
              footerIsSticky && 'sticky bottom-0'
            )}
            {...MODAL_FOOTER_MOTION}
          >
            <div className="min-w-0">{footerLeft}</div>
            {hasSlotContent(footerCenter) && <div className="flex items-center justify-center">{footerCenter}</div>}
            <div className={cn('flex items-center gap-2', hasSlotContent(footerCenter) ? 'w-full justify-end' : null)}>
              {footerRight}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
