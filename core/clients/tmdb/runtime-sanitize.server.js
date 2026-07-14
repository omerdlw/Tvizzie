import 'server-only';

import { cache } from 'react';

import { sanitizeMovieResults } from '@/core/clients/tmdb/sanitize';

import { TMDB_REVALIDATE } from './config';
import { tmdbRequest } from './request';
import { resolveTmdbDetailId } from './detail-id.server';

const resolveMovieRuntime = cache(async (id) => {
  const targetId = await resolveTmdbDetailId(id, 'movie');
  const response = await tmdbRequest(`/movie/${targetId}`, {
    query: {
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
    tags: ['tmdb:movie:runtime', `tmdb:movie:${targetId}:runtime`],
  });

  return response?.data?.runtime ?? null;
});

export async function hydrateMovieRuntime(item) {
  if (!item || typeof item !== 'object' || !item?.id) {
    return item;
  }

  if (Number.isFinite(Number(item?.runtime)) && Number(item.runtime) > 0) {
    return item;
  }

  const runtime = await resolveMovieRuntime(item.id);

  if (!Number.isFinite(Number(runtime)) || Number(runtime) <= 0) {
    return item;
  }

  return {
    ...item,
    runtime: Number(runtime),
  };
}

export async function sanitizeMovieResultsWithRuntime(items = [], context = 'browse') {
  const safeItems = Array.isArray(items) ? items : [];

  if (context !== 'search') {
    return sanitizeMovieResults(safeItems, context);
  }

  const hydratedItems = await Promise.all(safeItems.map((item) => hydrateMovieRuntime(item)));

  return sanitizeMovieResults(hydratedItems, context);
}
