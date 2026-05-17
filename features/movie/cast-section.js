'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { cn, resolveImageFetchPriority, resolveImageLoading, resolveImageQuality } from '@/core/utils';
import { getPreferredPersonPosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import SegmentedControl from '@/ui/elements/segmented-control';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';
import {
  getMovieFeatureItemMotion,
  MOVIE_FEATURE_ACTION_MOTION,
  MOVIE_FEATURE_SOFT_STAGGER,
  MOVIE_FEATURE_SECTION_MOTION,
} from '@/features/movie/motion';

const FEATURED_COUNT = 6;
const COMPACT_COUNT = 3;

function PersonImage({ person, size, quality = 72, priority = false, fetchPriority = '' }) {
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
      fetchPriority={resolveImageFetchPriority({ fetchPriority, priority })}
      loading={resolveImageLoading({ priority })}
      quality={resolveImageQuality('thumbnail', quality)}
      decoding="async"
      draggable={false}
      className="object-cover"
      onError={() => setError(true)}
      wrapperClassName="h-full w-full"
    />
  );
}

function PersonCard({ person, compact = false, priority = false, fetchPriority }) {
  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'group isolate flex items-center gap-3 border border-white/5 bg-white/5 backdrop-blur transition-[filter,color,background-color,border-color,opacity] [transition-duration:280ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] hover:bg-black/30 hover:brightness-105 focus-visible:brightness-105 focus-within:brightness-105',
        'overflow-hidden [backface-visibility:hidden]',
        compact ? 'h-10 min-w-0 flex-1 p-1' : 'p-0.5 pr-4'
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden transition-[filter,color,background-color,border-color,opacity] [transition-duration:420ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] group-hover:brightness-105 group-focus-visible:brightness-105 group-focus-within:brightness-105',
          compact ? 'h-8 w-8' : 'h-20 w-16'
        )}
      >
        <PersonImage
          person={person}
          size={compact ? 'w92' : 'w185'}
          quality={compact ? 70 : 72}
          priority={priority}
          fetchPriority={fetchPriority}
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

function buildCrewEntries(crew = []) {
  return crew.map((item) => ({
    ...item,
    subtitle: item?.job || item?.department || 'Crew',
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
    [person?.id, person?.job, person?.department, person?.character, person?.subtitle].filter(Boolean).join('-') ||
    person?.name ||
    'person';

  return `${tabKey}-${variant}-${creditKey}-${index}`;
}

export default function CastSection({ cast = [], crew = [], headerAction = null }) {
  usePosterPreferenceVersion();
  const sectionRef = useRef(null);
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState('cast');

  const castEntries = useMemo(() => buildEntries(cast, 'character'), [cast]);
  const crewEntries = useMemo(() => buildCrewEntries(crew), [crew]);

  const tabs = useMemo(() => {
    const items = [];
    if (castEntries.length) items.push({ key: 'cast', label: 'Cast', entries: castEntries });
    if (crewEntries.length) items.push({ key: 'crew', label: 'Crew', entries: crewEntries });
    return items;
  }, [castEntries, crewEntries]);

  useEffect(() => {
    if (!tabs.find((tab) => tab.key === activeTab) && tabs[0]) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  if (!tabs.length) return null;

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const activeTabData = tabs[activeIndex] || tabs[0];

  const handleOpenModal = () => {
    openModal(
      'CAST_MODAL',
      { desktop: 'center', mobile: 'bottom' },
      {
        data: {
          cast: castEntries,
          crew: crewEntries,
          initialTab: activeTab,
        },
      }
    );
  };

  return (
    <motion.section ref={sectionRef} className="movie-detail-section-content relative w-full" {...MOVIE_FEATURE_SECTION_MOTION}>
      <motion.div className="flex items-center justify-between gap-3" {...getMovieFeatureItemMotion(0)}>
        <SegmentedControl
          equalItems
          value={activeTab}
          onChange={setActiveTab}
          classNames={{
            wrapper: 'backdrop-blur',
          }}
          items={tabs.map(({ key, label }) => ({ key, label }))}
        />
        {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
      </motion.div>

      <motion.div className="relative w-full overflow-hidden" {...getMovieFeatureItemMotion(1)}>
        {tabs.length === 1 ? (
          <CastPanel
            tabKey={activeTabData.key}
            entries={activeTabData.entries}
            onOpenModal={handleOpenModal}
          />
        ) : (
          <>
            <div aria-hidden="true" className="invisible">
              <CastPanel
                tabKey={activeTabData.key}
                entries={activeTabData.entries}
                onOpenModal={handleOpenModal}
              />
            </div>

            <div className="absolute inset-0 flex">
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.key}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ x: `${(index - activeIndex) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }}
                >
                  <CastPanel
                    tabKey={tab.key}
                    entries={tab.entries}
                    onOpenModal={handleOpenModal}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.section>
  );
}

function CastPanel({ tabKey, entries, onOpenModal }) {
  const { featured, compact } = splitEntries(entries);
  const getCardMotion = (index) => ({
    initial: {
      opacity: 0,
      y: MOVIE_FEATURE_SOFT_STAGGER.initialY,
      scale: MOVIE_FEATURE_SOFT_STAGGER.initialScale,
    },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      type: 'tween',
      duration: MOVIE_FEATURE_SOFT_STAGGER.duration,
      delay: MOVIE_FEATURE_SOFT_STAGGER.delay + index * MOVIE_FEATURE_SOFT_STAGGER.interval,
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {featured.map((person, index) => (
          <motion.div key={buildPersonEntryKey(tabKey, person, index, 'featured')} {...getCardMotion(index)}>
            <PersonCard person={person} priority={index < 4} fetchPriority={index < 4 ? 'high' : undefined} />
          </motion.div>
        ))}
      </div>

      {compact.length ? (
        <div className="flex h-10 items-center gap-2">
          {compact.map((person, index) => (
            <motion.div
              key={buildPersonEntryKey(tabKey, person, index, 'compact')}
              className={cn('min-w-0 flex-1', index > 1 && 'hidden sm:block')}
              {...getCardMotion(index + 7)}
            >
              <PersonCard person={person} compact />
            </motion.div>
          ))}

          <motion.button
            type="button"
            aria-label="Show full cast"
            onClick={onOpenModal}
            className="center size-10 shrink-0 border border-white/5 bg-white/5 text-white/70 hover:bg-black/30 hover:text-white"
            {...getCardMotion(10)}
            {...MOVIE_FEATURE_ACTION_MOTION}
          >
            <Icon icon="solar:alt-arrow-right-linear" size={16} />
          </motion.button>
        </div>
      ) : null}
    </div>
  );
}
