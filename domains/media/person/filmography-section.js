'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import FilmographyCard from '@/domains/media/person/filmography-card';
import { getFilmographyCredits } from '@/domains/media/person/person-data';
import SegmentedControl from '@/ui/primitives/segmented-control';
import {
  getMediaCardProps,
  getSectionHeaderProps,
  PERSON_TIMELINES,
} from '@/app/(media)/motion';

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
    <section className="flex flex-col gap-4">
      <motion.div
        {...getSectionHeaderProps(baseDelay, hasSwitchedTab)}
        className="flex items-center justify-between gap-3"
      >
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">
          Filmography
        </h2>

        {mediaTypeItems.length > 1 && (
          <SegmentedControl
            items={mediaTypeItems}
            value={activeTab}
            onChange={handleTabChange}
            renderSuffix={(item) => (
              <span className="text-[10px] opacity-60">({item.count})</span>
            )}
          />
        )}
      </motion.div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {activeCredits.map((credit, index) => (
          <motion.div
            key={`${credit.media_type}-${credit.id}-${credit.credit_id || index}`}
            {...getMediaCardProps(index, baseDelay, hasSwitchedTab)}
          >
            <FilmographyCard
              credit={credit}
              imagePriority={index < 8}
              imageFetchPriority={index < 8 ? 'high' : undefined}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
