'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { normalizeFeedbackText } from '@/core/utils';
import { collectActivitySubjectOptions, hasActiveActivityFilters } from '@/features/account/filtering';
import { AccountActivityFilterBar } from '@/features/account/filters/content-filter-primitives';
import AccountPagination from '@/features/account/components/pagination';
import ReviewCard from '@/features/reviews/parts/review-card';
import RatingStars from '@/features/reviews/parts/rating-stars';
import AccountSectionLayout from '@/features/account/components/section-wrapper';

const ACTIVITY_ITEMS_PER_PAGE = 36;
const STATE_MESSAGE_CLASS = 'bg-primary rounded-[10px] text-black/50 border border-black/5 p-3';

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

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

// --------------------------------------------------
// COMPONENTS
// --------------------------------------------------

export default function AccountActivityFeed({
  currentPage = 1, emptyMessage = 'No activity yet', filters = { sort: 'newest', subject: 'all' },
  icon = 'solar:bolt-bold', isLoading = false, items = [], loadError = null,
  onFiltersChange, onPageChange, showHeader = true, showSeeMore = false,
  summaryLabel = null, title = 'Recent Activity', titleHref = null, totalCount = null,
}) {
  const visibleItems = Array.isArray(items) ? items : [];
  const listedActivityCount = Number.isFinite(Number(totalCount)) ? Math.max(0, Math.floor(Number(totalCount))) : visibleItems.length;

  const hasFilters = hasActiveActivityFilters(filters);
  const totalPages = Math.max(1, Math.ceil(listedActivityCount / ACTIVITY_ITEMS_PER_PAGE));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const resolvedSummaryLabel = hasFilters
    ? `${Math.min(listedActivityCount, (activePage - 1) * ACTIVITY_ITEMS_PER_PAGE + visibleItems.length)} of ${listedActivityCount} shown`
    : summaryLabel ?? `${listedActivityCount} Events`;

  return (
    <AccountSectionLayout icon={icon} showHeader={showHeader} showSeeMore={showSeeMore} summaryLabel={resolvedSummaryLabel} title={title} titleHref={titleHref}>

      {onFiltersChange && (listedActivityCount > 0 || hasFilters) && (
        <AccountActivityFilterBar
          filters={filters}
          subjectOptions={collectActivitySubjectOptions()}
          onChange={(updates) => onFiltersChange({ ...filters, ...updates })}
          onReset={hasFilters ? () => onFiltersChange({ sort: 'newest', subject: 'all' }) : null}
        />
      )}

      {isLoading && visibleItems.length === 0 ? (
        <div className={STATE_MESSAGE_CLASS}>Loading activity</div>
      ) : loadError ? (
        <div className={STATE_MESSAGE_CLASS}>{normalizeFeedbackText(loadError)}</div>
      ) : listedActivityCount === 0 ? (
        <div className={STATE_MESSAGE_CLASS}>{hasFilters ? 'No activity matches the current filters' : emptyMessage}</div>
      ) : (
        <div>
          {visibleItems.map((item, index) => (
            <ActivityItem key={item?.dedupeKey || item?.id || `activity-${index}`} index={index} isFirst={index === 0} item={item} />
          ))}
        </div>
      )}

      {listedActivityCount > ACTIVITY_ITEMS_PER_PAGE && onPageChange && (
        <AccountPagination className="w-full" currentPage={activePage} onPageChange={onPageChange} totalPages={totalPages} />
      )}
    </AccountSectionLayout>
  );
}

function ActivityItem({ index = 0, isFirst = false, item }) {
  const createdLabel = formatActivityTime(item?.occurredAt || item?.updatedAt || item?.createdAt);

  return (
    <motion.article
      className={`border-b border-black/10 ${isFirst ? 'pt-0 pb-5' : 'py-5'} last:border-b-0`}
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
      transition={{ delay: index < 6 ? index * 0.016 : 0, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0 text-[1.02rem] leading-7">
          {(item?.line?.parts || []).map((part, i) => <LinePart key={i} part={part} />)}
        </div>
        {createdLabel && <div className="shrink-0 text-sm font-medium pt-0.5">{createdLabel}</div>}
      </div>
      {item?.renderKind === 'text_with_review' && item?.reviewCard && (
        <div className="mt-3"><ReviewCard className="border-b-0 py-0" displayVariant="activity" review={item.reviewCard} /></div>
      )}
    </motion.article>
  );
}

function LinePart({ part }) {
  if (part?.kind === 'rating' && Number.isFinite(Number(part?.rating))) return <RatingStars className="translate-y-[-1px]" rating={Number(part.rating)} />;
  if (!part?.text) return null;

  const className = part.kind === 'actor' || part.kind === 'account' ? 'font-semibold transition' : 'transition';
  if (part.href) return <Link href={part.href} className={className}>{part.text}</Link>;
  if (part.kind === 'actor') return <span className="font-semibold">{part.text}</span>;
  return <span>{part.text}</span>;
}
