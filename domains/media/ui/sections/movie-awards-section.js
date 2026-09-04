'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { getMediaAwardsServer } from '@/domains/media/server/movie-awards.js';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { cn } from '@/ui/class-names';
import { useDraggableScroll } from '@/shared';

const AWARD_TYPES = Object.freeze({
  WIN: 'Win',
  NOMINEE: 'Nominee',
});

function getOriginalImagePath(path) {
  return path ? path.replace(/\/t\/p\/(?:w\d+[^/]*|h\d+[^/]*)\//i, '/t/p/original/') : null;
}

function getAwardCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildTimeline(organizations = []) {
  return (organizations || [])
    .flatMap((organization) =>
      (organization?.years || []).flatMap((yearObj) =>
        (yearObj?.categories || []).map((award) => ({
          category: award.category,
          ceremony: award.ceremony,
          key: `${organization.id}-${yearObj.year}-${award.key}`,
          mediaType: award.mediaType,
          organization: organization.title,
          organizationId: organization.id,
          organizationLogo: organization.logo,
          poster: award.poster,
          project: award.project,
          projectId: award.projectId,
          recipients: award.recipients || [],
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

function useMediaAwards({ mediaId, mediaType = 'movie', awardsPromise }) {
  const initialAwardsData = awardsPromise ? use(awardsPromise) : null;
  const [awardsData, setAwardsData] = useState(initialAwardsData);
  const [status, setStatus] = useState(initialAwardsData ? 'ready' : 'loading');

  useEffect(() => {
    if (initialAwardsData) {
      setAwardsData(initialAwardsData);
      setStatus('ready');
      return;
    }

    if (!mediaId) return;

    let isCurrent = true;
    setStatus('loading');

    void getMediaAwardsServer({ id: mediaId, mediaType }).then((response) => {
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
  }, [mediaId, mediaType, initialAwardsData]);

  const allItems = useMemo(() => buildTimeline(awardsData?.organizations), [awardsData]);

  const organizations = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => {
      if (item.organizationId && item.organization) {
        map.set(item.organizationId, {
          id: item.organizationId,
          title: item.organization,
          logo: item.organizationLogo,
        });
      }
    });
    return Array.from(map.values());
  }, [allItems]);

  const wins = awardsData?.stats?.totalWins || allItems.filter((i) => i.type === 'Win').length;
  const nominations =
    awardsData?.stats?.totalNominations || allItems.filter((i) => i.type === 'Nominee').length;
  const academyWins = allItems.filter(
    (i) => i.type === 'Win' && /academy|oscar/i.test(i.organization),
  ).length;
  const emmyWins = allItems.filter((i) => i.type === 'Win' && /emmy/i.test(i.organization)).length;

  return {
    academyWins,
    allItems,
    emmyWins,
    nominations,
    organizations,
    status,
    wins,
  };
}

function getPrestigeHonor(items = [], winsCount = 0, majorWinsCount = 0, isTv = false) {
  const oscarWin = items.find((i) => i.type === 'Win' && /academy|oscar/i.test(i.organization));
  if (oscarWin) {
    return {
      title: 'Academy Award Winner',
      subtitle: 'Oscar Recipient',
      icon: 'solar:cup-bold',
    };
  }

  const emmyWin = items.find((i) => i.type === 'Win' && /emmy/i.test(i.organization));
  if (emmyWin) {
    return {
      title: 'Emmy Award Winner',
      subtitle: 'Television Academy Honoree',
      icon: 'solar:star-bold',
    };
  }

  const globeWin = items.find((i) => i.type === 'Win' && /golden globe/i.test(i.organization));
  if (globeWin) {
    return {
      title: 'Golden Globe Winner',
      subtitle: 'HFPA Honoree',
      icon: 'solar:cup-star-bold',
    };
  }

  const baftaWin = items.find((i) => i.type === 'Win' && /bafta/i.test(i.organization));
  if (baftaWin) {
    return {
      title: 'BAFTA Award Winner',
      subtitle: 'British Academy Honoree',
      icon: 'solar:medal-ribbons-star-bold',
    };
  }

  const festivalWin = items.find(
    (i) => i.type === 'Win' && /cannes|venice|berlin|sundance/i.test(i.organization),
  );
  if (festivalWin) {
    return {
      title: 'Film Festival Laureate',
      subtitle: 'International Cinema Honoree',
      icon: 'solar:diploma-verified-bold',
    };
  }

  if (winsCount > 0) {
    return {
      title: `${winsCount}x Award Winner`,
      subtitle: 'Recognized Industry Excellence',
      icon: 'solar:cup-bold',
    };
  }

  return {
    title: 'Award Nominated Title',
    subtitle: 'Industry Recognition',
    icon: 'solar:medal-ribbons-star-bold',
  };
}

function groupByOrganization(items = [], organizations = []) {
  const groups = new Map(
    organizations.map((organization) => [
      organization.id,
      {
        ...organization,
        winsCount: 0,
        nominationsCount: 0,
        awards: [],
      },
    ]),
  );

  items.forEach((item) => {
    const id = item.organizationId;
    let group = groups.get(id);

    if (!group) {
      group = {
        id,
        title: item.organization,
        logo: item.organizationLogo,
        winsCount: 0,
        nominationsCount: 0,
        awards: [],
      };
      groups.set(id, group);
    }

    if (item.type === AWARD_TYPES.WIN) {
      group.winsCount += 1;
    } else {
      group.nominationsCount += 1;
    }
    group.awards.push(item);
  });

  return Array.from(groups.values())
    .filter((group) => group.awards.length > 0)
    .sort(
      (left, right) => right.winsCount - left.winsCount || right.awards.length - left.awards.length,
    );
}

function PrestigeHeroHeader({
  items = [],
  wins = 0,
  nominations = 0,
  majorWinsCount = 0,
  majorWinsLabel = 'Oscars',
  organizationsCount = 0,
  isTv = false,
}) {
  const honor = useMemo(
    () => getPrestigeHonor(items, wins, majorWinsCount, isTv),
    [items, wins, majorWinsCount, isTv],
  );

  return (
    <div className="relative flex w-full flex-col text-left">
      <h1 className="font-zuume -mt-2 line-clamp-2 max-w-full overflow-hidden text-7xl leading-none font-bold [overflow-wrap:anywhere] text-white uppercase sm:-mt-2.5 sm:text-8xl lg:-mt-3 lg:text-9xl">
        {honor.title}
      </h1>

      <div className="mt-2.5 flex flex-wrap items-center justify-start gap-2.5 py-2.5 text-xs font-medium text-white/50 sm:text-sm">
        <span className="flex items-center gap-1.5 font-bold text-white">
          <Icon icon="solar:cup-bold" size={14} className="text-white" />
          {wins} {wins === 1 ? 'Win' : 'Wins'}
        </span>
        <span className="text-white/15">•</span>
        <span className="text-white/70">
          {nominations} {nominations === 1 ? 'Nomination' : 'Nominations'}
        </span>
        {majorWinsCount > 0 ? (
          <>
            <span className="text-white/15">•</span>
            <span className="font-semibold text-white/70">
              {majorWinsCount} {majorWinsLabel}
            </span>
          </>
        ) : null}
        <span className="text-white/15">•</span>
        <span className="text-white/70">
          {organizationsCount} {organizationsCount === 1 ? 'Guild' : 'Guilds'}
        </span>
      </div>
    </div>
  );
}

function OrganizationFilterRibbon({
  organizations = [],
  activeOrganizationId,
  onSelectOrganization,
  totalItemsCount,
  winsOnly = false,
  onToggleWinsOnly,
  winsCount = 0,
}) {
  const scrollRef = useDraggableScroll();

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        className="hide-scrollbar flex w-full cursor-grab items-center gap-2.5 overflow-x-auto py-1 select-none active:cursor-grabbing"
      >
        <Button
          type="button"
          onClick={() => {
            onSelectOrganization(null);
            if (winsOnly) onToggleWinsOnly?.();
          }}
          className={cn(
            'flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-semibold ring-1 transition-all duration-200 ease-out ring-inset',
            !activeOrganizationId && !winsOnly
              ? 'bg-white font-bold text-black shadow-sm ring-white'
              : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white hover:ring-white/15',
          )}
        >
          <span>All Honors</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              !activeOrganizationId && !winsOnly
                ? 'bg-black/10 font-bold text-black'
                : 'text-white/50',
            )}
          >
            {totalItemsCount}
          </span>
        </Button>

        {winsCount > 0 && (
          <Button
            type="button"
            onClick={() => onToggleWinsOnly?.()}
            className={cn(
              'flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ring-1 transition-all duration-200 ease-out ring-inset',
              winsOnly
                ? 'bg-white font-bold text-black shadow-sm ring-white'
                : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white hover:ring-white/15',
            )}
          >
            <Icon
              icon="solar:cup-bold"
              size={13}
              className={winsOnly ? 'text-black' : 'text-white/70'}
            />
            <span>Wins Only</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                winsOnly ? 'bg-black/10 font-bold text-black' : 'text-white/50',
              )}
            >
              {winsCount}
            </span>
          </Button>
        )}

        {organizations.map((org) => {
          const isSelected = activeOrganizationId === org.id;
          const logoSrc = getOriginalImagePath(org.logo);

          return (
            <Button
              key={org.id}
              type="button"
              onClick={() => onSelectOrganization(isSelected ? null : org.id)}
              className={cn(
                'flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-semibold ring-1 transition-all duration-200 ease-out ring-inset',
                isSelected
                  ? 'bg-white font-bold text-black shadow-sm ring-white'
                  : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white hover:ring-white/15',
              )}
            >
              {logoSrc ? (
                <div className="relative size-4 shrink-0 overflow-hidden">
                  <AdaptiveImage
                    mode="img"
                    src={logoSrc}
                    alt={org.title}
                    className="size-full object-contain"
                    wrapperClassName="size-full"
                  />
                </div>
              ) : (
                <Icon
                  icon="solar:diploma-verified-bold"
                  size={14}
                  className={isSelected ? 'text-black' : 'text-white/50'}
                />
              )}

              <span className="max-w-[140px] truncate sm:max-w-[180px]">{org.title}</span>

              <span
                className={cn(
                  'text-xs',
                  isSelected ? 'font-semibold text-black/60' : 'text-white/50',
                )}
              >
                {org.winsCount > 0 ? `${org.winsCount}W` : `${org.nominationsCount}N`}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function RecipientLink({ recipient }) {
  return (
    <Link
      href={`/person/${recipient.id}`}
      className="group/recipient inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
    >
      {recipient.profile ? (
        <div className="relative size-4 shrink-0 overflow-hidden rounded-full">
          <AdaptiveImage
            mode="img"
            src={recipient.profile}
            alt={recipient.name}
            className="size-full object-cover"
            wrapperClassName="size-full"
          />
        </div>
      ) : (
        <Icon icon="solar:user-bold" size={12} className="text-white/50" />
      )}
      <span className="truncate group-hover/recipient:underline">{recipient.name}</span>
    </Link>
  );
}

function MovieOrgAwardGroup({ group }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="center size-11 shrink-0 overflow-hidden rounded-[8px] sm:size-12 sm:rounded-[10px]">
            {group.logo ? (
              <AdaptiveImage
                mode="img"
                src={group.logo.replace(/\/t\/p\/(?:w\d+[^/]*|h\d+[^/]*)\//i, '/t/p/original/')}
                alt={group.title}
                className="size-full object-contain"
                wrapperClassName="size-full"
              />
            ) : (
              <Icon icon="solar:diploma-verified-bold" size={26} className="text-white/50" />
            )}
          </div>

          <div className="flex flex-col justify-center gap-0.5">
            <h3 className="text-lg leading-tight font-bold text-white sm:text-xl">{group.title}</h3>
            <p className="text-xs leading-none font-medium text-white/50">
              {group.awards.length}{' '}
              {group.awards.length === 1 ? 'Total Nomination' : 'Total Honors'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {group.winsCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-white uppercase">
              <Icon icon="solar:cup-bold" size={13} className="text-white" />
              {getAwardCountLabel(group.winsCount, 'Win', 'Wins')}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col">
        {group.awards.map((award) => {
          const isWin = award.type === AWARD_TYPES.WIN;
          const recipients = award.recipients || [];

          return (
            <div
              key={award.key}
              className="flex items-center justify-between gap-2.5 border-t border-white/5 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 pl-[54px] sm:pl-[58px]">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/50">
                  <span className="font-semibold">{award.year}</span>
                  {award.ceremony && award.ceremony !== award.organization ? (
                    <>
                      <span className="text-white/15">•</span>
                      <span className="truncate">{award.ceremony}</span>
                    </>
                  ) : null}
                </div>

                <p className="text-sm leading-snug font-semibold text-white sm:text-base">
                  {award.category}
                </p>

                {recipients.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {recipients.map((recipient) => (
                      <RecipientLink key={recipient.id} recipient={recipient} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 pl-2.5">
                {isWin ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                    <Icon icon="solar:cup-bold" size={13} className="text-white" />
                    Win
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-white/50 uppercase">Nominee</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AwardsMessage({ children }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="center size-14 rounded-[16px] bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon="solar:cup-star-linear" size={30} />
      </div>
      <p className="mt-4 text-sm font-semibold text-white/50">{children}</p>
    </div>
  );
}

export default function MovieAwards({
  movieId,
  tvId,
  mediaId,
  mediaType = 'movie',
  awardsPromise,
  onEmpty,
}) {
  const resolvedMediaId = mediaId || movieId || tvId;
  const { academyWins, allItems, emmyWins, nominations, organizations, status, wins } =
    useMediaAwards({
      awardsPromise,
      mediaId: resolvedMediaId,
      mediaType,
    });

  const [activeOrganizationId, setActiveOrganizationId] = useState(null);
  const [winsOnly, setWinsOnly] = useState(false);

  useEffect(() => {
    if (status === 'ready' && !allItems.length) {
      onEmpty?.();
    }
  }, [status, allItems.length, onEmpty]);

  const orgStats = useMemo(
    () => groupByOrganization(allItems, organizations),
    [allItems, organizations],
  );

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (activeOrganizationId) {
      list = list.filter((item) => item.organizationId === activeOrganizationId);
    }
    if (winsOnly) {
      list = list.filter((item) => item.type === AWARD_TYPES.WIN);
    }
    return list;
  }, [allItems, activeOrganizationId, winsOnly]);

  const orgGroups = useMemo(
    () => groupByOrganization(filteredItems, organizations),
    [filteredItems, organizations],
  );

  if (status === 'error') {
    return <AwardsMessage>Awards are temporarily unavailable</AwardsMessage>;
  }

  if (status === 'ready' && !allItems.length) {
    return null;
  }

  const isTv = mediaType === 'tv';
  const majorWinsCount = isTv ? emmyWins : academyWins;
  const majorWinsLabel = isTv ? 'Emmys' : 'Oscars';

  return (
    <section className="relative flex w-full flex-col gap-6 sm:gap-8">
      <PrestigeHeroHeader
        items={allItems}
        wins={wins}
        nominations={nominations}
        majorWinsCount={majorWinsCount}
        majorWinsLabel={majorWinsLabel}
        organizationsCount={organizations.length}
        isTv={isTv}
      />

      <OrganizationFilterRibbon
        organizations={orgStats}
        activeOrganizationId={activeOrganizationId}
        onSelectOrganization={setActiveOrganizationId}
        totalItemsCount={allItems.length}
        winsOnly={winsOnly}
        onToggleWinsOnly={() => setWinsOnly((v) => !v)}
        winsCount={wins}
      />

      <div className="w-full">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] bg-white/5 p-12 text-center text-sm font-medium text-white/50 ring-1 ring-white/10 ring-inset">
            No matching awards found for the selected filter.
          </div>
        ) : (
          <div className="flex w-full flex-col gap-10 sm:gap-12">
            {orgGroups.map((group) => (
              <MovieOrgAwardGroup key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
