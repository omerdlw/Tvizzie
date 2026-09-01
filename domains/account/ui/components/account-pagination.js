'use client';

import Link from 'next/link';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pinnedStartCount = 3;
  const pinnedEdgeCount = 1;
  const pages = new Set();

  const addRange = (start, end) => {
    for (let page = Math.max(1, start); page <= Math.min(end, totalPages); page++) {
      pages.add(page);
    }
  };

  addRange(1, pinnedEdgeCount);
  addRange(totalPages - pinnedEdgeCount + 1, totalPages);

  if (currentPage <= pinnedStartCount + 1) {
    addRange(1, pinnedStartCount + 1);
  } else if (currentPage >= totalPages - pinnedStartCount) {
    addRange(totalPages - pinnedStartCount, totalPages);
  } else {
    addRange(currentPage - 1, currentPage + 1);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items = [];

  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const prevPage = sortedPages[index - 1];
      if (page - prevPage === 2) items.push(prevPage + 1);
      else if (page - prevPage > 2) items.push(`ellipsis-${prevPage}-${page}`);
    }
    items.push(page);
  });

  return items;
}

export default function AccountPagination({
  className = '',
  currentPage = 1,
  getPageHref = null,
  hideDisabledNav = false,
  iconSize = 14,
  nextAriaLabel = 'Go to next page',
  nextLabel = 'Next',
  onPageChange = null,
  prevAriaLabel = 'Go to previous page',
  prevLabel = 'Prev',
  showPrevNext = true,
  totalPages = 1,
}) {
  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginationItems = getAccountPaginationItems(safeCurrentPage, totalPages);

  const config = {
    canUseLinks: typeof getPageHref === 'function',
    canUseButtons: typeof onPageChange === 'function',
  };

  const prevNavProps = {
    ariaLabel: prevAriaLabel,
    config,
    direction: 'previous',
    getPageHref,
    hideDisabledNav,
    iconName: 'solar:alt-arrow-left-linear',
    iconSize,
    label: prevLabel,
    onPageChange,
    safeCurrentPage,
    totalPages,
  };

  const nextNavProps = {
    ariaLabel: nextAriaLabel,
    config,
    direction: 'next',
    getPageHref,
    hideDisabledNav,
    iconName: 'solar:alt-arrow-right-linear',
    iconSize,
    label: nextLabel,
    onPageChange,
    safeCurrentPage,
    totalPages,
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={cn('flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 py-2', className)}
    >
      {showPrevNext && <PaginationNavButton {...prevNavProps} />}

      <div className="flex items-center gap-1 sm:gap-1.5">
        {paginationItems.map((item, index) =>
          typeof item === 'number' ? (
            <PaginationPageItem
              key={item}
              config={config}
              getPageHref={getPageHref}
              onPageChange={onPageChange}
              pageNumber={item}
              safeCurrentPage={safeCurrentPage}
            />
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 min-w-6 items-center justify-center text-xs font-semibold text-white/30 select-none tracking-widest"
              aria-hidden="true"
            >
              …
            </span>
          ),
        )}
      </div>

      {showPrevNext && <PaginationNavButton {...nextNavProps} />}
    </nav>
  );
}

function PaginationPageItem({ config, getPageHref, onPageChange, pageNumber, safeCurrentPage }) {
  const isActive = pageNumber === safeCurrentPage;

  if (isActive) {
    return (
      <span
        aria-current="page"
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-white px-2.5 text-xs font-bold text-black shadow-md select-none"
      >
        {pageNumber}
      </span>
    );
  }

  const baseItemClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-2.5 text-xs font-semibold text-white/70 transition-all hover:ring-white/15 hover:bg-white/10 hover:text-white select-none';

  if (config.canUseLinks) {
    return (
      <Link href={getPageHref(pageNumber)} className={baseItemClass}>
        {pageNumber}
      </Link>
    );
  }

  if (config.canUseButtons) {
    return (
      <Button
        type="button"
        onClick={() => onPageChange(pageNumber)}
        aria-label={`Go to page ${pageNumber}`}
        className={baseItemClass}
      >
        {pageNumber}
      </Button>
    );
  }

  return <span className={baseItemClass}>{pageNumber}</span>;
}

function PaginationNavButton({
  ariaLabel,
  config,
  direction,
  getPageHref,
  hideDisabledNav,
  iconName,
  iconSize,
  label,
  onPageChange,
  safeCurrentPage,
  totalPages,
}) {
  const isPrevious = direction === 'previous';
  const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
  const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;

  if (disabled && hideDisabledNav) return null;

  const buttonClass =
    'inline-flex h-9 items-center justify-center gap-1 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-2.5 sm:px-3 text-xs font-semibold uppercase text-white/70 transition-all hover:ring-white/15 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30 select-none';

  const navContent = (
    <>
      {isPrevious && <Icon size={iconSize} icon={iconName} className="shrink-0" />}
      <span className="hidden sm:inline">{label}</span>
      {!isPrevious && <Icon size={iconSize} icon={iconName} className="shrink-0" />}
    </>
  );

  if (config.canUseLinks && !disabled) {
    return (
      <Link href={getPageHref(targetPage)} aria-label={ariaLabel} className={buttonClass}>
        {navContent}
      </Link>
    );
  }

  if (config.canUseButtons) {
    return (
      <Button
        type="button"
        onClick={() => onPageChange(targetPage)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={buttonClass}
      >
        {navContent}
      </Button>
    );
  }

  return (
    <span aria-hidden="true" className={buttonClass}>
      {navContent}
    </span>
  );
}
