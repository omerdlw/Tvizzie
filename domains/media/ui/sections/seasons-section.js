'use client';

import { useEffect, useMemo, useState } from 'react';
import { TMDB_IMG } from '@/shared/constants';
import Carousel from '@/domains/media/ui/components/media-carousel';
import SegmentedControl from '@/ui/primitives/segmented-control';
import MediaCard from '@/domains/media/ui/components/media-card';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { MediaRouteReveal } from '@/app/(media)/motion';
function normalizeSeasonDetails(seasonDetails = []) {
  return new Map(
    (Array.isArray(seasonDetails) ? seasonDetails : [])
      .filter((season) => Number.isFinite(Number(season?.season_number)))
      .map((season) => [Number(season.season_number), season]),
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

function EpisodeCard({ episode, index = 0 }) {
  const title = getEpisodeTitle(episode);
  return (
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white">
          <p className="text-[10px] font-semibold tracking-widest text-white/70 uppercase tabular-nums">
            E{getEpisodeNumber(episode, index)}
          </p>
          <h3 className="mt-1 truncate text-sm font-bold text-white">{title}</h3>
        </div>
      }
    />
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

export default function TvSeasonsSection({ seasonDetails = [], seasons = [], baseDelay = 0 }) {
  const detailsBySeason = useMemo(() => normalizeSeasonDetails(seasonDetails), [seasonDetails]);
  const seasonTabs = useMemo(
    () => buildSeasonTabs(seasons, detailsBySeason),
    [detailsBySeason, seasons],
  );
  const [activeSeasonKey, setActiveSeasonKey] = useState(null);
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);

  useEffect(() => {
    if (!seasonTabs.length) {
      setActiveSeasonKey(null);
      return;
    }
    setActiveSeasonKey((current) =>
      current && seasonTabs.some((season) => season.key === current) ? current : seasonTabs[0].key,
    );
  }, [seasonTabs]);

  const handleTabChange = (key) => {
    setHasSwitchedTab(true);
    setActiveSeasonKey(key);
  };

  const activeSeason =
    seasonTabs.find((season) => season.key === activeSeasonKey) || seasonTabs[0] || null;
  const episodes = Array.isArray(activeSeason?.details?.episodes)
    ? activeSeason.details.episodes
    : [];

  if (!activeSeason) {
    return null;
  }

  return (
    <section className="relative w-full border-b border-black/10">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:calendar-mark-bold" size={20} className="text-black/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-black/70 uppercase">
            Seasons
          </h2>
        </div>
        <div className="flex shrink-0 items-center">
          <SegmentedControl
            value={activeSeasonKey}
            className={seasonTabs.length >= 16 ? 'w-full' : 'w-auto self-start'}
            classNames={{
              wrapper: seasonTabs.length >= 16 ? 'min-w-full' : '',
            }}
            items={seasonTabs}
            onChange={handleTabChange}
          />
        </div>
      </div>

      <div key={`tv-season-${activeSeason.key}`} className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        {episodes.length ? (
          <Carousel gap="gap-3">
            {episodes.map((episode, index) => (
              <MediaRouteReveal
                key={episode.id || `${activeSeason.key}-${episode.episode_number || index}`}
                stage="items.seasons"
                deferred
                interactive
                itemIndex={index}
              >
                <EpisodeCard episode={episode} index={index} />
              </MediaRouteReveal>
            ))}
          </Carousel>
        ) : (
          <p className="text-sm text-black/50">
            Episodes for this season are unavailable right now.
          </p>
        )}
      </div>
    </section>
  );
}
