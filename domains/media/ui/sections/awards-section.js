'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import MediaThumb from '../components/media-thumb';
import { getPersonAwardsServer } from '@/domains/media/server/person-awards.js';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { cn } from '@/ui/class-names';
import { useDraggableScroll } from '@/shared';

const AWARD_TYPES = Object.freeze({
  WIN: 'Win',
  NOMINEE: 'Nominee',
});

function getMediaPath(item) {
  if (!item?.projectId) return null;
  return `/${item.mediaType === 'tv' ? 'tv' : 'movie'}/${item.projectId}`;
}

function getOriginalImagePath(path) {
  return path ? path.replace(/\/t\/p\/(?:w\d+[^/]*|h\d+[^/]*)\//i, '/t/p/original/') : null;
}

function getAwardCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function updateAwardStats(group, type) {
  if (type === AWARD_TYPES.WIN) group.winsCount += 1;
  else group.nominationsCount += 1;
}

function createAwardGroup({
  id,
  projectId,
  project,
  mediaType,
  poster,
  year,
  organization,
  organizationId,
  logo,
}) {
  return {
    id,
    projectId,
    project,
    mediaType,
    poster,
    year,
    organization,
    organizationId,
    logo,
    winsCount: 0,
    nominationsCount: 0,
    awards: [],
  };
}

function buildTimeline(organizations = []) {
  return organizations
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
          project: award.project || null,
          projectId: award.projectId || null,
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

  return {
    allItems,
    nominations,
    organizations,
    status,
    wins,
  };
}

function getPrestigeHonor(items = [], winsCount = 0) {
  const oscarWin = items.find((i) => i.type === 'Win' && /academy|oscar/i.test(i.organization));
  if (oscarWin) {
    return {
      title: 'Academy Award Winner',
      subtitle: 'Oscar Recipient',
      icon: 'solar:cup-bold',
      isMajor: true,
    };
  }

  const emmyWin = items.find((i) => i.type === 'Win' && /emmy/i.test(i.organization));
  if (emmyWin) {
    return {
      title: 'Emmy Award Winner',
      subtitle: 'Television Academy Honoree',
      icon: 'solar:star-bold',
      isMajor: true,
    };
  }

  const globeWin = items.find((i) => i.type === 'Win' && /golden globe/i.test(i.organization));
  if (globeWin) {
    return {
      title: 'Golden Globe Winner',
      subtitle: 'HFPA Honoree',
      icon: 'solar:cup-star-bold',
      isMajor: true,
    };
  }

  const baftaWin = items.find((i) => i.type === 'Win' && /bafta/i.test(i.organization));
  if (baftaWin) {
    return {
      title: 'BAFTA Award Winner',
      subtitle: 'British Academy Honoree',
      icon: 'solar:medal-ribbons-star-bold',
      isMajor: true,
    };
  }

  const festivalWin = items.find(
    (i) => i.type === 'Win' && /cannes|venice|berlin/i.test(i.organization),
  );
  if (festivalWin) {
    return {
      title: 'Film Festival Laureate',
      subtitle: 'International Cinema Honoree',
      icon: 'solar:diploma-verified-bold',
      isMajor: true,
    };
  }

  if (winsCount > 0) {
    return {
      title: `${winsCount}x Award Winner`,
      subtitle: 'Recognized Career Excellence',
      icon: 'solar:cup-bold',
      isMajor: true,
    };
  }

  return {
    title: 'Award Nominated Artist',
    subtitle: 'Industry Recognition',
    icon: 'solar:medal-ribbons-star-bold',
    isMajor: false,
  };
}

function groupByProject(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const id = item.projectId || item.project || 'industry-honors';
    let group = groups.get(id);

    if (!group) {
      group = createAwardGroup({
        id,
        projectId: item.projectId,
        project: item.project || 'Career & Honorary Honors',
        mediaType: item.mediaType || 'movie',
        poster: item.poster,
      });
      groups.set(id, group);
    }

    updateAwardStats(group, item.type);
    group.awards.push(item);
    if (!group.poster && item.poster) group.poster = item.poster;
  });

  return Array.from(groups.values()).sort(
    (left, right) => right.winsCount - left.winsCount || right.awards.length - left.awards.length,
  );
}

function groupByYear(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const year = item.year || '—';
    let group = groups.get(year);

    if (!group) {
      group = { year, winsCount: 0, nominationsCount: 0, awards: [] };
      groups.set(year, group);
    }

    updateAwardStats(group, item.type);
    group.awards.push(item);
  });

  return Array.from(groups.values()).sort((left, right) => right.year.localeCompare(left.year));
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

    updateAwardStats(group, item.type);
    group.awards.push(item);
  });

  return Array.from(groups.values())
    .filter((group) => group.awards.length > 0)
    .sort(
      (left, right) => right.winsCount - left.winsCount || right.awards.length - left.awards.length,
    );
}

function PrestigeHeroHeader({ items = [], wins = 0, nominations = 0, organizationsCount = 0 }) {
  const honor = useMemo(() => getPrestigeHonor(items, wins), [items, wins]);
  const projectsCount = useMemo(() => {
    const set = new Set(items.map((i) => i.projectId || i.project).filter(Boolean));
    return set.size;
  }, [items]);

  return (
    <div className="relative flex w-full flex-col pt-2 pb-1 text-left">
      <h2 className="font-zuume text-5xl leading-none font-bold text-white uppercase sm:text-7xl lg:text-8xl">
        {honor.title}
      </h2>

      <div className="mt-2.5 flex flex-wrap items-center justify-start gap-2.5 py-2.5 text-xs font-medium text-white/50 sm:text-sm">
        <span className="flex items-center gap-1.5 font-bold text-white">
          <Icon icon="solar:cup-bold" size={14} className="text-white" />
          {wins} {wins === 1 ? 'Win' : 'Wins'}
        </span>
        <span className="text-white/15">•</span>
        <span className="text-white/70">
          {nominations} {nominations === 1 ? 'Nomination' : 'Nominations'}
        </span>
        <span className="text-white/15">•</span>
        <span className="text-white/70">
          {projectsCount} {projectsCount === 1 ? 'Title' : 'Titles'}
        </span>
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

function ProjectAwardCard({ group }) {
  const mediaPath = getMediaPath(group);

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2.5 pb-1">
        <div className="flex min-w-0 items-center gap-2.5">
          {mediaPath ? (
            <Link
              href={mediaPath}
              className="shrink-0 transition-transform duration-300 hover:scale-105"
            >
              <MediaThumb
                poster={group.poster}
                alt={group.project}
                className="w-12 shrink-0 rounded-[6px] sm:w-14 sm:rounded-[8px]"
              />
            </Link>
          ) : (
            <MediaThumb
              poster={group.poster}
              alt={group.project}
              className="w-12 shrink-0 rounded-[6px] sm:w-14 sm:rounded-[8px]"
            />
          )}

          <div className="flex min-w-0 flex-col gap-1">
            {mediaPath ? (
              <Link
                href={mediaPath}
                className="group/title inline-flex items-center gap-1.5 truncate text-lg leading-snug font-bold text-white transition-colors hover:text-white/70 sm:text-xl"
              >
                <span className="truncate">{group.project}</span>
                <Icon
                  icon="solar:arrow-right-up-linear"
                  size={14}
                  className="shrink-0 text-white/50 group-hover/title:text-white"
                />
              </Link>
            ) : (
              <h3 className="truncate text-lg leading-snug font-bold text-white sm:text-xl">
                {group.project}
              </h3>
            )}

            <div className="flex items-center gap-2 text-xs text-white/50">
              {group.winsCount > 0 && (
                <span className="flex items-center gap-1 font-bold text-white">
                  <Icon icon="solar:cup-bold" size={12} className="text-white" />
                  {getAwardCountLabel(group.winsCount, 'Win', 'Wins')}
                </span>
              )}
              {group.winsCount > 0 && group.nominationsCount > 0 && <span>•</span>}
              {group.nominationsCount > 0 && (
                <span>
                  {getAwardCountLabel(group.nominationsCount, 'Nomination', 'Nominations')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col">
        {group.awards.map((award) => {
          const isWin = award.type === AWARD_TYPES.WIN;

          return (
            <div
              key={award.key}
              className="flex items-center justify-between gap-2.5 border-t border-white/5 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 pl-[58px] sm:pl-[66px]">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-white/50">{award.year}</span>
                  <span className="text-white/15">•</span>
                  <span className="truncate font-medium text-white/70">{award.organization}</span>
                  {award.ceremony && award.ceremony !== award.organization ? (
                    <span className="hidden truncate text-white/50 sm:inline">
                      ({award.ceremony})
                    </span>
                  ) : null}
                </div>

                <p className="text-sm leading-snug font-semibold text-white sm:text-base">
                  {award.category}
                </p>
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

function TimelineAwardGroup({ group }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="font-zuume text-3xl font-bold text-white sm:text-4xl">{group.year}</span>
          <div className="h-3.5 w-px bg-white/15" />
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            {group.winsCount > 0 && (
              <span className="flex items-center gap-1 font-bold text-white">
                <Icon icon="solar:cup-bold" size={12} className="text-white" />
                {getAwardCountLabel(group.winsCount, 'Win', 'Wins')}
              </span>
            )}
            {group.winsCount > 0 && group.nominationsCount > 0 && <span>•</span>}
            {group.nominationsCount > 0 && (
              <span>{getAwardCountLabel(group.nominationsCount, 'Nomination', 'Nominations')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col">
        {group.awards.map((award) => {
          const isWin = award.type === AWARD_TYPES.WIN;
          const mediaPath = getMediaPath(award);

          return (
            <div
              key={award.key}
              className="flex items-center justify-between gap-2.5 border-t border-white/5 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {award.poster ? (
                  mediaPath ? (
                    <Link
                      href={mediaPath}
                      className="shrink-0 transition-transform hover:scale-105"
                    >
                      <MediaThumb
                        poster={award.poster}
                        alt={award.project || award.category}
                        className="w-10 shrink-0 rounded-[4px] sm:w-11 sm:rounded-[6px]"
                      />
                    </Link>
                  ) : (
                    <MediaThumb
                      poster={award.poster}
                      alt={award.project || award.category}
                      className="w-10 shrink-0 rounded-[4px] sm:w-11 sm:rounded-[6px]"
                    />
                  )
                ) : award.organizationLogo ? (
                  <div className="center size-10 shrink-0 overflow-hidden rounded-[8px] sm:size-11">
                    <AdaptiveImage
                      mode="img"
                      src={award.organizationLogo.replace(
                        /\/t\/p\/(?:w\d+[^/]*|h\d+[^/]*)\//i,
                        '/t/p/original/',
                      )}
                      alt={award.organization}
                      className="size-full object-contain"
                      wrapperClassName="size-full"
                    />
                  </div>
                ) : (
                  <div className="center size-10 shrink-0 rounded-[8px] text-white/50 sm:size-11">
                    <Icon icon="solar:cup-star-bold" size={18} />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/50">
                    <span className="font-semibold text-white/70">{award.organization}</span>
                    {award.project && (
                      <>
                        <span className="text-white/15">•</span>
                        {mediaPath ? (
                          <Link
                            href={mediaPath}
                            className="truncate font-medium text-white/70 hover:text-white"
                          >
                            {award.project}
                          </Link>
                        ) : (
                          <span className="truncate text-white/50">{award.project}</span>
                        )}
                      </>
                    )}
                  </div>

                  <h4 className="text-sm leading-snug font-semibold text-white sm:text-base">
                    {award.category}
                  </h4>
                </div>
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

function OrganizationAwardGroup({ group }) {
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
          const mediaPath = getMediaPath(award);

          return (
            <div
              key={award.key}
              className="flex items-center justify-between gap-2.5 border-t border-white/5 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {award.poster ? (
                  mediaPath ? (
                    <Link
                      href={mediaPath}
                      className="shrink-0 transition-transform hover:scale-105"
                    >
                      <MediaThumb
                        poster={award.poster}
                        alt={award.project || award.category}
                        className="w-10 shrink-0 rounded-[4px] sm:w-11 sm:rounded-[6px]"
                      />
                    </Link>
                  ) : (
                    <MediaThumb
                      poster={award.poster}
                      alt={award.project || award.category}
                      className="w-10 shrink-0 rounded-[4px] sm:w-11 sm:rounded-[6px]"
                    />
                  )
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/50">
                    <span className="font-semibold text-white/50">{award.year}</span>
                    {award.project && (
                      <>
                        <span className="text-white/15">•</span>
                        {mediaPath ? (
                          <Link
                            href={mediaPath}
                            className="truncate font-medium text-white/70 hover:text-white"
                          >
                            {award.project}
                          </Link>
                        ) : (
                          <span className="truncate text-white/50">{award.project}</span>
                        )}
                      </>
                    )}
                    {award.ceremony && award.ceremony !== award.organization ? (
                      <span className="hidden truncate text-white/50 sm:inline">
                        ({award.ceremony})
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-snug font-semibold text-white sm:text-base">
                    {award.category}
                  </p>
                </div>
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

function AwardsEmptyFeedback({ children }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="center size-14 rounded-[16px] bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon="solar:cup-star-linear" size={30} />
      </div>
      <p className="mt-4 text-sm font-semibold text-white/50">{children}</p>
    </div>
  );
}

export default function PersonAwards({
  personId,
  awardsPromise,
  viewMode: controlledViewMode,
  onViewModeChange,
}) {
  const { allItems, nominations, organizations, status, wins } = usePersonAwards({
    awardsPromise,
    personId,
  });

  const [activeOrganizationId, setActiveOrganizationId] = useState(null);
  const [internalViewMode, setInternalViewMode] = useState('projects');
  const viewMode = controlledViewMode ?? internalViewMode;
  const [winsOnly, setWinsOnly] = useState(false);

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

  const projectGroups = useMemo(() => groupByProject(filteredItems), [filteredItems]);
  const yearGroups = useMemo(() => groupByYear(filteredItems), [filteredItems]);
  const orgGroups = useMemo(
    () => groupByOrganization(filteredItems, organizations),
    [filteredItems, organizations],
  );

  if (status === 'error') {
    return <AwardsEmptyFeedback>Awards are temporarily unavailable</AwardsEmptyFeedback>;
  }

  if (status === 'ready' && !allItems.length) {
    return <AwardsEmptyFeedback>No awards information found for this artist</AwardsEmptyFeedback>;
  }

  return (
    <section className="relative flex w-full flex-col gap-6 sm:gap-8">
      <PrestigeHeroHeader
        items={allItems}
        wins={wins}
        nominations={nominations}
        organizationsCount={organizations.length}
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
        ) : viewMode === 'projects' ? (
          <div className="flex w-full flex-col gap-10 sm:gap-12">
            {projectGroups.map((group) => (
              <ProjectAwardCard key={group.id} group={group} />
            ))}
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="flex w-full flex-col gap-10 sm:gap-12">
            {yearGroups.map((group) => (
              <TimelineAwardGroup key={group.year} group={group} />
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-10 sm:gap-12">
            {orgGroups.map((group) => (
              <OrganizationAwardGroup key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
