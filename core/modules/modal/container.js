'use client';

import { isValidElement } from 'react';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import { MODAL_POSITIONS } from '@/core/modules/modal/config';

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
    <button
      type="button"
      aria-label={label}
      onClick={close}
      className="bg-primary inline-flex size-8 items-center justify-center rounded-full border border-black/10 text-black/70 transition hover:bg-black/5 hover:text-black"
    >
      <Icon icon="material-symbols:close-rounded" size={18} />
    </button>
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
    <div className={getContainerClassName({ className, position })}>
      {shouldRenderHeader ? (
        <div
          className={cn(
            hasSlotContent(headerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-3 px-4 py-3',
            headerIsSticky && 'sticky top-0 z-10'
          )}
        >
          <div className="min-w-0">{headerLeft}</div>
          {hasSlotContent(headerCenter) && <div className="flex items-center justify-center">{headerCenter}</div>}
          <div className="min-w-0">{headerRight}</div>
        </div>
      ) : null}

      <div
        data-lenis-prevent
        data-lenis-prevent-wheel
        className={cn(
          'bg-primary min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-t-[16px] rounded-b-[16px]',
          bodyClassName
        )}
      >
        {children}
      </div>

      {shouldRenderFooter ? (
        <div
          className={cn(
            hasSlotContent(footerCenter)
              ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'flex justify-between',
            'items-center gap-3 px-4 py-3',
            footerIsSticky && 'sticky bottom-0'
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          {hasSlotContent(footerCenter) && <div className="flex items-center justify-center">{footerCenter}</div>}
          <div className={cn('flex items-center gap-2', hasSlotContent(footerCenter) ? 'w-full justify-end' : null)}>
            {footerRight}
          </div>
        </div>
      ) : null}
    </div>
  );
}
