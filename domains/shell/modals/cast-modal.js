'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import { TMDB_IMG } from '@/shared';
import { Container } from '@/modules/modal';
import { MODAL_LIST_ITEM_VARIANTS, MODAL_LIST_VARIANTS } from '@/modules/modal';
import {
  getPreferredPersonPosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import AdaptiveImage from '@/ui/components/adaptive-image';
import SegmentedControl from '@/ui/components/segmented-control';
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
      className="group flex h-full w-full items-center gap-3 rounded-[16px] ring-1 ring-inset ring-white/5 bg-white/5 p-2 transition-all duration-300 ease-in-out hover:ring-white/10 hover:bg-white/10 focus:outline-none"
      aria-label={`View details for ${person.name || 'Cast member'}`}
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[12px] ring-1 ring-inset ring-white/5 bg-white/5">
        {imageSrc ? (
          <AdaptiveImage
            fill
            src={imageSrc}
            alt={person.name || 'Cast member'}
            sizes="44px"
            quality={72}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            onError={() => setImageError(true)}
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={16} className="text-white/50" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{person.name || 'Unknown'}</p>
        <p className="truncate text-xs text-white/70">{person.subtitle}</p>
      </div>
    </Link>
  );
});

export default function CastModal({ close, data, header }) {
  usePosterPreferenceVersion();

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
    if (!hasBoth) {
      return {
        ...base,
        showClose: true,
        title: hasCast ? 'Cast' : 'Crew',
      };
    }

    return {
      ...base,
      showClose: true,
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
  }, [header, hasBoth, activeTab, hasCast]);

  const activeEntries = activeTab === 'cast' ? castEntries : crewEntries;

  return (
    <Container
      className="max-h-[85vh] w-[min(94vw,980px)]"
      close={close}
      header={resolvedHeader}
      bodyClassName="modal-body p-3.5 sm:p-4"
    >
      <div className="relative min-h-32">
        <AnimatePresence mode="wait" initial={false}>
          {activeEntries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="center flex-col gap-2 py-16 text-center"
            >
              <Icon icon="solar:users-group-two-rounded-bold" size={32} className="text-white/50" />
              <p className="text-sm font-medium text-white/50">
                No {activeTab === 'cast' ? 'cast' : 'crew'} information available
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
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
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
}
