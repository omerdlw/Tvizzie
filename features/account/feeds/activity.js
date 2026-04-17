'use client';

import { useCallback, useMemo } from 'react';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { collectActivitySubjectOptions, hasActiveActivityFilters } from '@/features/account/filtering';
import { AccountActivityFilterBar } from '@/features/account/shared/content-filters';
import AccountPagination from '@/features/account/shared/pagination';
import ReviewCard from '@/features/reviews/parts/review-card';
import RatingStars from '@/features/reviews/parts/rating-stars';
import AccountSectionLayout from '../shared/section-wrapper';

const ACTIVITY_ITEMS_PER_PAGE = 36;
const STATE_MESSAGE_CLASS = 'bg-primary rounded-[10px] text-black/50 border border-black/5 p-3';

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
        className={part.kind === 'actor' || part.kind === 'account' ? 'font-semibold transition' : 'transition'}
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

function ActivityItem({ index = 0, isFirst = false, item }) {
  const reduceMotion = useReducedMotion();
  const createdLabel = formatActivityTime(item?.occurredAt || item?.updatedAt || item?.createdAt);

  return (
    <motion.article
      className={`border-b border-black/10 ${isFirst ? 'pt-0 pb-5' : 'py-5'} last:border-b-0`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
      transition={{
        delay: reduceMotion ? 0 : index < 6 ? index * 0.016 : 0,
        duration: reduceMotion ? 0.16 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 text-[1.02rem] leading-7">
          <ActivityLine item={item} />
        </div>

        {createdLabel ? <div className="shrink-0 text-sm font-medium sm:pt-0.5">{createdLabel}</div> : null}
      </div>

      {item?.renderKind === 'text_with_review' && item?.reviewCard ? (
        <div className="mt-3">
          <ReviewCard className="border-b-0 py-0" displayVariant="activity" review={item.reviewCard} />
        </div>
      ) : null}
    </motion.article>
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
    content = <div className={STATE_MESSAGE_CLASS}>Loading activity...</div>;
  } else if (listedActivityCount === 0 && !isLoading && !loadError) {
    content = (
      <div className={STATE_MESSAGE_CLASS}>{hasFilters ? 'No activity matches the current filters' : emptyMessage}</div>
    );
  } else if (listedActivityCount === 0 && !isLoading && loadError) {
    content = <div className={STATE_MESSAGE_CLASS}>{loadError}</div>;
  } else {
    content = (
      <div>
        {visibleItems.map((item, index) => (
          <ActivityItem key={getActivityItemKey(item, index)} index={index} isFirst={index === 0} item={item} />
        ))}
      </div>
    );
  }

  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {shouldShowFilterBar ? (
        <AccountActivityFilterBar
          filters={filters}
          subjectOptions={subjectOptions}
          onChange={updateFilters}
          onReset={hasFilters ? resetFilters : null}
        />
      ) : null}

      {content}

      {shouldShowPagination ? (
        <div>
          <AccountPagination
            className="w-full"
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
