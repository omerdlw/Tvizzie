'use client';

import { useEffect, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Container from '@/core/modules/modal/container';
import { cn } from '@/core/utils';
import { getPreferredPersonPosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';

import AdaptiveImage from '@/ui/elements/adaptive-image';
import SegmentedControl from '@/ui/elements/segmented-control';
import Icon from '@/ui/icon';

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const DESKTOP_COLUMNS = 3;

const GRID_CLASS =
  'grid grid-cols-1 divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x-0 lg:divide-y-0';

const SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.75,
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalizeEntries(list, fallbackSubtitle) {
  return (Array.isArray(list) ? list : []).map((member) => ({
    ...member,
    subtitle: member?.subtitle || member?.character || member?.job || member?.department || fallbackSubtitle,
  }));
}

function createHeader({ header, hasBoth, activeTab, setActiveTab }) {
  const resolvedHeader = header && typeof header === 'object' && !Array.isArray(header) ? header : {};

  if (!hasBoth) {
    return { ...resolvedHeader, showClose: false };
  }

  return {
    ...resolvedHeader,
    showClose: false,
    center: (
      <SegmentedControl
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'cast', label: 'Cast' },
          { key: 'crew', label: 'Crew' },
        ]}
        classNames={{
          wrapper: 'h-8 rounded-[12px] p-0.5',
          indicator: 'rounded-[9px]',
        }}
      />
    ),
  };
}

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function CastModal({ close, data, header }) {
  usePosterPreferenceVersion();

  const contentRef = useRef(null);

  // Derived Values
  const castEntries = normalizeEntries(data?.cast, 'Cast');
  const crewEntries = normalizeEntries(data?.crew, 'Crew');

  const hasCast = castEntries.length > 0;
  const hasCrew = crewEntries.length > 0;
  const hasBoth = hasCast && hasCrew;

  // State
  const [activeTab, setActiveTab] = useState(() => (data?.initialTab === 'crew' && hasCrew ? 'crew' : 'cast'));

  // Effects
  useEffect(() => {
    if (activeTab === 'cast' && !hasCast && hasCrew) setActiveTab('crew');
    if (activeTab === 'crew' && !hasCrew && hasCast) setActiveTab('cast');
  }, [activeTab, hasCast, hasCrew]);

  useEffect(() => {
    const scrollContainer = contentRef.current?.closest('[data-lenis-prevent-wheel]');
    scrollContainer?.scrollTo?.({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  // Derived View Values
  const isEdgePosition = header?.position === 'top' || header?.position === 'bottom';
  const containerClassName = cn('max-h-[85vh]', isEdgePosition ? 'w-full' : 'w-[min(94vw,980px)]');
  const resolvedHeader = createHeader({ header, hasBoth, activeTab, setActiveTab });
  const activeEntries = activeTab === 'cast' ? castEntries : crewEntries;

  return (
    <ModalView
      close={close}
      contentRef={contentRef}
      containerClassName={containerClassName}
      resolvedHeader={resolvedHeader}
      hasCast={hasCast}
      hasCrew={hasCrew}
      hasBoth={hasBoth}
      castEntries={castEntries}
      crewEntries={crewEntries}
      activeEntries={activeEntries}
      activeTab={activeTab}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({
  close,
  contentRef,
  containerClassName,
  resolvedHeader,
  hasCast,
  hasCrew,
  hasBoth,
  castEntries,
  crewEntries,
  activeEntries,
  activeTab,
}) {
  if (!hasCast && !hasCrew) {
    return (
      <Container className={containerClassName} close={close} header={resolvedHeader} bodyClassName="bg-transparent p-0">
        <div className="center min-h-32 text-sm text-black/70">No credits found.</div>
      </Container>
    );
  }

  return (
    <Container className={containerClassName} close={close} header={resolvedHeader} bodyClassName="bg-transparent p-0">
      <div ref={contentRef} className="relative overflow-hidden">
        {!hasBoth ? (
          <CreditsGrid close={close} list={activeEntries} keyPrefix={activeTab} />
        ) : (
          <>
            <div aria-hidden="true" className="invisible">
              <CreditsGrid close={close} list={activeEntries} keyPrefix={`${activeTab}-measure`} />
            </div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '0%' : '-100%' }}
              transition={SPRING_TRANSITION}
            >
              <CreditsGrid close={close} list={castEntries} keyPrefix="cast" />
            </motion.div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: activeTab === 'cast' ? '100%' : '0%' }}
              transition={SPRING_TRANSITION}
            >
              <CreditsGrid close={close} list={crewEntries} keyPrefix="crew" />
            </motion.div>
          </>
        )}
      </div>
    </Container>
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

function PersonCard({ close, person }) {
  const [imageError, setImageError] = useState(false);

  if (!person?.id) return null;

  const imageSrc = !imageError
    ? getPreferredPersonPosterSrc(person, 'w185') ||
      (person.profile_path ? `${TMDB_IMG}/w185${person.profile_path}` : null)
    : null;

  return (
    <Link
      href={`/person/${person.id}`}
      onClick={close}
      className="bg-primary/40 hover:bg-primary/60 flex items-center gap-3 p-2 transition-colors"
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[10px] bg-black/5">
        {imageSrc ? (
          <AdaptiveImage
            fill
            src={imageSrc}
            alt={person.name || 'Cast member'}
            sizes="44px"
            quality={72}
            className="object-cover"
            onError={() => setImageError(true)}
            wrapperClassName="h-full w-full"
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
