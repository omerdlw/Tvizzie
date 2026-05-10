'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Container from '@/core/modules/modal/container';
import { getPreferredPersonPosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import SegmentedControl from '@/ui/elements/segmented-control';
import { cn } from '@/core/utils';
import { FEATURE_MODAL_CONTENT_MOTION, FEATURE_MODAL_EMPTY_MOTION, getFeatureModalItemMotion } from '@/features/motion';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

const DESKTOP_COLUMNS = 3;
const GRID_CLASS =
  'grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x-0 lg:divide-y-0';

function normalizeEntries(list, fallbackKey) {
  return (Array.isArray(list) ? list : []).map((member) => ({
    ...member,
    subtitle: member?.subtitle || member?.character || member?.job || member?.department || fallbackKey,
  }));
}

function PersonCard({ close, person }) {
  const [imageError, setImageError] = useState(false);

  if (!person?.id) return null;

  const imageSrc = !imageError
    ? getPreferredPersonPosterSrc(person, 'w185') ||
      (person.profile_path ? `${TMDB_IMG}/w185${person.profile_path}` : null)
    : null;

  return (
    <Link href={`/person/${person.id}`} onClick={close} className="flex items-center gap-3 p-2">
      <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-white/10">
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
            <Icon icon="solar:user-bold" size={18} className="text-white/50" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{person.name || 'Unknown'}</p>
        <p className="truncate text-xs text-white/70">{person.subtitle}</p>
      </div>
    </Link>
  );
}

function CreditsGrid({ close, list, keyPrefix }) {
  const lastRowStart = list.length - (list.length % DESKTOP_COLUMNS || DESKTOP_COLUMNS);

  return (
    <div className={GRID_CLASS}>
      {list.map((person, index) => (
        <motion.div
          key={`${keyPrefix}-${person.id || person.name || 'credit'}-${index}`}
          {...getFeatureModalItemMotion(index)}
        >
          <div
            className={cn('border-white/10', (index + 1) % DESKTOP_COLUMNS !== 0 && 'lg:border-r', index < lastRowStart && 'lg:border-b')}
          >
            <PersonCard close={close} person={person} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function CastModal({ close, data, header }) {
  usePosterPreferenceVersion();
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
          equalItems
          value={activeTab}
          onChange={setActiveTab}
          items={items}
          classNames={{
            track: 'w-full',
            wrapper: 'w-full backdrop-blur',
          }}
        />
      ),
    }),
  };

  if (!hasCast && !hasCrew) {
    return (
      <Container
        className={cn('max-h-[85vh]', isEdgePosition ? 'w-full' : 'w-[min(94vw,980px)]')}
        close={close}
      header={resolvedHeader}
      bodyClassName="bg-transparent p-0"
    >
        <motion.div {...FEATURE_MODAL_EMPTY_MOTION}>
          <div className="text-white-soft center min-h-32 text-sm">No credits found.</div>
        </motion.div>
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
      <motion.div ref={contentRef} className="relative overflow-hidden" {...FEATURE_MODAL_CONTENT_MOTION}>
        <AnimatePresence initial={false} mode="wait">
          {activeTab === 'cast' ? (
            <motion.div key="cast" {...FEATURE_MODAL_CONTENT_MOTION}>
              <CreditsGrid close={close} list={castEntries} keyPrefix="cast" />
            </motion.div>
          ) : (
            <motion.div key="crew" {...FEATURE_MODAL_CONTENT_MOTION}>
              <CreditsGrid close={close} list={crewEntries} keyPrefix="crew" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Container>
  );
}
