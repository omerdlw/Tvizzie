'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Container from '@/core/modules/modal/container';
import SegmentedControl from '@/features/shared/segmented-control';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const DESKTOP_COLUMNS = 3;
const GRID_CLASS =
  'grid grid-cols-1 divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x-0 lg:divide-y-0';

const SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.75,
};

function normalizeEntries(list, fallbackKey) {
  return (Array.isArray(list) ? list : []).map((member) => ({
    ...member,
    subtitle: member?.subtitle || member?.character || member?.job || member?.department || fallbackKey,
  }));
}

function PersonCard({ close, person }) {
  const [imageError, setImageError] = useState(false);

  if (!person?.id) return null;

  const imageSrc = person.profile_path && !imageError ? `${TMDB_IMG}/w185${person.profile_path}` : null;

  return (
    <Link
      href={`/person/${person.id}`}
      onClick={close}
      className="bg-primary/40 hover:bg-primary/60 flex items-center gap-3 p-2 transition-colors"
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[10px] bg-black/5">
        {imageSrc ? (
          <Image
            fill
            src={imageSrc}
            alt={person.name || 'Cast member'}
            sizes="44px"
            quality={72}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={18} className="text-black/50" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{person.name || 'Unknown'}</p>
        <p className="truncate text-xs text-black/70">{person.subtitle}</p>
      </div>
    </Link>
  );
}

function CreditsGrid({ close, list, keyPrefix }) {
  const lastRowStart = list.length - (list.length % DESKTOP_COLUMNS || DESKTOP_COLUMNS);

  return (
    <div className={GRID_CLASS}>
      {list.map((person, index) => (
        <div
          key={`${keyPrefix}-${person.id || person.name || 'credit'}-${index}`}
          className={cn(
            'lg:border-black/10',
            (index + 1) % DESKTOP_COLUMNS !== 0 && 'lg:border-r',
            index < lastRowStart && 'lg:border-b'
          )}
        >
          <PersonCard close={close} person={person} />
        </div>
      ))}
    </div>
  );
}

export default function CastModal({ close, data, header }) {
  const reduceMotion = useReducedMotion();
  const contentRef = useRef(null);

  const castEntries = useMemo(() => normalizeEntries(data?.cast, 'Cast'), [data?.cast]);
  const crewEntries = useMemo(() => normalizeEntries(data?.crew, 'Crew'), [data?.crew]);

  const hasCast = castEntries.length > 0;
  const hasCrew = crewEntries.length > 0;
  const hasBoth = hasCast && hasCrew;

  const [activeTab, setActiveTab] = useState(data?.initialTab === 'crew' && hasCrew ? 'crew' : 'cast');

  useEffect(() => {
    if (activeTab === 'cast' && !hasCast && hasCrew) setActiveTab('crew');
    if (activeTab === 'crew' && !hasCrew && hasCast) setActiveTab('cast');
  }, [activeTab, hasCast, hasCrew]);

  useEffect(() => {
    const host = contentRef.current;
    const scrollContainer = host?.closest('[data-lenis-prevent-wheel]');
    scrollContainer?.scrollTo?.({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const isEdgePosition = header?.position === 'top' || header?.position === 'bottom';
  const items = [
    ...(hasCast ? [{ key: 'cast', label: 'Cast' }] : []),
    ...(hasCrew ? [{ key: 'crew', label: 'Crew' }] : []),
  ];

  const resolvedHeader = {
    ...((header && typeof header === 'object' && !Array.isArray(header) ? header : {}) || {}),
    showClose: false,
    ...(hasBoth && {
      center: (
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          items={items}
          classNames={{
            wrapper: 'h-8 rounded-[12px] p-0.5',
            indicator: 'rounded-[9px]',
          }}
        />
      ),
    }),
  };

  const transition = reduceMotion ? { duration: 0.14 } : SPRING_TRANSITION;

  if (!hasCast && !hasCrew) {
    return (
      <Container
        className={cn('max-h-[85vh]', isEdgePosition ? 'w-full' : 'w-[min(94vw,980px)]')}
        close={close}
        header={resolvedHeader}
        bodyClassName="bg-transparent p-0"
      >
        <div className="center min-h-32 text-sm text-black/70">No credits found.</div>
      </Container>
    );
  }

  return (
    <Container
      className={cn('max-h-[85vh]', isEdgePosition ? 'w-full' : 'w-[min(94vw,980px)]')}
      close={close}
      header={resolvedHeader}
      bodyClassName="bg-transparent p-0"
    >
      <div ref={contentRef} className="relative overflow-hidden">
        {!hasBoth ? (
          <CreditsGrid close={close} list={hasCast ? castEntries : crewEntries} keyPrefix={hasCast ? 'cast' : 'crew'} />
        ) : (
          <>
            <div aria-hidden="true" className="invisible">
              <CreditsGrid
                close={close}
                list={activeTab === 'cast' ? castEntries : crewEntries}
                keyPrefix={`${activeTab}-measure`}
              />
            </div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '0%' : '-100%' }}
              transition={transition}
            >
              <CreditsGrid close={close} list={castEntries} keyPrefix="cast" />
            </motion.div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '100%' : '0%' }}
              transition={transition}
            >
              <CreditsGrid close={close} list={crewEntries} keyPrefix="crew" />
            </motion.div>
          </>
        )}
      </div>
    </Container>
  );
}
