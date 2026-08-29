'use client';

import Link from 'next/link';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

const DEFAULT_NAV_CLASS = '';

export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 8) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1,
    );
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
      if (page - prevPage === 2) items.push(prevPage + 1);
      else if (page - prevPage > 2) items.push(`ellipsis-${prevPage}-${page}`);
    }
    items.push(page);
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
  if (totalPages <= 1) return null;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginationItems = getAccountPaginationItems(safeCurrentPage, totalPages);
  const config = {
    canUseLinks: typeof getPageHref === 'function',
    canUseButtons: typeof onPageChange === 'function',
  };
  const pageItems = paginationItems.map((item, index) =>
    typeof item === 'number' ? (
      <PaginationPageItem
        key={item}
        pageNumber={item}
        safeCurrentPage={safeCurrentPage}
        pageClassName={pageClassName}
        activePageClassName={activePageClassName}
        inactivePageClassName={inactivePageClassName}
        getPageHref={getPageHref}
        onPageChange={onPageChange}
        config={config}
      />
    ) : (
      <span key={`${item}-${index}`}>...</span>
    ),
  );
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
    config,
  };
  const nextNavProps = {
    ...prevNavProps,
    direction: 'next',
    ariaLabel: nextAriaLabel,
    label: nextLabel,
    iconName: 'solar:skip-next-bold',
  };
  if (layout === 'split') {
    return (
      <div>
        <div>{showPrevNext && <PaginationNavButton {...prevNavProps} />}</div>
        <div>{pageItems}</div>
        <div>{showPrevNext && <PaginationNavButton {...nextNavProps} />}</div>
      </div>
    );
  }
  return (
    <div>
      {showPrevNext && <PaginationNavButton {...prevNavProps} />}
      {pageItems}
      {showPrevNext && <PaginationNavButton {...nextNavProps} />}
    </div>
  );
}
function PaginationPageItem({
  pageNumber,
  safeCurrentPage,
  pageClassName,
  activePageClassName,
  inactivePageClassName,
  getPageHref,
  onPageChange,
  config,
}) {
  const isActive = pageNumber === safeCurrentPage;
  const toneClass = isActive ? (activePageClassName ?? '') : (inactivePageClassName ?? '');
  const resolvedClass = cn(pageClassName ?? '', toneClass);
  if (isActive) {
    return <span aria-current="page">{pageNumber}</span>;
  }
  if (config.canUseLinks) {
    return <Link href={getPageHref(pageNumber)}>{pageNumber}</Link>;
  }
  if (config.canUseButtons) {
    return (
      <Button
        type="button"
        onClick={() => onPageChange(pageNumber)}
        aria-label={`Go to page ${pageNumber}`}
      >
        {pageNumber}
      </Button>
    );
  }
  return <span>{pageNumber}</span>;
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
  config,
}) {
  const isPrevious = direction === 'previous';
  const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
  const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;
  const navContent = String(label || '').trim() || <Icon size={iconSize} icon={iconName} />;
  const resolvedClass = cn(DEFAULT_NAV_CLASS, navClassName);
  if (disabled && hideDisabledNav) return null;
  if (config.canUseLinks && !disabled) {
    return (
      <Link href={getPageHref(targetPage)} aria-label={ariaLabel}>
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
      >
        {navContent}
      </Button>
    );
  }
  return <span aria-hidden="true">{navContent}</span>;
}
