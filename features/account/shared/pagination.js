'use client';

import Link from 'next/link';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

export const ACCOUNT_PAGINATION_STYLE_PROPS = Object.freeze({
  className: 'flex flex-wrap items-center gap-2',
  pageClassName: 'center size-10 rounded-[12px] border text-xs font-semibold transition',
  activePageClassName: 'border-black bg-black text-white',
  inactivePageClassName: 'border-black/10 bg-white hover:border-black/20 text-black/70',
  navClassName:
    'center size-10 rounded-[10px] border border-black/10 bg-white hover:border-black/20 text-xs font-semibold text-black/70 transition disabled:cursor-not-allowed disabled:opacity-50',
  ellipsisClassName: 'px-1 text-xs text-black/60',
  iconSize: 15,
});
export const ACCOUNT_PAGINATION_LIST_DETAIL_STYLE_PROPS = ACCOUNT_PAGINATION_STYLE_PROPS;

export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push('start-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('end-ellipsis');
  }

  items.push(totalPages);

  return items;
}

export default function AccountPagination({
  className = ACCOUNT_PAGINATION_STYLE_PROPS.className,
  currentPage = 1,
  ellipsisClassName = ACCOUNT_PAGINATION_STYLE_PROPS.ellipsisClassName,
  getPageHref = null,
  hideDisabledNav = false,
  iconSize = ACCOUNT_PAGINATION_STYLE_PROPS.iconSize,
  inactivePageClassName = ACCOUNT_PAGINATION_STYLE_PROPS.inactivePageClassName,
  navClassName = ACCOUNT_PAGINATION_STYLE_PROPS.navClassName,
  nextAriaLabel = 'Go to next page',
  onPageChange = null,
  pageClassName = ACCOUNT_PAGINATION_STYLE_PROPS.pageClassName,
  activePageClassName = ACCOUNT_PAGINATION_STYLE_PROPS.activePageClassName,
  prevAriaLabel = 'Go to previous page',
  showPrevNext = true,
  totalPages = 1,
}) {
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const paginationItems = getAccountPaginationItems(safeCurrentPage, totalPages || 1);
  const canUseLinks = typeof getPageHref === 'function';
  const canUseButtons = typeof onPageChange === 'function';

  if (totalPages <= 1) {
    return null;
  }

  function renderPage(pageNumber) {
    const isActive = pageNumber === safeCurrentPage;
    const pageToneClassName = isActive ? activePageClassName : inactivePageClassName;
    const resolvedClassName = cn(pageClassName, pageToneClassName);

    if (canUseLinks) {
      return (
        <Link
          key={pageNumber}
          href={getPageHref(pageNumber)}
          aria-current={isActive ? 'page' : undefined}
          className={resolvedClassName}
        >
          {pageNumber}
        </Link>
      );
    }

    return (
      <button
        type="button"
        key={pageNumber}
        onClick={() => onPageChange(pageNumber)}
        aria-current={isActive ? 'page' : undefined}
        className={resolvedClassName}
        disabled={!canUseButtons || isActive}
      >
        {pageNumber}
      </button>
    );
  }

  function renderNav(direction) {
    const isPrevious = direction === 'previous';
    const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
    const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;
    const ariaLabel = isPrevious ? prevAriaLabel : nextAriaLabel;
    const iconName = isPrevious ? 'solar:skip-previous-bold' : 'solar:skip-next-bold';

    if (disabled && hideDisabledNav) {
      return null;
    }

    if (canUseLinks && !disabled) {
      return (
        <Link key={direction} href={getPageHref(targetPage)} aria-label={ariaLabel} className={navClassName}>
          <Icon size={iconSize} icon={iconName} />
        </Link>
      );
    }

    if (canUseButtons) {
      return (
        <button
          key={direction}
          type="button"
          onClick={() => onPageChange(targetPage)}
          disabled={disabled}
          aria-label={ariaLabel}
          className={navClassName}
        >
          <Icon size={iconSize} icon={iconName} />
        </button>
      );
    }

    return (
      <span
        key={direction}
        aria-hidden="true"
        className={cn(navClassName, disabled ? 'cursor-not-allowed opacity-40' : null)}
      >
        <Icon size={iconSize} icon={iconName} />
      </span>
    );
  }

  return (
    <div className={className}>
      {showPrevNext ? renderNav('previous') : null}

      {paginationItems.map((item, index) =>
        typeof item === 'number' ? (
          renderPage(item)
        ) : (
          <span key={`${item}-${index}`} className={ellipsisClassName}>
            ...
          </span>
        )
      )}

      {showPrevNext ? renderNav('next') : null}
    </div>
  );
}
