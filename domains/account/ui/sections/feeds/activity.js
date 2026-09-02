'use client';

import Link from 'next/link';
import { normalizeFeedbackText } from '@/shared';
import {
  collectActivitySubjectOptions,
  hasActiveActivityFilters,
} from '@/domains/account/ui/filters/filtering';
import { AccountActivityFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import ReviewCard from '@/domains/reviews/ui/components/review-card';
import RatingStars from '@/domains/reviews/ui/components/rating-stars';
import AccountSectionLayout, {
  AccountInlineSectionState,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import { ActivityItemsSkeletonList, FilterBarSkeleton } from '@/domains/account/ui/skeletons';
const ACTIVITY_ITEMS_PER_PAGE = 36;

function formatActivityTime(value) {
  if (!value) return null;
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return null;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours < 24 ? `${diffHours}h` : `${Math.floor(diffHours / 24)}d`;
}

export default function AccountActivityFeed({
  currentPage = 1,
  emptyMessage = 'No activity yet',
  filters = {
    sort: 'newest',
    subject: 'all',
  },
  icon = 'solar:bolt-bold',
  isInitialSection = false,
  isLoading = false,
  items = [],
  loadError = null,
  onFiltersChange,
  onPageChange,
  revealDelay = 0,
  showHeader = true,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Recent Activity',
  titleHref = null,
  totalCount = null,
}) {
  const visibleItems = Array.isArray(items) ? items : [];
  const listedActivityCount = Number.isFinite(Number(totalCount))
    ? Math.max(0, Math.floor(Number(totalCount)))
    : visibleItems.length;
  const hasFilters = hasActiveActivityFilters(filters);
  const totalPages = Math.max(1, Math.ceil(listedActivityCount / ACTIVITY_ITEMS_PER_PAGE));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const resolvedSummaryLabel = hasFilters
    ? `${Math.min(listedActivityCount, (activePage - 1) * ACTIVITY_ITEMS_PER_PAGE + visibleItems.length)} of ${listedActivityCount} shown`
    : (summaryLabel ?? `${listedActivityCount} Events`);
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      revealDelay={revealDelay}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
      toolbar={
        onFiltersChange && isLoading && visibleItems.length === 0 ? (
          <FilterBarSkeleton />
        ) : onFiltersChange && (listedActivityCount > 0 || hasFilters) ? (
          <AccountActivityFilterBar
            filters={filters}
            subjectOptions={collectActivitySubjectOptions()}
            onChange={(updates) =>
              onFiltersChange({
                ...filters,
                ...updates,
              })
            }
            onReset={
              hasFilters
                ? () =>
                    onFiltersChange({
                      sort: 'newest',
                      subject: 'all',
                    })
                : null
            }
          />
        ) : null
      }
    >
      {isLoading && visibleItems.length === 0 ? (
        <ActivityItemsSkeletonList count={6} />
      ) : loadError ? (
        <AccountInlineSectionState>{normalizeFeedbackText(loadError)}</AccountInlineSectionState>
      ) : listedActivityCount === 0 ? (
        <AccountInlineSectionState>
          {hasFilters ? 'No activity matches the current filters' : emptyMessage}
        </AccountInlineSectionState>
      ) : (
        <ActivityList baseDelay={0} isInitialSection={isInitialSection} items={visibleItems} />
      )}

      {listedActivityCount > ACTIVITY_ITEMS_PER_PAGE && onPageChange && (
        <div className="mt-8 flex justify-center">
          <AccountPagination
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </div>
      )}
    </AccountSectionLayout>
  );
}

function ActivityList({ baseDelay, isInitialSection = false, items }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <ActivityRow
          key={item?.dedupeKey || item?.id || `activity-${index}`}
          baseDelay={baseDelay}
          index={index}
          isInitialSection={isInitialSection}
          item={item}
        />
      ))}
    </div>
  );
}

function ActivityRow({ baseDelay, index = 0, isInitialSection = false, item }) {
  const createdLabel = formatActivityTime(item?.occurredAt || item?.updatedAt || item?.createdAt);

  const hasReview = item?.renderKind === 'text_with_review' && item?.reviewCard;

  return (
    <div className="flex flex-col gap-3 rounded-2xl ring-1 ring-inset ring-white/5 bg-white/5 p-4 transition-all duration-200 hover:ring-white/10 hover:bg-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-white/70">
          {(item?.line?.parts || []).map((part, partIndex) => (
            <LinePart key={partIndex} part={part} />
          ))}
        </div>
        {createdLabel && (
          <span className="shrink-0 text-xs font-semibold text-white/50">
            {createdLabel}
          </span>
        )}
      </div>

      {hasReview ? (
        <div className="pt-2 border-t border-white/5">
          <ReviewCard
            displayVariant="activity"
            removeBottomPadding
            removeTopPadding
            review={item.reviewCard}
          />
        </div>
      ) : null}
    </div>
  );
}

function LinePart({ part }) {
  if (part?.kind === 'rating' && Number.isFinite(Number(part?.rating)))
    return <RatingStars rating={Number(part.rating)} />;
  if (!part?.text) return null;
  const isActor = part.kind === 'actor' || part.kind === 'account';
  const isMedia = part.kind === 'media' || part.kind === 'item' || part.kind === 'list';
  if (part.href) {
    return (
      <Link
        href={part.href}
        className={
          isActor
            ? 'font-semibold text-white hover:underline'
            : isMedia
              ? 'font-semibold text-white hover:underline'
              : 'text-white/70 hover:text-white transition-colors'
        }
      >
        {part.text}
      </Link>
    );
  }
  if (isActor) return <span className="font-semibold text-white">{part.text}</span>;
  if (isMedia) return <span className="font-semibold text-white">{part.text}</span>;
  return <span className="text-white/70">{part.text}</span>;
}
