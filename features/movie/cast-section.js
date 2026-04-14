'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import SegmentedControl from '@/features/shared/segmented-control';
import Icon from '@/ui/icon';

const FEATURED_COUNT = 6;
const COMPACT_COUNT = 3;

function PersonImage({ person, size, quality = 72, priority = false, fetchPriority, rounded = 'rounded-lg' }) {
  const [error, setError] = useState(false);
  const src = person.profile_path && !error ? `${TMDB_IMG}/${size}${person.profile_path}` : null;

  if (!src) {
    return (
      <div className={`center h-full w-full bg-black/5 ${rounded}`}>
        <Icon icon="solar:user-bold" size={size === 'w92' ? 14 : 20} className="text-slate-600" />
      </div>
    );
  }

  return (
    <Image
      fill
      alt={person.name}
      src={src}
      sizes={size === 'w92' ? '32px' : '64px'}
      priority={priority}
      fetchPriority={fetchPriority}
      quality={quality}
      draggable={false}
      className={`object-cover ${rounded}`}
      onError={() => setError(true)}
    />
  );
}

function PersonCard({ person, compact = false, priority = false, fetchPriority }) {
  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(e) => e.preventDefault()}
      className={[
        'group bg-primary/30 hover:bg-primary/60 flex items-center gap-2 border border-black/10 backdrop-blur-sm transition-all hover:border-black/15',
        compact ? 'h-10 min-w-0 flex-1 rounded-[10px] p-1 pr-2' : 'rounded-[14px] p-1 pr-4',
      ].join(' ')}
    >
      <div className={['relative shrink-0 overflow-hidden', compact ? 'h-8 w-8' : 'h-20 w-16'].join(' ')}>
        <PersonImage
          person={person}
          size={compact ? 'w92' : 'w185'}
          quality={compact ? 70 : 72}
          priority={priority}
          fetchPriority={fetchPriority}
          rounded={compact ? 'rounded-[6px]' : 'rounded-[10px]'}
        />
      </div>

      {compact ? (
        <span className="truncate text-xs font-semibold text-black">{person.name}</span>
      ) : (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-black">{person.name}</span>
          <span className="truncate text-xs text-black/70">{person.subtitle}</span>
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
    [person?.id, person?.job, person?.department, person?.character, person?.subtitle].filter(Boolean).join('-') ||
    person?.name ||
    'person';

  return `${tabKey}-${variant}-${creditKey}-${index}`;
}

export default function CastSection({ cast = [], crew = [], headerAction = null }) {
  const reduceMotion = useReducedMotion();
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState('cast');

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
          {featured.map((person, index) => (
            <PersonCard
              key={buildPersonEntryKey(tabKey, person, index, 'featured')}
              person={person}
              priority={index < 4}
              fetchPriority={index < 4 ? 'high' : undefined}
            />
          ))}
        </div>

        {!!compact.length && (
          <div className="flex h-10 items-center gap-2">
            {compact.map((person, index) => (
              <PersonCard key={buildPersonEntryKey(tabKey, person, index, 'compact')} person={person} compact />
            ))}

            <button
              type="button"
              aria-label="Show full cast"
              onClick={handleOpenModal}
              className="center bg-primary/30 hover:bg-primary/60 size-10 shrink-0 rounded-[10px] border border-black/10 text-black/70 transition-colors hover:border-black/15 hover:text-black"
            >
              <Icon icon="solar:alt-arrow-right-linear" size={18} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="relative flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          classNames={{ track: 'rounded-xl backdrop-blur-sm',wrapper:"p-0.5" }}
          value={activeTab}
          onChange={setActiveTab}
          items={tabs.map(({ key, label }) => ({ key, label }))}
        />
        {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
      </div>

      <div className="relative overflow-hidden">
        {tabs.length === 1 ? (
          renderPanel(activeTabData.key, activeTabData.entries)
        ) : (
          <>
            <div aria-hidden="true" className="invisible">
              {renderPanel(activeTabData.key, activeTabData.entries)}
            </div>

            <div className="absolute inset-0 flex">
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.key}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ x: `${(index - activeIndex) * 100}%` }}
                  transition={
                    reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
                  }
                >
                  {renderPanel(tab.key, tab.entries)}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
