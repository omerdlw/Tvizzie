'use client';

import Link from 'next/link';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

// --------------------------------------------------
// CONSTANTS & HELPERS
// --------------------------------------------------

const DEFAULT_NAV_CLASS = "inline-flex h-10 min-w-[96px] items-center justify-center border border-black/10 bg-white px-3 text-[11px] font-semibold tracking-widest text-black/70 uppercase hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[112px] sm:px-4 sm:text-xs";
export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 8) {
    return Array.from({
      length: totalPages
    }, (_, index) => index + 1);
  }
  const pinnedStartCount = 4;
  const pinnedEdgeCount = 2;
  const pages = new Set();
  const addRange = (start, end) => {
    for (let page = Math.max(1, start); page <= Math.min(end, totalPages); page++) {
      pages.add(page);
    }
  };
  addRange(1, pinnedEdgeCount);
  addRange(totalPages - pinnedEdgeCount + 1, totalPages);
  if (currentPage <= pinnedStartCount) {
    addRange(1, pinnedStartCount);
  } else if (currentPage >= totalPages - (pinnedStartCount - 1)) {
    addRange(totalPages - pinnedStartCount + 1, totalPages);
  } else {
    addRange(currentPage - 1, currentPage + 1);
  }
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items = [];
  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const prevPage = sortedPages[index - 1];
      if (page - prevPage === 2) items.push(prevPage + 1);else if (page - prevPage > 2) items.push(`ellipsis-${prevPage}-${page}`);
    }
    items.push(page);
  });
  return items;
}

// --------------------------------------------------
// COMPONENTS (LOGIC & VIEW)
// --------------------------------------------------

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
  totalPages = 1
}) {
  if (totalPages <= 1) return null;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginationItems = getAccountPaginationItems(safeCurrentPage, totalPages);
  const config = {
    canUseLinks: typeof getPageHref === 'function',
    canUseButtons: typeof onPageChange === 'function'
  };
  const pageItems = paginationItems.map((item, index) => typeof item === 'number' ? <PaginationPageItem key={item} pageNumber={item} safeCurrentPage={safeCurrentPage} pageClassName={pageClassName} activePageClassName={activePageClassName} inactivePageClassName={inactivePageClassName} getPageHref={getPageHref} onPageChange={onPageChange} config={config} /> : <span key={`${item}-${index}`} className={ellipsisClassName ?? 'px-1 text-sm text-black/50 select-none'}>
        ...
      </span>);
  const prevNavProps = {
    direction: 'previous',
    safeCurrentPage,
    totalPages,
    hideDisabledNav,
    getPageHref,
    onPageChange,
    iconSize,
    navClassName,
    ariaLabel: prevAriaLabel,
    label: prevLabel,
    iconName: 'solar:skip-previous-bold',
    config
  };
  const nextNavProps = {
    ...prevNavProps,
    direction: 'next',
    ariaLabel: nextAriaLabel,
    label: nextLabel,
    iconName: 'solar:skip-next-bold'
  };
  if (layout === 'split') {
    return <div className={cn('grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3', splitClassName, className)}>
        <div className={cn('flex justify-start', splitNavSlotClassName, splitPrevSlotClassName)}>
          {showPrevNext && <PaginationNavButton {...prevNavProps} />}
        </div>
        <div className={cn('flex flex-wrap items-center justify-center gap-3 sm:gap-4', pageListClassName)}>
          {pageItems}
        </div>
        <div className={cn('flex justify-end', splitNavSlotClassName, splitNextSlotClassName)}>
          {showPrevNext && <PaginationNavButton {...nextNavProps} />}
        </div>
      </div>;
  }
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showPrevNext && <PaginationNavButton {...prevNavProps} />}
      {pageItems}
      {showPrevNext && <PaginationNavButton {...nextNavProps} />}
    </div>;
}
function PaginationPageItem({
  pageNumber,
  safeCurrentPage,
  pageClassName,
  activePageClassName,
  inactivePageClassName,
  getPageHref,
  onPageChange,
  config
}) {
  const isActive = pageNumber === safeCurrentPage;
  const toneClass = isActive ? activePageClassName ?? 'text-black' : inactivePageClassName ?? 'text-black/55';
  const resolvedClass = cn(pageClassName ?? 'px-1 text-sm font-semibold leading-none select-none', toneClass);
  if (isActive) {
    return <span aria-current="page" className={resolvedClass}>
        {pageNumber}
      </span>;
  }
  if (config.canUseLinks) {
    return <Link href={getPageHref(pageNumber)} className={resolvedClass}>
        {pageNumber}
      </Link>;
  }
  if (config.canUseButtons) {
    return <button type="button" onClick={() => onPageChange(pageNumber)} aria-label={`Go to page ${pageNumber}`} className={resolvedClass}>
        {pageNumber}
      </button>;
  }
  return <span className={resolvedClass}>{pageNumber}</span>;
}
function PaginationNavButton({
  direction,
  safeCurrentPage,
  totalPages,
  hideDisabledNav,
  getPageHref,
  onPageChange,
  iconSize,
  navClassName,
  ariaLabel,
  label,
  iconName,
  config
}) {
  const isPrevious = direction === 'previous';
  const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
  const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;
  const navContent = String(label || '').trim() || <Icon size={iconSize} icon={iconName} />;
  const resolvedClass = cn(DEFAULT_NAV_CLASS, navClassName);
  if (disabled && hideDisabledNav) return null;
  if (config.canUseLinks && !disabled) {
    return <Link href={getPageHref(targetPage)} aria-label={ariaLabel} className={resolvedClass}>
        {navContent}
      </Link>;
  }
  if (config.canUseButtons) {
    return <button type="button" onClick={() => onPageChange(targetPage)} disabled={disabled} aria-label={ariaLabel} className={resolvedClass}>
        {navContent}
      </button>;
  }
  return <span aria-hidden="true" className={cn(resolvedClass, disabled && 'cursor-not-allowed opacity-40')}>
      {navContent}
    </span>;
}
