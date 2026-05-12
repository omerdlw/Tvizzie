'use client';

import { useEffect, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import MediaCard from '@/ui/media/media-card';
import { usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AccountPagination from './pagination';
import { buildAccountCollectionPageHref, formatPaginationSummaryLabel } from '../collections/item-utils';
import AccountInlineSectionState from './section-wrapper';
import AccountSectionLayout from './section-wrapper';
import { AccountMotionItem } from '@/app/(account)/account/motion';
import { ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE, buildAccountMediaGridCards } from './media-grid-utils';

export { default as ProfileMediaActions } from './media-actions';

export default function AccountMediaGridPage({
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  items = [],
  onPageChange = null,
  pageBasePath,
  revealIndex = 0,
  renderHeaderAction = null,
  renderOverlay = null,
  showHeader = true,
  toolbar = null,
  title,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && Number.isFinite(requestedQueryPage) && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;

  const cards = useMemo(() => {
    return buildAccountMediaGridCards(items);
  }, [items, posterPreferenceVersion]);

  const totalPages = cards.length ? Math.ceil(cards.length / ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE) : 0;
  const activePage = totalPages ? Math.min(resolvedCurrentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE;
  const visibleCards = cards.slice(pageStart, pageStart + ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE);
  const paginationSummaryLabel = formatPaginationSummaryLabel({
    pageSize: ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE,
    startIndex: pageStart,
    totalCount: cards.length,
  });

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
      revealIndex={revealIndex}
    >
      {toolbar ? <AccountMotionItem index={0}>{toolbar}</AccountMotionItem> : null}

      {cards.length === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 min-[30rem]:grid-cols-3 min-[40rem]:grid-cols-4 min-[64rem]:grid-cols-6">
            {visibleCards.map((card, index) => (
              <AccountMotionItem key={card.id} index={index + 1}>
                <MediaCard
                  href={card.href}
                  className="w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                  tooltipText={card.tooltipText}
                />
              </AccountMotionItem>
            ))}
          </div>

          {totalPages > 1 ? (
            <AccountMotionItem
              key={`media-grid-pagination-${activePage}-${totalPages}`}
              index={visibleCards.length + 1}
            >
              <AccountPagination
                className="w-full"
                currentPage={activePage}
                onPageChange={canControlPagination ? onPageChange : null}
                totalPages={totalPages}
                getPageHref={canControlPagination ? null : (page) => buildAccountCollectionPageHref(pageBasePath, page)}
              />
            </AccountMotionItem>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}
