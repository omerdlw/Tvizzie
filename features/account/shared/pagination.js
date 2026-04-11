'use client';

import Link from 'next/link';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

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
  className = 'flex flex-wrap items-center justify-end gap-2',
  currentPage = 1,
  ellipsisClassName = 'text-xs',
  getPageHref = null,
  hideDisabledNav = false,
  iconSize = 16,
  inactivePageClassName = 'border-black/15 bg-white/50 text-black/70',
  navClassName = 'center size-12 border border-black/15 bg-white/50 text-xs font-semibold text-black/70 transition disabled:cursor-not-allowed disabled:opacity-40',
  nextAriaLabel = 'Go to next page',
  onPageChange = null,
  pageClassName = 'center size-12 border text-xs font-semibold transition',
  activePageClassName = 'border-black/30 bg-white/90 text-black shadow-sm',
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
        <Link key={pageNumber} href={getPageHref(pageNumber)} aria-current={isActive ? 'page' : undefined} className={resolvedClassName}>
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
