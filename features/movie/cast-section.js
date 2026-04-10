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

function PersonCard({ person, priority = false, fetchPriority }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = person.profile_path && !imageError ? `${TMDB_IMG}/w185${person.profile_path}` : null;

  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(event) => event.preventDefault()}
      className="group bg-primary/30 hover:bg-primary/60 flex items-center gap-2 rounded-[14px] border border-black/10 p-1 pr-4 backdrop-blur-sm transition-all duration-(--motion-duration-normal) hover:border-black/20"
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden">
        {imageSrc ? (
          <Image
            fill
            alt={person.name}
            src={imageSrc}
            sizes="64px"
            priority={priority}
            fetchPriority={fetchPriority}
            quality={72}
            draggable={false}
            className="rounded-[10px] object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={20} className="text-[#475569]" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-black">{person.name}</span>
        <span className="truncate text-xs text-black/70">{person.subtitle}</span>
      </div>
    </Link>
  );
}

function CompactPersonCard({ person, priority = false }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = person.profile_path && !imageError ? `${TMDB_IMG}/w92${person.profile_path}` : null;

  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(event) => event.preventDefault()}
      className="group bg-primary/30 hover:bg-primary/60 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-black/10 p-1 pr-2 transition-all duration-(--motion-duration-normal) hover:border-black/20"
    >
      <div className="relative size-8 shrink-0 overflow-hidden rounded-[6px] bg-black/5">
        {imageSrc ? (
          <Image
            fill
            alt={person.name}
            src={imageSrc}
            sizes="32px"
            priority={priority}
            quality={70}
            draggable={false}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={14} className="text-[#475569]" />
          </div>
        )}
      </div>

      <span className="truncate text-xs font-semibold text-black">{person.name}</span>
    </Link>
  );
}

export default function CastSection({ cast = [], crew = [], headerAction = null }) {
  const reduceMotion = useReducedMotion();
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState('cast');

  const castEntries = useMemo(
    () =>
      (cast || []).map((member) => ({
        ...member,
        subtitle: member?.character || 'Cast',
      })),
    [cast]
  );
  const crewEntries = useMemo(
    () =>
      (crew || []).map((member) => ({
        ...member,
        subtitle: member?.job || member?.department || 'Crew',
      })),
    [crew]
  );
  const hasCast = castEntries.length > 0;
  const hasCrew = crewEntries.length > 0;

  useEffect(() => {
    if (activeTab === 'cast' && !hasCast && hasCrew) {
      setActiveTab('crew');
      return;
    }

    if (activeTab === 'crew' && !hasCrew && hasCast) {
      setActiveTab('cast');
    }
  }, [activeTab, hasCast, hasCrew]);

  if (!hasCast && !hasCrew) {
    return null;
  }

  const castFeatured = castEntries.slice(0, FEATURED_COUNT);
  const castCompact = castEntries.slice(FEATURED_COUNT, FEATURED_COUNT + COMPACT_COUNT);
  const crewFeatured = crewEntries.slice(0, FEATURED_COUNT);
  const crewCompact = crewEntries.slice(FEATURED_COUNT, FEATURED_COUNT + COMPACT_COUNT);

  const handleOpenCastModal = () => {
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

  const segmentedItems = [
    ...(hasCast ? [{ key: 'cast', label: 'Cast' }] : []),
    ...(hasCrew ? [{ key: 'crew', label: 'Crew' }] : []),
  ];

  const renderPanel = (tabKey, featuredList, compactList) => {
    const hasCompactRow = compactList.length > 0;

    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {featuredList.map((person, index) => (
            <PersonCard
              key={`${tabKey}-${person.id || person.name || 'cast'}-${index}`}
              person={person}
              priority={index < 4}
              fetchPriority={index < 4 ? 'high' : undefined}
            />
          ))}
        </div>

        {hasCompactRow ? (
          <div className="flex h-10 items-center gap-2">
            {compactList.map((person, index) => (
              <CompactPersonCard key={`${tabKey}-${person.id || person.name || 'compact'}-${index}`} person={person} />
            ))}
            <button
              type="button"
              aria-label="Show full cast"
              onClick={handleOpenCastModal}
              className="center bg-primary/50 hover:bg-primary/70 size-10 shrink-0 rounded-[10px] border border-black/10 text-black/70 transition-colors hover:text-black"
            >
              <Icon icon="solar:alt-arrow-right-linear" size={18} />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="relative flex flex-col gap-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl value={activeTab} onChange={setActiveTab} items={segmentedItems} />

          {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
        </div>
      </div>
      <div className="relative overflow-hidden">
        {segmentedItems.length > 1 ? (
          <>
            <div aria-hidden="true" className="invisible">
              {activeTab === 'cast'
                ? renderPanel('cast-measure', castFeatured, castCompact)
                : renderPanel('crew-measure', crewFeatured, crewCompact)}
            </div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '0%' : '-100%' }}
              transition={
                reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
              }
            >
              {renderPanel('cast', castFeatured, castCompact)}
            </motion.div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '100%' : '0%' }}
              transition={
                reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
              }
            >
              {renderPanel('crew', crewFeatured, crewCompact)}
            </motion.div>
          </>
        ) : hasCast ? (
          renderPanel('cast', castFeatured, castCompact)
        ) : (
          renderPanel('crew', crewFeatured, crewCompact)
        )}
      </div>
    </section>
  );
}
