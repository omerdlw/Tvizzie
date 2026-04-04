async function requestJson(url, { method = 'GET', cache = 'default' } = {}) {
  const response = await fetch(url, {
    method,
    cache,
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    return {
      data: null,
      error: `Request failed with status ${response.status}`,
      status: response.status,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}

function createUrl(pathname, params = {}) {
  const url = new URL(pathname, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export class TmdbService {
  static async searchContent(query, searchType = 'movie', page = 1) {
    return requestJson(
      createUrl('/api/tmdb/search', {
        page,
        q: query,
        type: searchType,
      })
    );
  }

  static async getPersonAwards(id) {
    return requestJson(`/api/person/${id}/awards`);
  }

  static async getMovieImages(id) {
    return requestJson(`/api/tmdb/movie-images/${id}`);
  }

  static async getGenres() {
    return requestJson('/api/tmdb/genres');
  }

  static async discoverContent({ genreId, page = 1, sortBy = 'popularity.desc' }) {
    return requestJson(
      createUrl('/api/tmdb/discover', {
        genreId,
        page,
        sortBy,
      })
    );
  }
}
