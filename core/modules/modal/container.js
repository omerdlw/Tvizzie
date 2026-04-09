'use client';

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
  const headerConfig = !isHeaderDisabled && header && typeof header === 'object' ? header : {};
  const position = headerConfig?.position;
  const showClose = headerConfig?.showClose !== false;
  const headerActions = resolveHeaderActions(headerConfig?.actions, close);

  const shouldRenderHeader = !isHeaderDisabled && (Boolean(headerConfig?.title) || Boolean(headerActions) || showClose);
  const shouldRenderFooter = footer !== false;

  const footerConfig = footer && typeof footer === 'object' ? footer : {};
  const footerLeft = footerConfig.left || null;
  const footerRight = footerConfig.right || null;
  const footerIsSticky = Boolean(footerConfig.sticky);

  return (
    <div className={getContainerClassName({ className, position })}>
      {shouldRenderHeader ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {headerConfig?.title ? (
              <h2 id={headerConfig.titleId} className="truncate text-sm font-semibold text-black">
                {headerConfig.title}
              </h2>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            {showClose ? <CloseButton close={close} /> : null}
          </div>
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
            'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3',
            footerIsSticky && 'sticky bottom-0'
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          <div className="flex items-center justify-end gap-2">{footerRight}</div>
        </div>
      ) : null}
    </div>
  );
}
