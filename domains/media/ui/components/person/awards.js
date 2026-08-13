'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/ui/primitives/icon';
import MediaThumb from './media-thumb';
import { getPersonAwardsServer } from '@/domains/media/api/person-awards.server';
import { MediaRouteReveal } from '@/app/(media)/motion';

function buildTimeline(organizations = []) {
  return (organizations || [])
    .flatMap((organization) =>
      (organization?.years || []).flatMap((yearObj) =>
        (yearObj?.categories || []).map((award) => ({
          category: award.category,
          key: `${organization.id}-${yearObj.year}-${award.key}`,
          mediaType: award.mediaType,
          organization: organization.title,
          organizationId: organization.id,
          poster: award.poster,
          project: award.project,
          projectId: award.projectId,
          type: award.type,
          year: yearObj.year || '—',
        })),
      ),
    )
    .sort(
      (left, right) =>
        right.year.localeCompare(left.year) || left.category.localeCompare(right.category),
    );
}

function usePersonAwards({ personId, awardsPromise }) {
  const initialAwardsData = awardsPromise ? use(awardsPromise) : null;
  const [awardsData, setAwardsData] = useState(initialAwardsData);
  const [status, setStatus] = useState(initialAwardsData ? 'ready' : 'loading');

  useEffect(() => {
    if (initialAwardsData) {
      setAwardsData(initialAwardsData);
      setStatus('ready');
      return;
    }

    if (!personId) return;

    let isCurrent = true;
    setStatus('loading');

    void getPersonAwardsServer({ personId }).then((response) => {
      if (!isCurrent) return;
      if (!response?.success) {
        setAwardsData(null);
        setStatus('error');
        return;
      }
      setAwardsData(response.data);
      setStatus('ready');
    });

    return () => {
      isCurrent = false;
    };
  }, [personId, initialAwardsData]);

  const allItems = useMemo(() => buildTimeline(awardsData?.organizations), [awardsData]);

  const organizations = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => {
      if (item.organizationId && item.organization) {
        map.set(item.organizationId, item.organization);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [allItems]);

  const wins = awardsData?.stats?.totalWins || allItems.filter((i) => i.type === 'Win').length;
  const nominations =
    awardsData?.stats?.totalNominations || allItems.filter((i) => i.type === 'Nominee').length;
  const academyWins = allItems.filter(
    (i) => i.type === 'Win' && /academy|oscar/i.test(i.organization),
  ).length;

  return {
    academyWins,
    allItems,
    nominations,
    organizations,
    status,
    wins,
  };
}

function AwardStatCard({ icon, index, label, value, variant = 'base' }) {
  const variantStyles = {
    win: {
      border: 'border-warning/50',
      bg: 'bg-yellow-600/50',
      iconText: 'text-warning',
      valueText: 'text-warning',
    },
    base: {
      border: 'border-black/10',
      bg: 'bg-white/50',
      iconText: 'text-black/70',
      valueText: 'text-black',
    },
  }[variant];

  return (
    <MediaRouteReveal className="flex flex-1" deferred itemIndex={index} stage="person.awards.stat">
      <div
        className={`flex min-w-[110px] flex-1 flex-col items-center justify-center  border ${variantStyles.border} ${variantStyles.bg} p-4 text-center backdrop-blur-sm sm:p-5`}
      >
        <div className={`flex items-center gap-1.5 ${variantStyles.iconText}`}>
          <Icon icon={icon} size={20} />
          <span className="text-xs font-bold tracking-wider uppercase">{label}</span>
        </div>
        <span
          className={`font-zuume mt-1 text-5xl leading-none font-bold sm:text-6xl ${variantStyles.valueText}`}
        >
          {value}
        </span>
      </div>
    </MediaRouteReveal>
  );
}

function AwardFilterPill({
  label,
  count,
  isActive,
  onClick,
  activeColorClass = 'bg-black text-white',
  index,
}) {
  return (
    <MediaRouteReveal
      className="inline-flex"
      deferred
      interaction="control"
      interactive
      itemIndex={index}
      stage="person.awards.filters"
    >
      <button
        type="button"
        onClick={onClick}
        className={`max-w-[200px] truncate  px-3.5 py-1.5 text-xs font-semibold ${
          isActive ? `${activeColorClass}` : 'bg-black/5 text-black/70 hover:bg-black/10'
        }`}
      >
        {label} {count !== undefined ? `(${count})` : ''}
      </button>
    </MediaRouteReveal>
  );
}

function AwardCard({ award, index }) {
  const isWin = award.type === 'Win';
  const mediaType = award.mediaType === 'tv' ? 'tv' : 'movie';
  const hasProjectLink = Boolean(award.projectId);

  const cardContent = (
    <div
      className={`group relative flex items-center gap-2  border p-1 sm:gap-4 sm:p-2 ${
        isWin
          ? 'hover:bg-primary border border-yellow-500 bg-white/50'
          : 'hover:bg-primary border-black/10 bg-white/50'
      } transition-[background-color,border-color,box-shadow] duration-300 ease-out`}
    >
      {award.poster || award.project ? (
        <MediaThumb
          poster={award.poster}
          alt={award.project || 'Project'}
          className="h-auto w-14 shrink-0  sm:w-16"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-black/40 sm:text-sm">{award.year}</span>
          {isWin ? (
            <span className="inline-flex items-center gap-1  bg-yellow-500 px-2 py-0.5 text-[11px] font-extrabold text-white uppercase">
              <Icon icon="solar:cup-bold" size={12} />
              Win
            </span>
          ) : (
            <span className=" bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-black/70 uppercase">
              Nominee
            </span>
          )}
        </div>
        <h3 className="truncate text-sm font-semibold text-black sm:text-base">{award.category}</h3>
        <p className="truncate text-xs text-black/60 sm:text-sm">
          {[award.organization, award.project].filter(Boolean).join(' · ')}
        </p>
      </div>
      {hasProjectLink && (
        <div className="shrink-0 pr-1 opacity-0 group-hover:opacity-100">
          <Icon icon="solar:alt-arrow-right-bold" size={18} className="text-black/40" />
        </div>
      )}
    </div>
  );

  const resolvedCard = hasProjectLink ? (
    <Link href={`/${mediaType}/${award.projectId}`} className="block">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );

  return (
    <MediaRouteReveal deferred interactive itemIndex={index} stage="person.awards.item">
      {resolvedCard}
    </MediaRouteReveal>
  );
}

function AwardsMessage({ children }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-14 items-center justify-center  bg-black/5 text-black/40">
        <Icon icon="solar:cup-star-linear" size={32} />
      </div>
      <p className="mt-4 text-sm font-medium text-black/60">{children}</p>
    </div>
  );
}

export default function PersonAwards({ personId, awardsPromise }) {
  const { academyWins, allItems, nominations, organizations, status, wins } = usePersonAwards({
    awardsPromise,
    personId,
  });
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    if (activeFilter === 'wins') return allItems.filter((item) => item.type === 'Win');
    return allItems.filter((item) => item.organizationId === activeFilter);
  }, [allItems, activeFilter]);

  if (status === 'error') {
    return <AwardsMessage>Awards are temporarily unavailable</AwardsMessage>;
  }

  if (status === 'ready' && !allItems.length) {
    return <AwardsMessage>No awards information found</AwardsMessage>;
  }

  return (
    <section className="relative w-full">
      <div className="relative w-full pt-2 pb-6 sm:pt-3 sm:pb-8">
        <div className="mx-auto flex max-w-[72ch] items-center justify-center gap-3 px-6 sm:gap-4">
          <AwardStatCard icon="solar:cup-bold" index={0} label="Wins" value={wins} variant="win" />
          <AwardStatCard
            icon="solar:medal-ribbons-star-bold"
            index={1}
            label="Nominations"
            value={nominations}
            variant="base"
          />
          {academyWins > 0 ? (
            <AwardStatCard
              icon="solar:star-bold"
              index={2}
              label="Oscars"
              value={academyWins}
              variant="win"
            />
          ) : (
            <AwardStatCard
              icon="solar:cup-star-bold"
              index={2}
              label="Organizations"
              value={organizations.length}
              variant="base"
            />
          )}
        </div>

        {/* Full-width hero bottom border line */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </div>

      <MediaRouteReveal className="p-6" stage="person.sections.awards" deferred>
        {/* Filter Pills */}
        <div className="mx-auto flex max-w-[72ch] flex-wrap items-center justify-center gap-2 pt-2 sm:pt-4">
          <AwardFilterPill
            label="All"
            index={0}
            count={allItems.length}
            isActive={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          <AwardFilterPill
            label="Wins"
            index={1}
            count={wins}
            isActive={activeFilter === 'wins'}
            onClick={() => setActiveFilter('wins')}
            activeColorClass="bg-yellow-500 text-white"
          />

          {organizations.map((org, index) => (
            <AwardFilterPill
              key={org.id}
              index={index + 2}
              label={org.title}
              isActive={activeFilter === org.id}
              onClick={() => setActiveFilter(org.id)}
            />
          ))}
        </div>

        {/* Award Items List */}
        <div key={activeFilter} className="mx-auto mt-6 flex max-w-[72ch] flex-col gap-3 sm:mt-8">
          {filteredItems.map((award, index) => (
            <AwardCard key={`${activeFilter}-${award.key}`} award={award} index={index} />
          ))}
        </div>
      </MediaRouteReveal>

      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
