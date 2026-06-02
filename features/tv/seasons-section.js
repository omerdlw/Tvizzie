'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  MovieSurfaceReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/app/(media)/movie/[id]/motion';
import { TMDB_IMG } from '@/core/constants';
import Carousel from '@/ui/media/carousel';
import SegmentedControl from '@/ui/elements/segmented-control';
import MediaCard from '@/ui/media/media-card';

function normalizeSeasonDetails(seasonDetails = []) {
  return new Map(
    (Array.isArray(seasonDetails) ? seasonDetails : [])
      .filter((season) => Number.isFinite(Number(season?.season_number)))
      .map((season) => [Number(season.season_number), season])
  );
}

function getEpisodeImage(episode) {
  return episode?.still_path ? `${TMDB_IMG}/w780${episode.still_path}` : null;
}

function getEpisodeTitle(episode) {
  return episode?.name || 'Untitled episode';
}

function getEpisodeNumber(episode, index) {
  const episodeNumber = Number(episode?.episode_number);

  return Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : index + 1;
}

function EpisodeCard({ episode, index = 0, shouldAnimateItemReveal = false }) {
  const title = getEpisodeTitle(episode);
  const cardMotion = getSurfaceItemMotion({
    enabled: shouldAnimateItemReveal,
    index,
    delayStep: 0.075,
    distance: 22,
    duration: 0.9,
    scale: 0.968,
  });

  return (
    <motion.div
      initial={cardMotion.initial}
      animate={cardMotion.animate}
      transition={cardMotion.transition}
      whileHover={{ y: -3 }}
    >
      <MediaCard
        className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
        aspectClass="aspect-video"
        imageSrc={getEpisodeImage(episode)}
        imageAlt={title}
        imageSizes="288px"
        imagePreset="feature"
        fallbackIcon="solar:panorama-bold"
        fallbackIconSize={24}
        topOverlay={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/30 to-transparent p-3 text-white">
            <p className="text-[10px] font-semibold tracking-widest text-white/72 uppercase tabular-nums">
              E{getEpisodeNumber(episode, index)}
            </p>
            <h3 className="mt-1 truncate text-sm font-bold text-white">{title}</h3>
          </div>
        }
      />
    </motion.div>
  );
}

function buildSeasonTabs(seasons, detailsBySeason) {
  return (Array.isArray(seasons) ? seasons : [])
    .filter((season) => Number(season?.season_number) > 0)
    .map((season) => {
      const seasonNumber = Number(season.season_number);
      const details = detailsBySeason.get(seasonNumber);

      return {
        details: details || season,
        key: String(seasonNumber),
        label: `S${seasonNumber}`,
      };
    });
}

export default function TvSeasonsSection({ seasonDetails = [], seasons = [] }) {
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const detailsBySeason = useMemo(() => normalizeSeasonDetails(seasonDetails), [seasonDetails]);
  const seasonTabs = useMemo(() => buildSeasonTabs(seasons, detailsBySeason), [detailsBySeason, seasons]);
  const [activeSeasonKey, setActiveSeasonKey] = useState(null);

  useEffect(() => {
    if (!seasonTabs.length) {
      setActiveSeasonKey(null);
      return;
    }

    setActiveSeasonKey((current) =>
      current && seasonTabs.some((season) => season.key === current) ? current : seasonTabs[0].key
    );
  }, [seasonTabs]);

  const activeSeason = seasonTabs.find((season) => season.key === activeSeasonKey) || seasonTabs[0] || null;
  const episodes = Array.isArray(activeSeason?.details?.episodes) ? activeSeason.details.episodes : [];
  const panelMotion = getSurfacePanelMotion();

  if (!activeSeason || !episodes.length) {
    return null;
  }

  return (
    <MovieSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl
            classNames={{
              track: ' w-auto',
              wrapper: 'p-0.5 ',
              button: '',
              indicator: '',
            }}
            items={seasonTabs}
            value={activeSeasonKey}
            onChange={setActiveSeasonKey}
          />
          <h2 className="shrink-0 text-[11px] font-semibold tracking-widest text-black/70 uppercase">Seasons</h2>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`tv-season-${activeSeason.key}`}
              initial={panelMotion.initial}
              animate={panelMotion.animate}
              exit={panelMotion.exit}
              transition={panelMotion.transition}
            >
              <Carousel gap="gap-3">
                {episodes.map((episode, index) => (
                  <EpisodeCard
                    key={episode.id || `${activeSeason.key}-${episode.episode_number || index}`}
                    episode={episode}
                    index={index}
                    shouldAnimateItemReveal={shouldAnimateItemReveal}
                  />
                ))}
              </Carousel>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MovieSurfaceReveal>
  );
}
