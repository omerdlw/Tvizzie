'use client';

import { isValidElement } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/classnames';
import Icon from '@/ui/primitives/icon';

import { INFO_ACTION_TONE_CLASS } from '@/shared/constants';
import { MODAL_POSITIONS } from '@/modules/modal/modal-config';
import { MODAL_MICRO_SPRING, MODAL_MICRO_TAP_SCALE } from './modal-motion';

export const CANCEL_BUTTON_CLASS =
  'h-8 shrink-0 border rounded-xl border-black/10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase text-black/70 hover:bg-black/5 hover:text-black transition-colors duration-150 ease-linear';

export const ACTION_BUTTON_CLASS = cn(
  'h-8 shrink-0 rounded-xl px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors duration-150 ease-linear disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/50',
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
  return cn(
    'bg-primary rounded-2xl min-h-0 w-full flex-1 overflow-y-auto overscroll-contain modal-body',
    bodyClassName,
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
      whileTap={{ scale: MODAL_MICRO_TAP_SCALE }}
      transition={MODAL_MICRO_SPRING}
      onClick={close}
      className="center inline-flex size-8 cursor-pointer rounded-full border border-black/5 bg-black/5 text-black/70 transition-colors duration-150 ease-linear hover:border-transparent hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none"
    >
      <Icon icon="material-symbols:close-rounded" size={16} />
    </motion.button>
  );
}

export default function Container({
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
        <div
          className={cn(
            hasSlotContent(headerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-3 px-4 py-3',
            headerIsSticky && 'sticky top-0 z-10 bg-white',
          )}
        >
          <div className="min-w-0">{headerLeft}</div>
          {hasSlotContent(headerCenter) && (
            <div className="flex items-center justify-center">{headerCenter}</div>
          )}
          <div className="min-w-0">{headerRight}</div>
        </div>
      ) : null}

      <div data-lenis-prevent data-lenis-prevent-wheel className={getBodyClassName(bodyClassName)}>
        {children}
      </div>

      {shouldRenderFooter ? (
        <div
          className={cn(
            hasSlotContent(footerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-3 px-4 py-3',
            footerIsSticky && 'sticky bottom-0 bg-white',
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          {hasSlotContent(footerCenter) && (
            <div className="flex items-center justify-center">{footerCenter}</div>
          )}
          <div
            className={cn(
              'flex items-center gap-2',
              hasSlotContent(footerCenter) ? 'w-full justify-end' : null,
            )}
          >
            {footerRight}
          </div>
        </div>
      ) : null}
    </div>
  );
}
