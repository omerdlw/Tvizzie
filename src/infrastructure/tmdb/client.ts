import { createAwardsApi, type AwardsApi } from "./awards";
import { createDiscoverApi, type DiscoverApi } from "./discover";
import { createMoviesApi, type MoviesApi } from "./movies";
import { createPeopleApi, type PeopleApi } from "./people";
import { createTmdbTransport, type TmdbTransportOptions } from "./transport";

export interface TmdbClient {
  awards: AwardsApi;
  discover: DiscoverApi;
  movies: MoviesApi;
  people: PeopleApi;
}

export function createTmdbClient(options: TmdbTransportOptions): TmdbClient {
  const transport = createTmdbTransport(options);
  return {
    awards: createAwardsApi({
      fetch: options.fetch,
      onError: options.onError,
    }),
    discover: createDiscoverApi(transport),
    movies: createMoviesApi(transport),
    people: createPeopleApi(transport),
  };
}
