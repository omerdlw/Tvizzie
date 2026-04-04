const SEED_QUERY_PARAM_MAP = Object.freeze({
  backdropPath: 'seedBackdropPath',
  entityId: 'seedId',
  entityType: 'seedType',
  first_air_date: 'seedFirstAirDate',
  name: 'seedName',
  poster_path: 'seedPosterPath',
  release_date: 'seedReleaseDate',
  title: 'seedTitle',
  vote_average: 'seedVoteAverage',
});

export const ACCOUNT_LIST_CREATOR_PATH = '/account/lists/new';

export function buildListCreatorHref(seedMedia = null) {
  if (!seedMedia) {
    return ACCOUNT_LIST_CREATOR_PATH;
  }

  const entityType = seedMedia?.entityType || seedMedia?.media_type || 'movie';

  if (entityType !== 'movie') {
    return ACCOUNT_LIST_CREATOR_PATH;
  }

  const params = new URLSearchParams();
  const normalizedMedia = {
    backdropPath: seedMedia?.backdrop_path || seedMedia?.backdropPath || null,
    entityId: seedMedia?.entityId ?? seedMedia?.id ?? null,
    entityType,
    first_air_date: null,
    name: '',
    poster_path: seedMedia?.poster_path || seedMedia?.posterPath || null,
    release_date: seedMedia?.release_date || null,
    title: seedMedia?.title || seedMedia?.original_title || '',
    vote_average: seedMedia?.vote_average ?? null,
  };

  Object.entries(SEED_QUERY_PARAM_MAP).forEach(([field, queryKey]) => {
    const value = normalizedMedia[field];

    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(queryKey, String(value));
  });

  const queryString = params.toString();

  return queryString ? `${ACCOUNT_LIST_CREATOR_PATH}?${queryString}` : ACCOUNT_LIST_CREATOR_PATH;
}
