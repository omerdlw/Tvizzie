'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import Link from 'next/link';

import { cn } from '@/core/utils';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { PersonAwardsSkeleton } from '@/features/person/skeletons';
import { getPersonFeatureItemMotion, PERSON_FEATURE_SECTION_MOTION } from '@/features/person/motion';

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
      <p className={cn('text-sm font-medium text-white/70', variant === 'error' && 'text-error')}>{message}</p>
    </div>
  );
}

function AwardStatus({ type }) {
  const isWinner = isWinType(type);

  return (
    <span className={cn('shrink-0', isWinner ? 'text-warning font-bold' : 'font-semibold text-white/50')}>{type}</span>
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
    return <PersonAwardsSkeleton />;
  }

  if (status === 'error') {
    return <AwardsState message={errorMessage} variant="error" />;
  }

  if (!awardsTimeline.length) {
    return <AwardsState message="No awards information found" />;
  }

  const stats = awardsData?.stats;

  return <PersonAwardsSurface awardsTimeline={awardsTimeline} stats={stats} />;
}

function PersonAwardsSurface({ awardsTimeline, stats }) {
  return (
    <motion.section className="flex w-full flex-col gap-3" {...PERSON_FEATURE_SECTION_MOTION}>
      <motion.div className="flex items-end justify-between gap-3" {...getPersonFeatureItemMotion(0)}>
        <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">Awards</h2>
        {(stats?.totalWins > 0 || stats?.totalNominations > 0) && (
          <div className="text-xs font-semibold text-white/50 sm:text-sm">
            {stats.totalNominations} Nominations
            {stats.totalWins > 0 && `, ${stats.totalWins} Wins`}
          </div>
        )}
      </motion.div>

      <div className="flex w-full flex-col">
        {awardsTimeline.map(([year, entries], index) => (
          <motion.div key={year} {...getPersonFeatureItemMotion(index + 1)}>
            <AwardYearGroup year={year} entries={entries} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function AwardYearGroup({ year, entries }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 flex items-center gap-2 sm:gap-3">
        <span className="w-9 shrink-0 text-right text-xs font-semibold text-white/70 sm:w-12 sm:text-sm">{year}</span>
        <div className="h-px flex-1 bg-white/20" />
      </div>

      <div className="flex flex-col sm:ml-16">
        {entries.map((entry) => (
          <AwardEntry key={entry.key} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function AwardEntry({ entry }) {
  const isInteractive = Boolean(entry.projectId);
  const title = entry.project || entry.category;
  const rowClassName = cn(
    'group flex items-center gap-3 border-transparent p-1',
    isInteractive && 'tvz-soft-hover-row',
    isInteractive ? 'hover:bg-white/10' : 'cursor-default'
  );
  const content = <AwardEntryContent entry={entry} title={title} />;

  return isInteractive ? (
    <Link href={`/movie/${entry.projectId}`} className={rowClassName}>
      {content}
    </Link>
  ) : (
    <div className={rowClassName}>{content}</div>
  );
}

function AwardEntryContent({ entry, title }) {
  return (
    <>
      <MediaThumb poster={entry.poster} alt={title} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold tracking-tight sm:text-lg">{title}</span>
        </div>

        <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-xs leading-snug text-white/50 sm:text-sm">
          <span className="truncate">{entry.organization}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <AwardStatus type={entry.type} />
            {entry.project ? (
              <span className="min-w-0 flex-1 truncate text-white/50 sm:line-clamp-1">{entry.category}</span>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
