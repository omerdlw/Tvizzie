'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MovieSurfaceReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/features/media/static-route-elements';
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
  return (
    <div>
      <MediaCard
        className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
        aspectClass="aspect-video"
        imageSrc={getEpisodeImage(episode)}
        imageAlt={title}
        imageSizes="288px"
        imagePreset="feature"
        fallbackIcon="solar:panorama-bold"
        fallbackIconSize={24}
        data-context-menu-target="movie-backdrop-card"
        data-backdrop-file-path={episode?.still_path || ''}
        topOverlay={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/30 to-transparent p-3 text-white">
            <p className="text-[10px] font-semibold tracking-widest text-white/72 uppercase tabular-nums">
              E{getEpisodeNumber(episode, index)}
            </p>
            <h3 className="mt-1 truncate text-sm font-bold text-white">{title}</h3>
          </div>
        }
      />
    </div>
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
  if (!activeSeason || !episodes.length) {
    return null;
  }
  return (
    <MovieSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <SegmentedControl
          value={activeSeasonKey}
          className={seasonTabs.length >= 16 ? 'w-full' : 'w-auto self-start'}
          classNames={{
            wrapper: seasonTabs.length >= 16 ? 'p-0.5 min-w-full' : 'p-0.5',
            button: '',
            indicator: '',
          }}
          items={seasonTabs}
          onChange={setActiveSeasonKey}
        />

        <div className="relative">
          <>
            <div key={`tv-season-${activeSeason.key}`}>
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
            </div>
          </>
        </div>
      </section>
    </MovieSurfaceReveal>
  );
}
