'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import {
  resolveImageFetchPriority,
  resolveImageLoading,
  resolveImageQuality,
} from '@/shared/utils';
import {
  getPreferredPersonPosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import SegmentedControl from '@/ui/primitives/segmented-control';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/shared/utils';
import { MediaRouteReveal } from '@/app/(media)/motion';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { GridCrosshair } from '@/ui/layout/grid-crosshair';
const FEATURED_COUNT = 6;
const COMPACT_COUNT = 3;

function PersonImage({
  person,
  compact,
  size,
  quality = 72,
  priority = false,
  fetchPriority = '',
}) {
  const [error, setError] = useState(false);
  const src = !error
    ? getPreferredPersonPosterSrc(person, size) ||
      (person.profile_path ? `${TMDB_IMG}/${size}${person.profile_path}` : null)
    : null;

  if (!src) {
    return (
      <div className="center h-full w-full">
        <Icon icon="solar:user-bold" size={size === 'w92' ? 14 : 20} className="text-white/50" />
      </div>
    );
  }

  return (
    <AdaptiveImage
      fill
      alt={person.name}
      src={src}
      sizes={size === 'w92' ? '32px' : '64px'}
      priority={priority}
      fetchPriority={resolveImageFetchPriority({
        fetchPriority,
        priority,
      })}
      loading={resolveImageLoading({
        priority,
      })}
      quality={resolveImageQuality('thumbnail', quality)}
      decoding="async"
      draggable={false}
      className={cn('h-full w-full object-cover', compact ? '' : '')}
      onError={() => setError(true)}
    />
  );
}

function PersonCard({ person, compact = false, priority = false, fetchPriority }) {
  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'group isolation-isolate flex items-center gap-3 border border-white/5 backdrop-blur-sm hover:border-white/10 hover:bg-white/5',
        compact ? 'h-10 min-w-0 flex-1 p-1 pr-2' : 'h-[84px] p-1 pr-4',
      )}
    >
      <div
        className={cn('relative shrink-0 overflow-hidden', compact ? 'h-8 w-8' : 'h-[76px] w-14')}
      >
        <PersonImage
          person={person}
          size={compact ? 'w92' : 'w185'}
          quality={compact ? 70 : 72}
          priority={priority}
          fetchPriority={fetchPriority}
          compact={compact}
        />
      </div>

      {compact ? (
        <span className="truncate text-xs font-semibold text-white">{person.name}</span>
      ) : (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-white">{person.name}</span>
          <span className="truncate text-xs text-white/70">{person.subtitle}</span>
        </div>
      )}
    </Link>
  );
}

function buildEntries(list = [], fallbackKey) {
  return list.map((item) => ({
    ...item,
    subtitle: item?.[fallbackKey] || (fallbackKey === 'character' ? 'Cast' : 'Crew'),
  }));
}

function splitEntries(list = []) {
  return {
    featured: list.slice(0, FEATURED_COUNT),
    compact: list.slice(FEATURED_COUNT, FEATURED_COUNT + COMPACT_COUNT),
  };
}

function buildPersonEntryKey(tabKey, person = {}, index = 0, variant = 'entry') {
  const creditKey =
    person?.credit_id ||
    person?.creditId ||
    person?.cast_id ||
    person?.castId ||
    person?.order ||
    [person?.id, person?.job, person?.department, person?.character, person?.subtitle]
      .filter(Boolean)
      .join('-') ||
    person?.name ||
    'person';
  return `${tabKey}-${variant}-${creditKey}-${index}`;
}

export default function CastSection({ cast = [], crew = [], headerAction = null, baseDelay = 0 }) {
  usePosterPreferenceVersion();
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState('cast');
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);
  const castEntries = useMemo(() => buildEntries(cast, 'character'), [cast]);
  const crewEntries = useMemo(
    () =>
      crew.map((item) => ({
        ...item,
        subtitle: item?.job || item?.department || 'Crew',
      })),
    [crew],
  );
  const tabs = useMemo(() => {
    const items = [];
    if (castEntries.length)
      items.push({
        key: 'cast',
        label: 'Cast',
        entries: castEntries,
      });
    if (crewEntries.length)
      items.push({
        key: 'crew',
        label: 'Crew',
        entries: crewEntries,
      });
    return items;
  }, [castEntries, crewEntries]);

  useEffect(() => {
    if (!tabs.find((tab) => tab.key === activeTab) && tabs[0]) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  const handleTabChange = (key) => {
    setHasSwitchedTab(true);
    setActiveTab(key);
  };

  if (!tabs.length) return null;
  const activeTabData = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  const handleOpenModal = () => {
    openModal(
      'CAST_MODAL',
      {
        desktop: 'center',
        mobile: 'bottom',
      },
      {
        data: {
          cast: castEntries,
          crew: crewEntries,
          initialTab: activeTab,
        },
      },
    );
  };

  const renderPanel = (tabKey, entries) => {
    const { featured, compact } = splitEntries(entries);
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {featured.map((person, index) => {
            return (
              <MediaRouteReveal
                key={buildPersonEntryKey(tabKey, person, index, 'featured')}
                stage="items.cast"
                interactive
                itemIndex={index}
              >
                <div className="h-full w-full">
                  <PersonCard person={person} />
                </div>
              </MediaRouteReveal>
            );
          })}
        </div>

        {!!compact.length && (
          <div className="flex h-10 items-center gap-2">
            {compact.map((person, index) => {
              const responsiveClass = index > 1 ? 'hidden sm:block' : '';
              return (
                <MediaRouteReveal
                  key={buildPersonEntryKey(tabKey, person, index, 'compact')}
                  className={`min-w-0 flex-1 ${responsiveClass}`}
                  stage="items.cast"
                  interactive
                  itemIndex={FEATURED_COUNT + index}
                >
                  <div className="h-full w-full">
                    <PersonCard person={person} compact />
                  </div>
                </MediaRouteReveal>
              );
            })}

            <button
              type="button"
              aria-label="Show full cast"
              onClick={handleOpenModal}
              className="center isolation-isolate size-10 shrink-0 cursor-pointer border border-white/5 text-white/70 backdrop-blur-sm hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              <Icon icon="solar:alt-arrow-right-linear" size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="relative w-full">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:users-group-two-rounded-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Cast & Crew
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <SegmentedControl
            value={activeTab}
            className="backdrop-blur-sm"
            onChange={handleTabChange}
            items={tabs.map(({ key, label }) => ({
              key,
              label,
            }))}
          />
          {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-px right-px h-px bg-white/10 backdrop-blur-sm">
          <GridCrosshair side="left" />
          <GridCrosshair side="right" />
        </div>
      </div>

      <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <div className="relative overflow-visible">
          {renderPanel(activeTabData.key, activeTabData.entries)}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-px right-px h-px bg-white/10 backdrop-blur-sm">
        <GridCrosshair side="left" />
        <GridCrosshair side="right" />
      </div>
    </section>
  );
}
