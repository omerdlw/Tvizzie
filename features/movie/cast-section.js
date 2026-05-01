'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { resolveImageFetchPriority, resolveImageLoading, resolveImageQuality } from '@/core/utils';
import { getPreferredPersonPosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import {
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/app/(media)/movie/[id]/motion';
import SegmentedControl from '@/ui/elements/segmented-control';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

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
        <Icon icon="solar:user-bold" size={size === 'w92' ? 14 : 20} className="text-black/50" />
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
      className={[
        'group bg-primary/30 hover:bg-primary/60 flex items-center gap-3 border border-black/10 backdrop-blur-xs transition-all hover:border-black/15',
        compact ? 'h-10 min-w-0 flex-1 p-1 pr-2' : 'p-1 pr-4',
      ].join(' ')}
    >
      <motion.div
        className={['relative shrink-0 overflow-hidden', compact ? 'h-8 w-8' : 'h-20 w-16'].join(' ')}
        initial={{ opacity: 0, scale: 0.92, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: compact ? 0.56 : 0.68, ease: [0.22, 1, 0.36, 1] }}
      >
        <PersonImage
          person={person}
          size={compact ? 'w92' : 'w185'}
          quality={compact ? 70 : 72}
          priority={priority}
          fetchPriority={fetchPriority}
        />
      </motion.div>

      {compact ? (
        <motion.span
          className="truncate text-xs font-semibold text-black"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {person.name}
        </motion.span>
      ) : (
        <motion.div
          className="flex min-w-0 flex-col"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span className="truncate text-sm font-semibold text-black">{person.name}</motion.span>
          <motion.span className="truncate text-xs text-black/70">{person.subtitle}</motion.span>
        </motion.div>
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
    [person?.id, person?.job, person?.department, person?.character, person?.subtitle].filter(Boolean).join('-') ||
    person?.name ||
    'person';

  return `${tabKey}-${variant}-${creditKey}-${index}`;
}

export default function CastSection({ cast = [], crew = [], headerAction = null }) {
  usePosterPreferenceVersion();
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState('cast');
  const panelMotion = getSurfacePanelMotion();

  const castEntries = useMemo(() => buildEntries(cast, 'character'), [cast]);
  const crewEntries = useMemo(
    () =>
      crew.map((item) => ({
        ...item,
        subtitle: item?.job || item?.department || 'Crew',
      })),
    [crew]
  );

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

  const renderPanel = (tabKey, entries) => {
    const { featured, compact } = splitEntries(entries);

    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {featured.map((person, index) => {
            const cardMotion = getSurfaceItemMotion({
              enabled: shouldAnimateItemReveal,
              index,
              delayStep: 0.075,
              distance: 26,
              duration: 0.92,
              scale: 0.966,
            });

            return (
              <motion.div
                key={buildPersonEntryKey(tabKey, person, index, 'featured')}
                initial={cardMotion.initial}
                animate={cardMotion.animate}
                transition={cardMotion.transition}
              >
                <PersonCard person={person} priority={index < 4} fetchPriority={index < 4 ? 'high' : undefined} />
              </motion.div>
            );
          })}
        </div>

        {!!compact.length && (
          <div className="flex h-10 items-center gap-2">
            {compact.map((person, index) => {
              const compactMotion = getSurfaceItemMotion({
                enabled: shouldAnimateItemReveal,
                index,
                groupIndex: 1,
                delayStep: 0.06,
                distance: 18,
                duration: 0.8,
                scale: 0.978,
              });

              // Hide the third pill on small screens to ensure the action button fits.
              const responsiveClass = index > 1 ? 'hidden sm:block' : '';

              return (
                <motion.div
                  key={buildPersonEntryKey(tabKey, person, index, 'compact')}
                  initial={compactMotion.initial}
                  animate={compactMotion.animate}
                  transition={compactMotion.transition}
                  className={`min-w-0 flex-1 ${responsiveClass}`}
                >
                  <PersonCard person={person} compact />
                </motion.div>
              );
            })}

            <motion.button
              type="button"
              aria-label="Show full cast"
              onClick={handleOpenModal}
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.72, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="center bg-primary/30 hover:bg-primary/60 size-10 shrink-0 border border-black/10 text-black/70 transition-colors hover:border-black/15 hover:text-black"
            >
              <Icon icon="solar:alt-arrow-right-linear" size={16} />
            </motion.button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="movie-detail-section-content relative w-full">
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          classNames={{
            wrapper: 'p-0.5  backdrop-blur-xs bg-black/5 border border-black/10',
            indicator: 'bg-primary',
          }}
          value={activeTab}
          onChange={setActiveTab}
          items={tabs.map(({ key, label }) => ({ key, label }))}
        />
        {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
      </div>

      <div className="relative w-full overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTabData.key}
            initial={tabs.length > 1 ? panelMotion.initial : false}
            animate={panelMotion.animate}
            exit={tabs.length > 1 ? panelMotion.exit : undefined}
            transition={panelMotion.transition}
            className="w-full"
          >
            {renderPanel(activeTabData.key, activeTabData.entries)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
