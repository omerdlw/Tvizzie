'use client';

import { useEffect, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import AccountListCard from './card';
import AccountSectionLayout from '../shared/section-wrapper';
import AccountPagination from '../shared/pagination';
import { buildAccountCollectionPageHref, formatPaginationSummaryLabel } from '../utils';
import AccountInlineSectionState from '../shared/section-state';

const DEFAULT_ITEMS_PER_PAGE = 36;

export default function AccountPaginatedListGrid({
  currentPage = 1,
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  isLoading = false,
  lists = [],
  loadError = null,
  onPageChange = null,
  ownerUsername = null,
  pageBasePath,
  renderActions = null,
  renderHeaderAction = null,
  showHeader = true,
  toolbar = null,
  title,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedItemsPerPage = Math.max(1, Number(itemsPerPage) || DEFAULT_ITEMS_PER_PAGE);
  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && Number.isFinite(requestedQueryPage) && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;

  const totalPages = lists.length ? Math.ceil(lists.length / resolvedItemsPerPage) : 0;
  const activePage = totalPages ? Math.min(resolvedCurrentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * resolvedItemsPerPage;
  const paginationSummaryLabel = formatPaginationSummaryLabel({
    emptyLabel: '0 total',
    pageSize: resolvedItemsPerPage,
    startIndex: pageStart,
    totalCount: lists.length,
  });
  const visibleLists = useMemo(
    () => lists.slice(pageStart, pageStart + resolvedItemsPerPage),
    [lists, pageStart, resolvedItemsPerPage]
  );
  useEffect(() => {
    if (!totalPages || resolvedCurrentPage <= totalPages || !pageBasePath) {
      return;
    }

    if (canControlPagination) {
      onPageChange(totalPages);
      return;
    }

    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
  }, [canControlPagination, onPageChange, pageBasePath, resolvedCurrentPage, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      summaryLabel={showHeader ? paginationSummaryLabel : null}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
    >
      {toolbar}

      {isLoading && lists.length === 0 ? (
        <AccountInlineSectionState>Loading lists</AccountInlineSectionState>
      ) : lists.length === 0 ? (
        <AccountInlineSectionState>{loadError || emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {visibleLists.map((list) => (
              <div
                key={`${list.ownerId || list.ownerSnapshot?.id || 'owner'}-${list.id}`}
              >
                <AccountListCard
                  layout="grid"
                  list={list}
                  ownerUsername={ownerUsername}
                  renderActions={renderActions}
                />
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div
              key={`list-grid-pagination-${activePage}-${totalPages}`}
            >
              <AccountPagination
                className="w-full"
                currentPage={activePage}
                onPageChange={canControlPagination ? onPageChange : null}
                totalPages={totalPages}
                getPageHref={canControlPagination ? null : (page) => buildAccountCollectionPageHref(pageBasePath, page)}
              />
            </div>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}
