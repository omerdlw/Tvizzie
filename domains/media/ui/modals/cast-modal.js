'use client';

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

import { TMDB_IMG } from '@/shared/constants';
import { Container } from '@/modules/modal';
import { MODAL_LIST_ITEM_VARIANTS, MODAL_LIST_VARIANTS } from '@/modules/modal/motion';
import {
  getPreferredPersonPosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import SegmentedControl from '@/ui/primitives/segmented-control';
import Icon from '@/ui/primitives/icon';

function normalizeEntries(list, fallbackSubtitle) {
  if (!Array.isArray(list)) return [];
  return list.map((member) => ({
    ...member,
    subtitle:
      member?.subtitle ||
      member?.character ||
      member?.job ||
      member?.department ||
      fallbackSubtitle,
  }));
}

const PersonCard = memo(function PersonCard({ close, person }) {
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
      className="flex h-full w-full items-center gap-3 p-2 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-black/5 focus:outline-none"
      aria-label={`View details for ${person.name || 'Cast member'}`}
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-black/5">
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
            <Icon icon="solar:user-bold" size={16} className="text-black/50" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{person.name || 'Unknown'}</p>
        <p className="truncate text-xs text-black/70">{person.subtitle}</p>
      </div>
    </Link>
  );
});

export default function CastModal({ close, data, header }) {
  usePosterPreferenceVersion();
  const contentRef = useRef(null);

  const castEntries = useMemo(() => normalizeEntries(data?.cast, 'Cast'), [data?.cast]);
  const crewEntries = useMemo(() => normalizeEntries(data?.crew, 'Crew'), [data?.crew]);

  const hasCast = castEntries.length > 0;
  const hasCrew = crewEntries.length > 0;
  const hasBoth = hasCast && hasCrew;

  const [activeTab, setActiveTab] = useState(() =>
    data?.initialTab === 'crew' && hasCrew ? 'crew' : 'cast',
  );

  useEffect(() => {
    if (activeTab === 'cast' && !hasCast && hasCrew) setActiveTab('crew');
    if (activeTab === 'crew' && !hasCrew && hasCast) setActiveTab('cast');
  }, [activeTab, hasCast, hasCrew]);

  const resolvedHeader = useMemo(() => {
    const base = header && typeof header === 'object' && !Array.isArray(header) ? header : {};
    if (!hasBoth) return { ...base, showClose: false };

    return {
      ...base,
      showClose: false,
      center: (
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'cast', label: 'Cast' },
            { key: 'crew', label: 'Crew' },
          ]}
          classNames={{ wrapper: 'h-8' }}
        />
      ),
    };
  }, [header, hasBoth, activeTab]);

  const activeEntries = activeTab === 'cast' ? castEntries : crewEntries;

  return (
    <Container
      className="max-h-[85vh] w-[min(94vw,980px)]"
      close={close}
      header={resolvedHeader}
      bodyClassName="bg-transparent p-0"
    >
      <div ref={contentRef} className="relative min-h-32 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={MODAL_LIST_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 divide-x divide-y divide-black/10 sm:grid-cols-2 lg:grid-cols-3"
          >
            {activeEntries.map((person, index) => (
              <motion.div
                key={`${activeTab}-${person.id || ''}-${index}`}
                variants={MODAL_LIST_ITEM_VARIANTS}
                custom={index}
                initial="hidden"
                animate="visible"
              >
                <PersonCard close={close} person={person} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </Container>
  );
}
