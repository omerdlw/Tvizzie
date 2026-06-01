import 'server-only';

import { cache } from 'react';

import {
  sanitizeMovieDetail,
  sanitizePersonDetail,
  sanitizeTvDetail,
  sanitizeTvResults,
} from '@/core/clients/tmdb/sanitize';

import { TMDB_REVALIDATE } from './config';
import { getEntityDetail } from './detail-id.server';
import { tmdbRequest } from './request';
import { withMediaType } from './search-ranking';
import { sanitizeMovieResultsWithRuntime } from './runtime-sanitize.server';

export const getMovieBase = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['credits', 'keywords', 'release_dates', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeMovieDetail(response?.data),
  }))
);

export const getMovieSecondary = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:movie:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [recommendations, similar] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.recommendations?.results || [], 'browse'),
      sanitizeMovieResultsWithRuntime(data?.similar?.results || [], 'browse'),
    ]);

    return {
      ...response,
      data: sanitizeMovieDetail({
        ...data,
        recommendations: data?.recommendations
          ? {
              ...data.recommendations,
              results: recommendations,
            }
          : data?.recommendations,
        similar: data?.similar
          ? {
              ...data.similar,
              results: similar,
            }
          : data?.similar,
      }),
    };
  })
);

export const getTvBase = cache(async (id) =>
  getEntityDetail(id, 'tv', {
    append: ['aggregate_credits', 'content_ratings', 'credits', 'keywords', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeTvDetail(response?.data),
  }))
);

async function getTvSeasonDetails(tvId, seasons = []) {
  const visibleSeasons = (Array.isArray(seasons) ? seasons : [])
    .filter((season) => Number(season?.season_number) > 0 && Number(season?.episode_count) > 0)
    .slice(0, 12);

  if (!visibleSeasons.length) {
    return [];
  }

  const responses = await Promise.all(
    visibleSeasons.map((season) =>
      tmdbRequest(`/tv/${tvId}/season/${season.season_number}`, {
        query: { language: 'en-US' },
        revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
        tags: [`tmdb:tv:${tvId}:season:${season.season_number}`],
      }).then((response) => response?.data || null)
    )
  );

  return responses.filter(Boolean);
}

export const getTvSecondary = cache(async (id) =>
  getEntityDetail(id, 'tv', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:tv:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [seasonDetails] = await Promise.all([getTvSeasonDetails(id, data?.seasons)]);

    return {
      ...response,
      data: sanitizeTvDetail({
        ...data,
        recommendations: data?.recommendations
          ? {
              ...data.recommendations,
              results: withMediaType(data.recommendations.results || [], 'tv'),
            }
          : data?.recommendations,
        seasonDetails,
        similar: data?.similar
          ? {
              ...data.similar,
              results: withMediaType(data.similar.results || [], 'tv'),
            }
          : data?.similar,
      }),
    };
  })
);

export const getPersonBase = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['external_ids'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizePersonDetail(response?.data),
  }))
);

export const getPersonSecondary = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['images', 'movie_credits', 'tv_credits', 'tagged_images'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:person:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [castCredits, crewCredits] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.cast || [], 'credits'),
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.crew || [], 'credits'),
    ]);
    const tvCastCredits = withMediaType(sanitizeTvResults(data?.tv_credits?.cast || [], 'credits'), 'tv');
    const tvCrewCredits = withMediaType(sanitizeTvResults(data?.tv_credits?.crew || [], 'credits'), 'tv');

    return {
      ...response,
      data: sanitizePersonDetail({
        ...data,
        movie_credits: data?.movie_credits
          ? {
              ...data.movie_credits,
              cast: castCredits,
              crew: crewCredits,
            }
          : data?.movie_credits,
        tv_credits: data?.tv_credits
          ? {
              ...data.tv_credits,
              cast: tvCastCredits,
              crew: tvCrewCredits,
            }
          : data?.tv_credits,
      }),
    };
  })
);
