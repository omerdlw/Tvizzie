'use client';

import { useMemo, useState } from 'react';
import FilmographyCard from '../components/person/filmography-card';
import { getFilmographyCredits } from '@/domains/media/utils/person-data';
import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import SegmentedControl from '@/ui/primitives/segmented-control';
import Icon from '@/ui/primitives/icon';

export default function PersonFilmographySection({ person }) {
  const [activeTab, setActiveTab] = useState('movie');

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
    setActiveTab(nextTab);
  };

  if (!movieCredits.length && !tvCredits.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className="relative flex min-h-14 w-full items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:clapperboard-play-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Filmography
          </h2>
        </div>

        {mediaTypeItems.length > 1 ? (
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
        ) : null}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {activeCredits.map((credit, index) => (
            <FilmographyCard
              key={`${credit.media_type}-${credit.id}-${credit.credit_id || index}`}
              credit={credit}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
