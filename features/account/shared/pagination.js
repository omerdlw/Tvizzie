'use client';

import Link from 'next/link';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const DEFAULT_NAV_CLASS =
  'inline-flex h-10 min-w-[96px] items-center justify-center rounded border border-white/10 bg-black px-3 text-[11px] font-semibold tracking-widest text-white/70 uppercase transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[112px] sm:px-4 sm:text-xs';

export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pinnedStartCount = 4;
  const pinnedEdgeCount = 2;
  const pages = new Set();
  const sortedPages = [];

  const addRange = (start, end) => {
    for (let page = start; page <= end; page += 1) {
      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }
  };

  addRange(1, Math.min(pinnedEdgeCount, totalPages));
  addRange(Math.max(1, totalPages - pinnedEdgeCount + 1), totalPages);

  if (currentPage <= pinnedStartCount) {
    addRange(1, Math.min(pinnedStartCount, totalPages));
  } else if (currentPage >= totalPages - (pinnedStartCount - 1)) {
    addRange(Math.max(1, totalPages - pinnedStartCount + 1), totalPages);
  } else {
    addRange(currentPage - 1, currentPage + 1);
  }

  pages.forEach((page) => {
    sortedPages.push(page);
  });
  sortedPages.sort((left, right) => left - right);

  const items = [];
  let previousPage = null;

  sortedPages.forEach((page) => {
    if (previousPage != null) {
      const gap = page - previousPage;

      if (gap === 2) {
        items.push(previousPage + 1);
      } else if (gap > 2) {
        items.push(`ellipsis-${previousPage}-${page}`);
      }
    }

    items.push(page);
    previousPage = page;
  });

  return items;
}

export default function AccountPagination({
  className = null,
  currentPage = 1,
  ellipsisClassName = null,
  getPageHref = null,
  hideDisabledNav = false,
  iconSize = 15,
  inactivePageClassName = null,
  layout = 'split',
  navClassName = null,
  nextLabel = 'Next',
  nextAriaLabel = 'Go to next page',
  onPageChange = null,
  pageListClassName = null,
  pageClassName = null,
  activePageClassName = null,
  prevLabel = 'Previous',
  prevAriaLabel = 'Go to previous page',
  showPrevNext = true,
  splitClassName = null,
  splitNavSlotClassName = null,
  splitPrevSlotClassName = null,
  splitNextSlotClassName = null,
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
    const pageToneClassName = isActive
      ? (activePageClassName ?? 'text-white')
      : (inactivePageClassName ?? 'text-white/55');
    const resolvedClassName = cn(
      pageClassName ?? 'px-1 text-sm font-semibold leading-none select-none',
      pageToneClassName
    );

    if (isActive) {
      return (
        <span key={pageNumber} aria-current="page" className={resolvedClassName}>
          {pageNumber}
        </span>
      );
    }

    if (canUseLinks) {
      return (
        <Link key={pageNumber} href={getPageHref(pageNumber)} className={resolvedClassName}>
          {pageNumber}
        </Link>
      );
    }

    if (canUseButtons) {
      return (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-label={`Go to page ${pageNumber}`}
          className={resolvedClassName}
        >
          {pageNumber}
        </button>
      );
    }

    return (
      <span key={pageNumber} className={resolvedClassName}>
        {pageNumber}
      </span>
    );
  }

  function renderNav(direction) {
    const isPrevious = direction === 'previous';
    const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
    const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;
    const ariaLabel = isPrevious ? prevAriaLabel : nextAriaLabel;
    const iconName = isPrevious ? 'solar:skip-previous-bold' : 'solar:skip-next-bold';
    const navLabel = String((isPrevious ? prevLabel : nextLabel) || '').trim();
    const navContent = navLabel || <Icon size={iconSize} icon={iconName} />;
    const resolvedNavClassName = cn(DEFAULT_NAV_CLASS, navClassName);

    if (disabled && hideDisabledNav) {
      return null;
    }

    if (canUseLinks && !disabled) {
      return (
        <Link key={direction} href={getPageHref(targetPage)} aria-label={ariaLabel} className={resolvedNavClassName}>
          {navContent}
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
          className={resolvedNavClassName}
        >
          {navContent}
        </button>
      );
    }

    return (
      <span
        key={direction}
        aria-hidden="true"
        className={cn(resolvedNavClassName, disabled ? 'cursor-not-allowed opacity-40' : null)}
      >
        {navContent}
      </span>
    );
  }

  const pageItems = paginationItems.map((item, index) =>
    typeof item === 'number' ? (
      renderPage(item)
    ) : (
      <span key={`${item}-${index}`} className={ellipsisClassName ?? 'px-1 text-sm text-white/50 select-none'}>
        ...
      </span>
    )
  );

  if (layout === 'split') {
    const splitWrapperClassName = cn(
      'grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3',
      splitClassName,
      className
    );
    const splitPrevSlotClassNameResolved = cn('flex justify-start', splitNavSlotClassName, splitPrevSlotClassName);
    const splitNextSlotClassNameResolved = cn('flex justify-end', splitNavSlotClassName, splitNextSlotClassName);

    return (
      <div className={splitWrapperClassName}>
        <div className={splitPrevSlotClassNameResolved}>{showPrevNext ? renderNav('previous') : null}</div>

        <div className={cn('flex flex-wrap items-center justify-center gap-3 sm:gap-4', pageListClassName)}>
          {pageItems}
        </div>

        <div className={splitNextSlotClassNameResolved}>{showPrevNext ? renderNav('next') : null}</div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showPrevNext ? renderNav('previous') : null}

      {pageItems}

      {showPrevNext ? renderNav('next') : null}
    </div>
  );
}
