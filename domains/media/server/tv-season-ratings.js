import 'server-only';

import { cache } from 'react';

const SERIES_GRAPH_BASE_URL = 'https://seriesgraph.com/api/shows';
const SEASON_RATINGS_REVALIDATE_SECONDS = 60 * 60 * 12;

function isValidShowId(showId) {
  return /^\d+$/.test(String(showId || ''));
}

function normalizeEpisode(episode = {}) {
  const episodeNumber = Number(episode?.episode_number ?? episode?.tmdb_episode_number);
  const rating = Number(episode?.imdb_rating ?? episode?.vote_average);

  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0 || !Number.isFinite(rating)) {
    return null;
  }

  return {
    episodeNumber,
    rating,
    title: typeof episode?.name === 'string' ? episode.name : null,
    votes: Number.isFinite(Number(episode?.imdb_votes ?? episode?.num_votes))
      ? Number(episode.imdb_votes ?? episode.num_votes)
      : null,
    source: 'imdb',
  };
}

function normalizeTmdbEpisode(episode = {}) {
  const episodeNumber = Number(episode?.episode_number);
  const rating = Number(episode?.vote_average);

  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0 || !Number.isFinite(rating)) {
    return null;
  }

  return {
    episodeNumber,
    rating,
    title: typeof episode?.name === 'string' ? episode.name : null,
    votes: Number.isFinite(Number(episode?.vote_count)) ? Number(episode.vote_count) : null,
    source: 'tmdb',
  };
}

function normalizeSeason(season = {}) {
  const episodes = (Array.isArray(season?.episodes) ? season.episodes : [])
    .map(normalizeEpisode)
    .filter(Boolean)
    .sort((left, right) => left.episodeNumber - right.episodeNumber);

  const firstEpisode = Array.isArray(season?.episodes) ? season.episodes[0] : null;
  const seasonNumber = Number(season?.season_number ?? firstEpisode?.season_number);

  return episodes.length && Number.isFinite(seasonNumber) && seasonNumber > 0
    ? { seasonNumber, episodes }
    : null;
}

export const getTvSeasonRatings = cache(async (showId) => {
  if (!isValidShowId(showId)) {
    return [];
  }

  try {
    const response = await fetch(`${SERIES_GRAPH_BASE_URL}/${showId}/season-ratings`, {
      next: {
        revalidate: SEASON_RATINGS_REVALIDATE_SECONDS,
        tags: [`seriesgraph:season-ratings:${showId}`],
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return (Array.isArray(data) ? data : [])
      .map(normalizeSeason)
      .filter(Boolean)
      .sort((left, right) => left.seasonNumber - right.seasonNumber);
  } catch {
    return [];
  }
});

export function mergeTvSeasonRatings({ ratings = [], seasonDetails = [], seasons = [] } = {}) {
  const primaryBySeason = new Map(
    (Array.isArray(ratings) ? ratings : []).map((season) => [season.seasonNumber, season]),
  );
  const fallbackBySeason = new Map(
    (Array.isArray(seasonDetails) ? seasonDetails : [])
      .map((season) => {
        const seasonNumber = Number(season?.season_number);
        const episodes = (Array.isArray(season?.episodes) ? season.episodes : [])
          .map(normalizeTmdbEpisode)
          .filter(Boolean);

        return Number.isFinite(seasonNumber) && seasonNumber > 0 ? [seasonNumber, episodes] : null;
      })
      .filter(Boolean),
  );
  const expectedBySeason = new Map(
    (Array.isArray(seasons) ? seasons : [])
      .map((season) => [Number(season?.season_number), Number(season?.episode_count)])
      .filter(([seasonNumber, episodeCount]) => seasonNumber > 0 && episodeCount > 0),
  );
  const seasonNumbers = new Set([
    ...primaryBySeason.keys(),
    ...fallbackBySeason.keys(),
    ...expectedBySeason.keys(),
  ]);

  return [...seasonNumbers]
    .sort((left, right) => left - right)
    .map((seasonNumber) => {
      const primary = primaryBySeason.get(seasonNumber)?.episodes || [];
      const fallback = fallbackBySeason.get(seasonNumber) || [];
      const episodes = new Map(fallback.map((episode) => [episode.episodeNumber, episode]));

      primary.forEach((episode) => episodes.set(episode.episodeNumber, episode));

      return {
        seasonNumber,
        expectedEpisodeCount: expectedBySeason.get(seasonNumber) || episodes.size,
        episodes: [...episodes.values()].sort(
          (left, right) => left.episodeNumber - right.episodeNumber,
        ),
      };
    })
    .filter((season) => season.episodes.length);
}
