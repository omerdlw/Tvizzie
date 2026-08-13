import 'server-only';

import { cache } from 'react';

import {
  IMDB_TOP_100_MOVIES,
  IMDB_TOP_100_TV_SHOWS,
} from '@/domains/home/shared/imdb-top-100-data';
import { tmdbRequest } from '@/infrastructure/tmdb/clients/request';
import { TMDB_REVALIDATE } from '@/infrastructure/tmdb/clients/tmdb-client-config';

const TMDB_SEARCH_BATCH_SIZE = 10;

function normalizeComparableText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getCandidateTitle(item) {
  return item?.title || item?.name || item?.original_title || item?.original_name || '';
}

function getCandidateYear(item, mediaType) {
  const date = mediaType === 'tv' ? item?.first_air_date : item?.release_date;
  const year = Number(String(date || '').slice(0, 4));

  return Number.isFinite(year) ? year : null;
}

function getCandidateScore(item, entry, mediaType) {
  const titleScore =
    normalizeComparableText(getCandidateTitle(item)) === normalizeComparableText(entry.title)
      ? 10
      : 0;
  const year = getCandidateYear(item, mediaType);
  const yearScore = entry.year && year === entry.year ? 4 : 0;

  return titleScore + yearScore + Number(item?.popularity || 0) / 100000;
}

function selectBestCandidate(items, entry, mediaType) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.id && item?.poster_path)
    .sort(
      (left, right) =>
        getCandidateScore(right, entry, mediaType) - getCandidateScore(left, entry, mediaType),
    )[0];
}

async function resolveEntry(entry, mediaType) {
  const isTv = mediaType === 'tv';
  const response = await tmdbRequest(`/search/${mediaType}`, {
    query: {
      language: 'en-US',
      query: entry.title,
      ...(entry.year ? (isTv ? { first_air_date_year: entry.year } : { year: entry.year }) : {}),
    },
    revalidate: TMDB_REVALIDATE.IMDB_TOP_100_ENRICHMENT,
    tags: [`tmdb:imdb-top-100:${mediaType}:${entry.rank}`],
  });
  const candidate = selectBestCandidate(response.data?.results, entry, mediaType);

  if (!candidate) {
    return null;
  }

  return {
    ...candidate,
    imdb_rank: entry.rank,
    imdb_rating: entry.rating,
    imdb_title: entry.title,
    media_type: mediaType,
  };
}

async function mapInBatches(entries, mediaType) {
  const items = [];

  for (let index = 0; index < entries.length; index += TMDB_SEARCH_BATCH_SIZE) {
    const batch = entries.slice(index, index + TMDB_SEARCH_BATCH_SIZE);
    const resolvedBatch = await Promise.all(batch.map((entry) => resolveEntry(entry, mediaType)));
    items.push(...resolvedBatch.filter(Boolean));
  }

  return items;
}

export const getImdbTop100 = cache(async (mediaType = 'movie') => {
  const normalizedMediaType = mediaType === 'tv' ? 'tv' : 'movie';
  const entries = normalizedMediaType === 'tv' ? IMDB_TOP_100_TV_SHOWS : IMDB_TOP_100_MOVIES;

  return mapInBatches(entries, normalizedMediaType);
});
