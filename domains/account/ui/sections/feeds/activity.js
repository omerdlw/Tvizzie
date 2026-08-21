'use client';

import Link from 'next/link';
import { normalizeFeedbackText } from '@/shared/feedback';
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
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <AccountPagination
            className="w-full"
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </div>
      )}
    </AccountSectionLayout>
  );
}

const ACTIVITY_ROW_CLASS = 'border-b border-white/5 py-5 first:pt-0 last:border-b-0 last:pb-0';
const ACTIVITY_LINE_CLASS = 'min-w-0 text-[1.02rem] leading-[1.1]';

function ActivityList({ baseDelay, isInitialSection = false, items }) {
  return (
    <div className="w-full">
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
    <div className={ACTIVITY_ROW_CLASS}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className={ACTIVITY_LINE_CLASS}>
          {(item?.line?.parts || []).map((part, partIndex) => (
            <LinePart key={partIndex} part={part} />
          ))}
        </div>
        {createdLabel && (
          <div className="shrink-0 text-sm leading-[1.1] font-medium">{createdLabel}</div>
        )}
      </div>

      {hasReview ? (
        <ReviewCard
          className="mt-3 border-b-0"
          displayVariant="activity"
          removeBottomPadding
          removeTopPadding
          review={item.reviewCard}
        />
      ) : null}
    </div>
  );
}

function LinePart({ part }) {
  if (part?.kind === 'rating' && Number.isFinite(Number(part?.rating)))
    return <RatingStars className="translate-y-[-1px]" rating={Number(part.rating)} />;
  if (!part?.text) return null;
  const className = part.kind === 'actor' || part.kind === 'account' ? 'font-semibold' : '';
  if (part.href)
    return (
      <Link href={part.href} className={className}>
        {part.text}
      </Link>
    );
  if (part.kind === 'actor') return <span className="font-semibold">{part.text}</span>;
  return <span>{part.text}</span>;
}
