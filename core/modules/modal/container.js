'use client';

import { isValidElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import { MODAL_POSITIONS } from '@/core/modules/modal/config';
import {
  MODAL_ACTION_MOTION,
  MODAL_BODY_MOTION,
  MODAL_FOOTER_MOTION,
  MODAL_HEADER_MOTION,
} from '@/core/modules/motion';

const HEIGHT_CONSTRAINT_PATTERN = /(^|\s)(?:[\w-]+:)*(?:h|max-h)-/;

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
  const sideModal = isSideModal(position);

  return cn('min-h-0 w-full flex-1 overflow-y-auto overscroll-contain', sideModal ? ' ' : '', bodyClassName);
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
      className="center size-8 border border-transparent bg-transparent text-white/70 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-white"
      {...MODAL_ACTION_MOTION}
    >
      <Icon icon="material-symbols:close-rounded" size={18} />
    </motion.button>
  );
}

export default function Container({ children, className, bodyClassName, header = {}, footer, close }) {
  const isHeaderDisabled = header === false;
  const headerConfig = !isHeaderDisabled && isHeaderConfig(header) ? header : {};
  const hasCustomHeaderNode = !isHeaderDisabled && !isHeaderConfig(header) && hasSlotContent(header);
  const position = headerConfig?.position;
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
    <div className={getContainerClassName({ className, position })}>
      <AnimatePresence initial={false}>
        {shouldRenderHeader ? (
          <motion.div
            className={cn(
              hasSlotContent(headerCenter)
                ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
                : 'flex justify-between',
              'items-center gap-2 p-2',
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
        className={getBodyClassName(position, bodyClassName)}
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
              'items-center gap-2 p-2',
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
