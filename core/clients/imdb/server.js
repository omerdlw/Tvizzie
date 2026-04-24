import 'server-only';

import { cache } from 'react';

export const getImdbTitleRating = cache(async (imdbId) => {
  if (!String(imdbId || '').trim()) {
    return null;
  }

  return null;
});
