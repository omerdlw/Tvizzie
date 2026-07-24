'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PersonSurfaceReveal } from '@/features/media/static-route-elements';
import { cn } from '@/core/utils';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { PersonAwardsSkeleton } from '@/ui/skeletons/views/person';
import Icon from '@/ui/icon';
import MediaThumb from './media-thumb';

function isWinType(type = '') {
  const normalizedType = String(type).trim().toLowerCase();
  return (
    normalizedType.includes('win') ||
    normalizedType.includes('winner') ||
    normalizedType.includes('kazan')
  );
}

function sortAwardsByYear(left, right) {
  if (left[0] === '—') return 1;
  if (right[0] === '—') return -1;
  return Number(right[0]) - Number(left[0]);
}

function buildAwardsTimeline(organizations = []) {
  const awards = organizations.flatMap((organization) =>
    (organization.years || []).flatMap((yearGroup) =>
      (yearGroup.categories || []).map((category, index) => ({
        key: `${organization.id}-${yearGroup.year}-${index}-${category.projectId || category.project || category.category}`,
        year: yearGroup.year || '—',
        organization: organization.title,
        type: category.type || 'Nominee',
        category: category.category || 'Award',
        project: category.project || null,
        projectId: category.projectId || null,
        mediaType: category.mediaType === 'tv' ? 'tv' : 'movie',
        poster: category.poster || null,
      })),
    ),
  );
  const grouped = awards.reduce((accumulator, award) => {
    if (!accumulator[award.year]) accumulator[award.year] = [];
    accumulator[award.year].push(award);
    return accumulator;
  }, {});
  return Object.entries(grouped)
    .sort(sortAwardsByYear)
    .map(([year, entries]) => [
      year,
      entries.sort((left, right) => {
        const rankDifference = Number(!isWinType(left.type)) - Number(!isWinType(right.type));
        if (rankDifference !== 0) return rankDifference;
        return (
          left.organization.localeCompare(right.organization) ||
          left.category.localeCompare(right.category)
        );
      }),
    ]);
}

function AwardsState({ message, variant = 'empty' }) {
  return (
    <div className="flex w-full justify-center py-20">
      <p className={cn('text-sm font-medium text-black/70', variant === 'error' && 'text-error')}>
        {message}
      </p>
    </div>
  );
}

function WinBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
      <Icon icon="solar:cup-star-bold" size={10} />
      Win
    </span>
  );
}

function NomineeBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-black/40 uppercase">
      Nom
    </span>
  );
}

export default function PersonAwards({ personId }) {
  const [awardsData, setAwardsData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');
    setErrorMessage(null);
    void (async () => {
      try {
        const response = await TmdbService.getPersonAwards(personId);
        if (!isCurrent) return;
        if (response?.error || !response?.data) {
          setAwardsData(null);
          setErrorMessage('Awards are temporarily unavailable');
          setStatus('error');
          return;
        }
        setAwardsData(response.data);
        setStatus('ready');
      } catch {
        if (isCurrent) {
          setAwardsData(null);
          setErrorMessage('Awards are temporarily unavailable');
          setStatus('error');
        }
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [personId]);

  const awardsTimeline = useMemo(
    () => buildAwardsTimeline(awardsData?.organizations || []),
    [awardsData],
  );

  if (status === 'loading') return <PersonAwardsSkeleton className="mt-10" />;
  if (status === 'error') return <AwardsState message={errorMessage} variant="error" />;
  if (!awardsTimeline.length) return <AwardsState message="No awards information found" />;

  const stats = awardsData?.stats;
  const winsCount = stats?.totalWins ?? 0;
  const nominationsCount = stats?.totalNominations ?? 0;
  const hasWins = winsCount > 0;
  const titleText = hasWins ? `${winsCount} WINS` : `${nominationsCount} Nominations`;
  const subtitleText = hasWins ? `${nominationsCount} Nominations` : null;

  return (
    <PersonSurfaceReveal>
      <section className="w-full">
        <div className="mx-auto max-w-[72ch] text-center">
          <div className="font-zuume mx-auto max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl">
            {titleText}
          </div>
          {subtitleText ? (
            <p className="mt-4 text-sm leading-relaxed text-pretty text-black/70 sm:text-base sm:leading-7">
              {subtitleText}
            </p>
          ) : null}
        </div>

        <div className="relative mt-8">
          <div className="absolute top-[18px] bottom-0 left-20 w-px bg-black/10 sm:left-24" />

          <div className="flex flex-col">
            {awardsTimeline.map(([year, entries], yearIndex) => {
              const isLast = yearIndex === awardsTimeline.length - 1;
              return (
                <div key={year} className="relative flex">
                  <div className="w-20 shrink-0 sm:w-24">
                    <span className="block pt-3 pr-4 text-right text-sm font-bold tracking-wide text-black/40 sm:text-base">
                      {year}
                    </span>
                  </div>

                  <div className="absolute top-[18px] left-20 z-10 size-3 -translate-x-1/2 rounded-full border-2 border-white bg-black shadow-sm sm:left-24" />

                  <div
                    className={`min-w-0 flex-1 pt-[18px] pl-6 sm:pl-8 ${isLast ? 'pb-0' : 'pb-10'}`}
                  >
                    {entries.map((entry) => {
                      const isWin = isWinType(entry.type);
                      const isInteractive = Boolean(entry.projectId);
                      const title = entry.project || entry.category;

                      const content = (
                        <>
                          <MediaThumb
                            poster={entry.poster}
                            alt={title}
                            className="w-16 rounded-[16px] sm:w-20"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="truncate text-base leading-tight font-semibold tracking-tight sm:text-lg">
                                {title}
                              </span>
                              {isWin ? <WinBadge /> : <NomineeBadge />}
                            </div>
                            <span className="truncate text-sm text-black/45">
                              {entry.organization} · {entry.category}
                            </span>
                          </div>
                        </>
                      );

                      if (isInteractive) {
                        return (
                          <Link
                            key={entry.key}
                            href={`/${entry.mediaType}/${entry.projectId}`}
                            className="flex items-center gap-4 rounded-[20px] p-1 transition-colors hover:bg-black/5"
                          >
                            {content}
                          </Link>
                        );
                      }

                      return (
                        <div key={entry.key} className="flex items-center gap-4 rounded-[20px] p-1">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PersonSurfaceReveal>
  );
}
