'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { TMDB_IMG } from '@/shared';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';
import AccountSectionLayout, {
  AccountInlineSectionState,
} from '@/domains/account/ui/sections/account-section';
import { DiaryLedgerSkeleton } from '@/domains/account/ui/skeletons';

function parseDiaryDay(value) {
  const [year, month, day] = String(value || '')
    .split('-')
    .map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatMonthToken(value) {
  const date = parseDiaryDay(value);
  if (!date) return { month: '—', year: '' };
  return {
    month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase(),
    year: String(date.getUTCFullYear()),
  };
}

function formatDayToken(value) {
  const date = parseDiaryDay(value);
  return date ? String(date.getUTCDate()).padStart(2, '0') : '—';
}

function getEpisodeLabel(entry) {
  if (!entry.seasonNumber) return null;
  const season = `S${entry.seasonNumber}`;
  return entry.episodeTitle ? `${season} — ${entry.episodeTitle}` : season;
}

function getLedgerRows(entries) {
  let activeMonth = null;
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const monthKey = String(entry.watchedOn || '').slice(0, 7);
    const beginsMonth = Boolean(monthKey) && monthKey !== activeMonth;
    activeMonth = monthKey || activeMonth;
    return { beginsMonth, entry, month: formatMonthToken(entry.watchedOn) };
  });
}

function DiaryPoster({ entry }) {
  if (!entry.posterPath) return null;
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-white/10 bg-black">
      <AdaptiveImage
        fill
        src={`${TMDB_IMG}/w185${entry.posterPath}`}
        alt={entry.title || ''}
        sizes="40px"
        className="object-cover"
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

function DiaryTitle({ entry }) {
  const episodeLabel = getEpisodeLabel(entry);
  return (
    <div className="min-w-0">
      <h3 className="truncate text-xs font-semibold text-white sm:text-sm">{entry.title}</h3>
      {episodeLabel ? <p className="truncate text-xs text-white/40">{episodeLabel}</p> : null}
    </div>
  );
}

function MonthMarker({ month }) {
  return (
    <time className="inline-flex items-center gap-1">
      <span>{month.month}</span>
      <span className="text-white/40">{month.year}</span>
    </time>
  );
}

function RatingStars({ value }) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) {
    return (
      <span className="text-white/40" aria-label="No rating">
        —
      </span>
    );
  }

  const clampedRating = Math.min(5, Math.max(0, rating));
  const label = `${Number.isInteger(clampedRating) ? clampedRating : clampedRating.toFixed(1)} out of 5`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-0.5 text-amber-400"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, clampedRating - index));
        return (
          <span key={index} aria-hidden="true">
            {fill >= 0.5 ? (
              <Icon icon="solar:star-bold" size={13} />
            ) : (
              <Icon icon="solar:star-linear" size={13} className="text-white/20" />
            )}
          </span>
        );
      })}
    </span>
  );
}

function RewatchMark({ isRewatch }) {
  if (!isRewatch) return <span className="text-white/20">—</span>;
  return (
    <span title="Rewatch" className="text-white/70">
      <Icon icon="solar:restart-bold" size={14} aria-label="Rewatch" />
    </span>
  );
}

function ReviewMark({ entry }) {
  if (!entry.hasReview) return <span className="text-white/20">—</span>;
  const href =
    entry.entityType && entry.entityId ? `/${entry.entityType}/${entry.entityId}/reviews` : null;
  const content = (
    <Icon
      icon="solar:document-text-bold"
      size={14}
      className="text-white/70 transition-colors hover:text-white"
      aria-label="Review available"
    />
  );
  if (!href) return <span>{content}</span>;
  return (
    <Link href={href} title="Read review" aria-label="Read review">
      {content}
    </Link>
  );
}

function DiaryLedgerDesktop({ rows }) {
  return (
    <div className="hidden w-full overflow-x-auto rounded-2xl ring-1 ring-inset ring-white/5 bg-white/5 sm:block">
      <table className="w-full text-left text-xs text-white/70">
        <thead className="border-b border-white/5 text-xs font-semibold text-white/40 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Month
            </th>
            <th scope="col" className="px-4 py-3">
              Day
            </th>
            <th scope="col" className="px-4 py-3">
              Title
            </th>
            <th scope="col" className="px-4 py-3">
              Rating
            </th>
            <th scope="col" className="px-4 py-3 text-center">
              Rewatch
            </th>
            <th scope="col" className="px-4 py-3 text-center">
              Review
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(({ beginsMonth, entry, month }) => (
            <tr key={entry.id} className="transition-colors hover:bg-white/10">
              <td className="px-4 py-3 font-semibold text-white">
                {beginsMonth ? <MonthMarker month={month} /> : null}
              </td>
              <td className="px-4 py-3 font-mono text-white/40">
                <time dateTime={entry.watchedOn}>{formatDayToken(entry.watchedOn)}</time>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <DiaryPoster entry={entry} />
                  <DiaryTitle entry={entry} />
                </div>
              </td>
              <td className="px-4 py-3">
                <RatingStars value={entry.reviewRating} />
              </td>
              <td className="px-4 py-3 text-center">
                <RewatchMark isRewatch={entry.isRewatch} />
              </td>
              <td className="px-4 py-3 text-center">
                <ReviewMark entry={entry} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiaryLedgerMobile({ rows }) {
  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {rows.map(({ beginsMonth, entry, month }) => (
        <article
          key={entry.id}
          className="flex flex-col gap-2 rounded-2xl ring-1 ring-inset ring-white/5 bg-white/5 p-3.5"
        >
          {beginsMonth ? (
            <div className="border-b border-white/5 pb-1 text-xs font-semibold text-white">
              <MonthMarker month={month} />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <time dateTime={entry.watchedOn} className="shrink-0 font-mono text-xs text-white/40">
                {formatDayToken(entry.watchedOn)}
              </time>
              <DiaryPoster entry={entry} />
              <DiaryTitle entry={entry} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RatingStars value={entry.reviewRating} />
              <RewatchMark isRewatch={entry.isRewatch} />
              <ReviewMark entry={entry} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function DiaryLedger({ entries }) {
  const rows = useMemo(() => getLedgerRows(entries), [entries]);
  if (rows.length === 0) {
    return (
      <AccountInlineSectionState>No diary entries for this month yet.</AccountInlineSectionState>
    );
  }
  return (
    <>
      <DiaryLedgerDesktop rows={rows} />
      <DiaryLedgerMobile rows={rows} />
    </>
  );
}

export default function AccountDiary({ entries = [], error = null, isLoading = false }) {
  return (
    <AccountSectionLayout
      icon="solar:book-bookmark-bold"
      title="Diary"
      contentPaddingClassName=""
      showHeader={false}
    >
      {isLoading ? (
        <DiaryLedgerSkeleton />
      ) : error ? (
        <AccountInlineSectionState>
          We couldn&apos;t load this month. Choose another month or try again shortly.
        </AccountInlineSectionState>
      ) : (
        <DiaryLedger entries={entries} />
      )}
    </AccountSectionLayout>
  );
}
