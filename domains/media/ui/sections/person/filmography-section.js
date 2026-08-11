'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import FilmographyCard from '../../components/person/filmography-card';
import { getFilmographyCredits } from '@/domains/media/utils/person-data';
import SegmentedControl from '@/ui/primitives/segmented-control';
import Icon from '@/ui/primitives/icon';
import { getMediaCardProps, getSectionHeaderProps, PERSON_TIMELINES } from '@/app/(media)/motion';

export default function PersonFilmographySection({
  person,
  baseDelay = PERSON_TIMELINES.FILMOGRAPHY_BASE_DELAY,
}) {
  const [activeTab, setActiveTab] = useState('movie');
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);

  const movieCredits = useMemo(() => getFilmographyCredits(person, 'movie'), [person]);
  const tvCredits = useMemo(() => getFilmographyCredits(person, 'tv'), [person]);

  const mediaTypeItems = useMemo(() => {
    const items = [];
    if (movieCredits.length > 0) {
      items.push({
        key: 'movie',
        label: 'Movies',
        count: movieCredits.length,
      });
    }
    if (tvCredits.length > 0) {
      items.push({
        key: 'tv',
        label: 'TV Shows',
        count: tvCredits.length,
      });
    }
    return items;
  }, [movieCredits.length, tvCredits.length]);

  const activeCredits = activeTab === 'tv' && tvCredits.length > 0 ? tvCredits : movieCredits;

  const handleTabChange = (nextTab) => {
    setHasSwitchedTab(true);
    setActiveTab(nextTab);
  };

  if (!movieCredits.length && !tvCredits.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <motion.div
        {...getSectionHeaderProps(baseDelay, hasSwitchedTab, 'filmography')}
        initial={false}
        className="relative flex min-h-14 w-full items-center justify-between gap-4 px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:clapperboard-play-bold" size={20} className="text-black/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-black/70 uppercase">
            Filmography
          </h2>
        </div>

        {mediaTypeItems.length > 1 && (
          <div className="flex shrink-0 items-center">
            <SegmentedControl
              items={mediaTypeItems}
              value={activeTab}
              onChange={handleTabChange}
              renderSuffix={(item) => (
                <span className="text-[10px] opacity-60">({item.count})</span>
              )}
            />
          </div>
        )}
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </motion.div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {activeCredits.map((credit, index) => (
            <motion.div
              key={`${credit.media_type}-${credit.id}-${credit.credit_id || index}`}
              {...getMediaCardProps(index, baseDelay, hasSwitchedTab, 'filmography')}
              initial={false}
            >
              <FilmographyCard credit={credit} />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
