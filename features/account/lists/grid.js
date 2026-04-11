'use client';

import { useEffect, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import AccountListCard from './card';
import AccountSectionLayout from '../shared/section-wrapper';
import AccountPagination from '../shared/pagination';
import { buildAccountCollectionPageHref, formatPaginationSummaryLabel } from '../utils';
import AccountInlineSectionState from '../shared/section-state';

const ITEMS_PER_PAGE = 36;

export default function AccountPaginatedListGrid({
  currentPage = 1,
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  isLoading = false,
  lists = [],
  loadError = null,
  ownerUsername = null,
  pageBasePath,
  renderActions = null,
  renderHeaderAction = null,
  title,
}) {
  const router = useRouter();

  const totalPages = lists.length ? Math.ceil(lists.length / ITEMS_PER_PAGE) : 0;
  const activePage = totalPages ? Math.min(currentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE;
  const visibleLists = useMemo(() => lists.slice(pageStart, pageStart + ITEMS_PER_PAGE), [lists, pageStart]);
  useEffect(() => {
    if (!totalPages || currentPage <= totalPages || !pageBasePath) {
      return;
    }

    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
  }, [currentPage, pageBasePath, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      summaryLabel={formatPaginationSummaryLabel({
        emptyLabel: '0 total',
        pageSize: ITEMS_PER_PAGE,
        startIndex: pageStart,
        totalCount: lists.length,
      })}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
    >
      {isLoading && lists.length === 0 ? (
        <AccountInlineSectionState>Loading lists...</AccountInlineSectionState>
      ) : lists.length === 0 ? (
        <AccountInlineSectionState>{loadError || emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {visibleLists.map((list) => (
              <AccountListCard
                key={`${list.ownerId || list.ownerSnapshot?.id || 'owner'}-${list.id}`}
                layout="grid"
                list={list}
                ownerUsername={ownerUsername}
                renderActions={renderActions}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <AccountPagination
              currentPage={activePage}
              totalPages={totalPages}
              showPrevNext={false}
              getPageHref={(page) => buildAccountCollectionPageHref(pageBasePath, page)}
              className="flex flex-wrap items-center justify-end gap-2"
              pageClassName="center size-12 border text-xs font-semibold transition"
              activePageClassName="border-black/30 bg-white/90 text-black shadow-sm"
              inactivePageClassName="border-black/15 bg-white/50"
              ellipsisClassName="text-xs"
            />
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}
