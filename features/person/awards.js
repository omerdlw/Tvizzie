'use client';

import { useEffect, useMemo, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { cn } from '@/core/utils';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { PersonAwardsSkeleton } from '@/ui/skeletons/views/person';

import MediaThumb from './media-thumb';

function isWinType(type = '') {
  const normalizedType = String(type).trim().toLowerCase();

  return normalizedType.includes('win') || normalizedType.includes('winner') || normalizedType.includes('kazan');
}

function sortAwardsByYear(left, right) {
  if (left[0] === '—') {
    return 1;
  }

  if (right[0] === '—') {
    return -1;
  }

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
        poster: category.poster || null,
      }))
    )
  );

  const grouped = awards.reduce((accumulator, award) => {
    if (!accumulator[award.year]) {
      accumulator[award.year] = [];
    }

    accumulator[award.year].push(award);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(sortAwardsByYear)
    .map(([year, entries]) => [
      year,
      entries.sort((left, right) => {
        const rankDifference = Number(!isWinType(left.type)) - Number(!isWinType(right.type));

        if (rankDifference !== 0) {
          return rankDifference;
        }

        return left.organization.localeCompare(right.organization) || left.category.localeCompare(right.category);
      }),
    ]);
}

function AwardsState({ message, variant = 'empty' }) {
  return (
    <div className="flex w-full justify-center py-20">
      <p className={cn('text-sm font-medium text-black/70', variant === 'error' && 'text-error')}>{message}</p>
    </div>
  );
}

export default function PersonAwards({ personId }) {
  const reduceMotion = useReducedMotion();
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

        if (!isCurrent) {
          return;
        }

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

  const awardsTimeline = useMemo(() => buildAwardsTimeline(awardsData?.organizations || []), [awardsData]);

  if (status === 'loading') {
    return <PersonAwardsSkeleton className="mt-10" />;
  }

  if (status === 'error') {
    return <AwardsState message={errorMessage} variant="error" />;
  }

  if (!awardsTimeline.length) {
    return <AwardsState message="No awards information found" />;
  }

  const stats = awardsData?.stats;

  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Awards</h2>
        {(stats?.totalWins > 0 || stats?.totalNominations > 0) && (
          <div className="text-xs font-semibold text-black/60 sm:text-sm">
            {stats.totalNominations} Nominations
            {stats.totalWins > 0 && `, ${stats.totalWins} Wins`}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col">
        {awardsTimeline.map(([year, entries], yearIndex) => (
          <motion.div
            key={year}
            className="mt-4 first:mt-0"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : yearIndex * 0.045,
              duration: reduceMotion ? 0.16 : 0.36,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="mb-2 flex items-center gap-2 sm:gap-3">
              <span className="w-9 shrink-0 text-right text-xs font-semibold text-black/70 sm:w-12 sm:text-[13px]">
                {year}
              </span>
              <div className="h-px flex-1 bg-black/15" />
            </div>

            <div className="ml-0 flex flex-col sm:ml-16">
              {entries.map((entry, entryIndex) => {
                const isInteractive = Boolean(entry.projectId);
                const title = entry.project || entry.category;
                const detail = entry.project
                  ? `${entry.organization} / ${entry.type} · ${entry.category}`
                  : `${entry.organization} / ${entry.type}`;

                const rowClassName = cn(
                  'group flex items-end gap-2.5 border border-transparent p-1.5 transition-colors sm:gap-3',
                  isInteractive ? 'hover:border-black/10 hover:bg-primary/35' : 'cursor-default'
                );

                const content = (
                  <>
                    <MediaThumb poster={entry.poster} alt={title} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold tracking-tight text-black sm:text-lg">
                          {title}
                        </span>
                      </div>

                      <span className="truncate text-[11px] text-black/60 sm:text-sm">{detail}</span>
                    </div>
                  </>
                );

                if (isInteractive) {
                  return (
                    <motion.div
                      key={entry.key}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: reduceMotion ? 0 : yearIndex * 0.045 + entryIndex * 0.02,
                        duration: reduceMotion ? 0.16 : 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Link href={`/movie/${entry.projectId}`} className={rowClassName}>
                        {content}
                      </Link>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={entry.key}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: reduceMotion ? 0 : yearIndex * 0.045 + entryIndex * 0.02,
                      duration: reduceMotion ? 0.16 : 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={rowClassName}
                  >
                    {content}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
