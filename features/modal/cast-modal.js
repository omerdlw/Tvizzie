'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Container from '@/core/modules/modal/container';
import SegmentedControl from '@/features/shared/segmented-control';
import Icon from '@/ui/icon';

const DESKTOP_COLUMNS = 3;

function CastGridCard({ close, person }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = person?.profile_path && !imageError ? `${TMDB_IMG}/w185${person.profile_path}` : null;

  if (!person?.id) {
    return null;
  }

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
            alt={person.name || 'Cast member'}
            src={imageSrc}
            sizes="44px"
            quality={72}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={18} className="text-[#475569]" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{person.name || 'Unknown'}</p>
        <p className="truncate text-xs text-black/70">{person.subtitle || person.character || person.job || 'Cast'}</p>
      </div>
    </Link>
  );
}

export default function CastModal({ close, data, header }) {
  const reduceMotion = useReducedMotion();
  const contentRef = useRef(null);
  const isEdgePosition = header?.position === 'bottom' || header?.position === 'top';
  const castEntries = useMemo(
    () =>
      (Array.isArray(data?.cast) ? data.cast : []).map((member) => ({
        ...member,
        subtitle: member?.subtitle || member?.character || 'Cast',
      })),
    [data?.cast]
  );
  const crewEntries = useMemo(
    () =>
      (Array.isArray(data?.crew) ? data.crew : []).map((member) => ({
        ...member,
        subtitle: member?.subtitle || member?.job || member?.department || 'Crew',
      })),
    [data?.crew]
  );
  const [activeTab, setActiveTab] = useState(data?.initialTab === 'crew' && crewEntries.length > 0 ? 'crew' : 'cast');
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

  useEffect(() => {
    const host = contentRef.current;
    if (!host) {
      return;
    }

    const scrollContainer = host.closest('[data-lenis-prevent-wheel]');
    if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  const segmentedItems = [
    ...(hasCast ? [{ key: 'cast', label: 'Cast' }] : []),
    ...(hasCrew ? [{ key: 'crew', label: 'Crew' }] : []),
  ];
  const resolvedHeader =
    segmentedItems.length > 1
      ? {
          ...((header && typeof header === 'object' && !Array.isArray(header) ? header : {}) || {}),
          showClose: false,
          center: <SegmentedControl value={activeTab} onChange={setActiveTab} items={segmentedItems} />,
        }
      : {
          ...((header && typeof header === 'object' && !Array.isArray(header) ? header : {}) || {}),
          showClose: false,
        };

  const renderGrid = (list, keyPrefix) => {
    const desktopLastRowStart = list.length - (list.length % DESKTOP_COLUMNS || DESKTOP_COLUMNS);

    return (
      <div className="grid grid-cols-1 divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x-0 lg:divide-y-0">
        {list.map((person, index) => {
          const isDesktopLastColumn = (index + 1) % DESKTOP_COLUMNS === 0;
          const isDesktopLastRow = index >= desktopLastRowStart;

          return (
            <div
              key={`${keyPrefix}-${person.id || person.name || 'cast-modal'}-${index}`}
              className={[
                'lg:border-black/10',
                !isDesktopLastColumn ? 'lg:border-r' : null,
                !isDesktopLastRow ? 'lg:border-b' : null,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <CastGridCard close={close} person={person} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Container
      className={`max-h-[85vh] ${isEdgePosition ? 'w-full' : 'w-[min(94vw,980px)]'}`}
      close={close}
      header={resolvedHeader}
      bodyClassName="p-0 bg-transparent"
    >
      {castEntries.length > 0 || crewEntries.length > 0 ? (
        <div ref={contentRef} className="relative overflow-hidden">
          {segmentedItems.length > 1 ? (
            <>
              <div aria-hidden="true" className="invisible">
                {activeTab === 'cast'
                  ? renderGrid(castEntries, 'cast-measure')
                  : renderGrid(crewEntries, 'crew-measure')}
              </div>

              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={{ x: activeTab === 'cast' ? '0%' : '-100%' }}
                transition={
                  reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
                }
              >
                {renderGrid(castEntries, 'cast')}
              </motion.div>

              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={{ x: activeTab === 'cast' ? '100%' : '0%' }}
                transition={
                  reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
                }
              >
                {renderGrid(crewEntries, 'crew')}
              </motion.div>
            </>
          ) : hasCast ? (
            renderGrid(castEntries, 'cast')
          ) : (
            renderGrid(crewEntries, 'crew')
          )}
        </div>
      ) : (
        <div className="center min-h-32 text-sm text-black/70">No credits found.</div>
      )}
    </Container>
  );
}
