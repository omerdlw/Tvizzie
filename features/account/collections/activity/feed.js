'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';

import { cn, normalizeFeedbackText } from '@/core/utils';
import AccountActivityFilterBar from '@/features/account/filters/activity/bar';
import { collectActivitySubjectOptions, hasActiveActivityFilters } from '@/features/account/filters/activity/query';
import AccountPagination from '@/features/account/components/pagination';
import RatingStars from '@/features/reviews/components/rating-stars';
import { ReviewVisual, SpoilerNotice } from '@/features/reviews/components/review-card-controls';
import { getReviewPosterSrc, resolveSubjectHref } from '@/features/reviews/components/review-card-utils';
import AccountSectionLayout, { AccountInlineSectionState } from '../../components/section-wrapper';
import { AccountMotionItem } from '@/app/(account)/account/motion';

const ACTIVITY_ITEMS_PER_PAGE = 36;

function formatActivityTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));

  if (diffMinutes < 1) {
    return 'now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getActivityItemKey(item, index) {
  return `${item?.dedupeKey || item?.id || 'activity'}-${index}`;
}

function renderLinePart(part, index) {
  if (part?.kind === 'rating' && Number.isFinite(Number(part?.rating))) {
    return <RatingStars key={`${part.kind}-${index}`} className="translate-y-[-1px]" rating={Number(part.rating)} />;
  }

  if (!part?.text) {
    return null;
  }

  if (part.href) {
    return (
      <Link
        key={`${part.kind || 'link'}-${index}`}
        href={part.href}
        className={part.kind === 'actor' || part.kind === 'account' ? 'font-semibold' : ''}
      >
        {part.text}
      </Link>
    );
  }

  if (part.kind === 'actor') {
    return (
      <span key={`${part.kind}-${index}`} className="font-semibold">
        {part.text}
      </span>
    );
  }

  return <span key={`${part.kind || 'text'}-${index}`}>{part.text}</span>;
}

function ActivityLine({ item }) {
  const parts = Array.isArray(item?.line?.parts) ? item.line.parts : [];

  return <>{parts.map((part, index) => renderLinePart(part, index))}</>;
}

function ActivityReviewPreview({ review }) {
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);
  const subjectHref = resolveSubjectHref(review, true);
  const posterSrc = getReviewPosterSrc(review);
  const hasRating = Number.isFinite(Number(review?.rating));
  const hasText = Boolean(review?.content?.trim());
  const isSpoilerHidden = Boolean(review?.isSpoiler) && !isSpoilerVisible;
  const title = review?.subjectTitle || 'Untitled';

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <div className="hidden sm:block">
        {subjectHref ? (
          <Link href={subjectHref} className="block">
            <ReviewVisual
              alt={title}
              isAccountVariant
              isListSubject={review?.subjectType === 'list'}
              previewItems={review?.subjectPreviewItems}
              src={posterSrc}
            />
          </Link>
        ) : (
          <ReviewVisual
            alt={title}
            isAccountVariant
            isListSubject={review?.subjectType === 'list'}
            previewItems={review?.subjectPreviewItems}
            src={posterSrc}
          />
        )}
      </div>

      <div className="min-w-0 space-y-2">
        {hasRating ? <RatingStars rating={Number(review.rating)} /> : null}

        {hasText ? (
          isSpoilerHidden ? (
            <SpoilerNotice compact onReveal={() => setIsSpoilerVisible(true)} />
          ) : (
            <p
              className="min-w-0 text-sm leading-6 text-white/70 [overflow-wrap:anywhere] break-words"
              style={{
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3,
              }}
            >
              {review.content}
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const createdLabel = formatActivityTime(item?.occurredAt || item?.updatedAt || item?.createdAt);

  return (
    <div className="transition-[filter,color,background-color,border-color,opacity] [transition-duration:240ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] hover:brightness-105 focus-within:brightness-105">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 text-[1.02rem] leading-7">
          <ActivityLine item={item} />
        </div>

        {createdLabel ? <div className="shrink-0 text-sm font-medium sm:pt-0.5">{createdLabel}</div> : null}
      </div>

      {item?.renderKind === 'text_with_review' && item?.reviewCard ? (
        <ActivityReviewPreview review={item.reviewCard} />
      ) : null}
    </div>
  );
}

export default function AccountActivityFeed({
  currentPage = 1,
  emptyMessage = 'No activity yet',
  filters = { sort: 'newest', subject: 'all' },
  icon = 'solar:bolt-bold',
  isLoading = false,
  items = [],
  loadError = null,
  onFiltersChange = null,
  onPageChange = null,
  revealIndex = 0,
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
  const subjectOptions = useMemo(() => collectActivitySubjectOptions(), []);
  const hasFilters = hasActiveActivityFilters(filters);
  const totalPages = listedActivityCount > 0 ? Math.ceil(listedActivityCount / ACTIVITY_ITEMS_PER_PAGE) : 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (activePage - 1) * ACTIVITY_ITEMS_PER_PAGE;
  const hasVisibleItems = visibleItems.length > 0;
  const totalVisibleItems = visibleItems.length;
  const shouldShowFilterBar = typeof onFiltersChange === 'function' && (listedActivityCount > 0 || hasFilters);
  const shouldShowPagination = listedActivityCount > ACTIVITY_ITEMS_PER_PAGE && typeof onPageChange === 'function';
  const resolvedSummaryLabel = useMemo(() => {
    if (!hasFilters) {
      return summaryLabel === null ? `${listedActivityCount} Events` : summaryLabel;
    }

    const shownCount = Math.min(listedActivityCount, pageStart + visibleItems.length);
    return `${shownCount} of ${listedActivityCount} shown`;
  }, [hasFilters, listedActivityCount, pageStart, summaryLabel, visibleItems.length]);

  const updateFilters = useCallback(
    (updates = {}) => {
      onFiltersChange?.({
        ...filters,
        ...updates,
      });
    },
    [filters, onFiltersChange]
  );

  const resetFilters = useCallback(() => {
    onFiltersChange?.({
      sort: 'newest',
      subject: 'all',
    });
  }, [onFiltersChange]);

  let content = null;

  if (!hasVisibleItems && isLoading) {
    content = <AccountInlineSectionState>Loading activity</AccountInlineSectionState>;
  } else if (listedActivityCount === 0 && !isLoading && !loadError) {
    content = (
      <AccountInlineSectionState>
        {hasFilters ? 'No activity matches the current filters' : emptyMessage}
      </AccountInlineSectionState>
    );
  } else if (listedActivityCount === 0 && !isLoading && loadError) {
    content = <AccountInlineSectionState>{normalizeFeedbackText(loadError)}</AccountInlineSectionState>;
  } else {
    content = (
      <div>
        {visibleItems.map((item, index) => (
          <AccountMotionItem
            key={getActivityItemKey(item, index)}
            as="article"
            className={cn(
              'account-detail-full-width-item border-b border-white/10 last:border-b-0',
              index === 0 && !shouldShowFilterBar
                ? index === totalVisibleItems - 1
                  ? 'px-4 pb-0 pt-0'
                  : 'px-4 pb-4 pt-0'
                : index === totalVisibleItems - 1
                  ? 'px-4 pb-0 pt-4'
                  : 'p-4'
            )}
            index={index}
          >
            <ActivityItem item={item} />
          </AccountMotionItem>
        ))}
      </div>
    );
  }

  return (
    <AccountSectionLayout
      headerToolbar={
        shouldShowFilterBar ? (
          <AccountActivityFilterBar
            filters={filters}
            subjectOptions={subjectOptions}
            onChange={updateFilters}
            onReset={hasFilters ? resetFilters : null}
          />
        ) : null
      }
      icon={icon}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
      contentClassName="gap-0"
      revealIndex={revealIndex}
    >
      {content}
      {shouldShowPagination ? (
        <AccountMotionItem index={visibleItems.length + 1}>
          <AccountPagination
            className="w-full"
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </AccountMotionItem>
      ) : null}
    </AccountSectionLayout>
  );
}
