import 'server-only';

import { cache } from 'react';

import {
  IMDB_TOP_100_MOVIES,
  IMDB_TOP_100_TV_SHOWS,
} from '@/domains/home/shared/imdb-top-100-data';

export const getImdbTop100 = cache(async (mediaType = 'movie') => {
  const normalizedMediaType = mediaType === 'tv' ? 'tv' : 'movie';
  return normalizedMediaType === 'tv' ? IMDB_TOP_100_TV_SHOWS : IMDB_TOP_100_MOVIES;
});
