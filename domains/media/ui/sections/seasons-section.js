'use client';

import { useEffect, useMemo, useState } from 'react';
import { TMDB_IMG } from '@/shared';
import Carousel from '@/ui/components/media-carousel';
import SegmentedControl from '@/ui/components/segmented-control';
import MediaCard from '@/ui/components/media-card';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { useAuth } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';
import { createWatchDiarySurfaceEntry } from '@/domains/shell/navigation/surfaces/watch-diary-surface';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
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

function EpisodeCard({ episode, index = 0, onLog }) {
  const title = getEpisodeTitle(episode);
  const episodeNumber = getEpisodeNumber(episode, index);
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
      overlay={
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 text-white">
            <p className="text-xs font-semibold text-white/70 uppercase tabular-nums">
              E{episodeNumber}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-white">{title}</h3>
          </div>
          <Button
            type="button"
            aria-label={`Log ${title} to diary`}
            onClick={() => onLog?.(episode, episodeNumber)}
            className="center absolute top-2 right-2 size-11 rounded-[14px] bg-black/60 text-white ring-1 ring-white/15 transition-colors ring-inset hover:bg-black/80 hover:ring-white/50 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon="solar:calendar-add-bold" size={19} />
          </Button>
        </>
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

export default function TvSeasonsSection({ seasonDetails = [], seasons = [], series = null }) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const userId = auth.user?.id || null;
  const detailsBySeason = useMemo(() => normalizeSeasonDetails(seasonDetails), [seasonDetails]);
  const seasonTabs = useMemo(
    () => buildSeasonTabs(seasons, detailsBySeason),
    [detailsBySeason, seasons],
  );
  const [activeSeasonKey, setActiveSeasonKey] = useState(null);

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
    setActiveSeasonKey(key);
  };

  const activeSeason =
    seasonTabs.find((season) => season.key === activeSeasonKey) || seasonTabs[0] || null;
  const episodes = Array.isArray(activeSeason?.details?.episodes)
    ? activeSeason.details.episodes
    : [];
  const handleLogEpisode = (episode, episodeNumber) => {
    if (!auth.isReady) return;
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: window.location.pathname }));
      return;
    }
    if (!userId || !series?.id || !activeSeason?.key) return;
    void openSurface(
      createWatchDiarySurfaceEntry({
        episode: {
          episodeNumber,
          episodeTitle: episode?.name || null,
          id: episode?.id || null,
        },
        media: { ...series, entityType: 'tv' },
        seasonNumber: Number(activeSeason.key),
        userId,
      }),
    );
  };

  if (!activeSeason) {
    return null;
  }

  return (
    <section className="relative flex w-full flex-col">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex shrink-0 items-center gap-2.5">
          <Icon icon="solar:calendar-mark-bold" size={20} className="text-white/70" />
          <h2 className="text-xs font-semibold text-white/70 uppercase">Seasons</h2>
        </div>
        <div className="flex max-w-[calc(100%-120px)] min-w-0 items-center justify-end">
          <SegmentedControl
            value={activeSeasonKey}
            className="max-w-full"
            items={seasonTabs}
            onChange={handleTabChange}
          />
        </div>
      </div>

      <div key={`tv-season-${activeSeason.key}`} className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        {episodes.length ? (
          <Carousel gap="gap-3">
            {episodes.map((episode, index) => (
              <div
                key={episode.id || `${activeSeason.key}-${episode.episode_number || index}`}
                className="rounded-[20px]"
              >
                <EpisodeCard episode={episode} index={index} onLog={handleLogEpisode} />
              </div>
            ))}
          </Carousel>
        ) : (
          <p className="text-sm text-white/50">
            Episodes for this season are unavailable right now.
          </p>
        )}
      </div>
    </section>
  );
}
