import { TMDB_API_URL } from '@/lib/constants'
import { ApiClient } from '@/modules/api/client'

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

const tmdbClient = new ApiClient({
  baseURL: TMDB_API_URL,
  emitCriticalErrorEvents: false,
  emitForbiddenEvents: false,
  emitUnauthorizedEvents: false,
  eventSource: 'tmdb',
  timeout: 15000,
})

tmdbClient.addRequestInterceptor(async (config) => {
  if (TMDB_API_KEY) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${TMDB_API_KEY}`,
      accept: 'application/json',
    }
  }
  return config
})

const DETAIL_APPEND_MAP = {
  movie: [
    'alternative_titles',
    'changes',
    'credits',
    'external_ids',
    'images',
    'keywords',
    'lists',
    'recommendations',
    'release_dates',
    'reviews',
    'similar',
    'translations',
    'videos',
    'watch/providers',
  ],
  tv: [
    'aggregate_credits',
    'alternative_titles',
    'changes',
    'content_ratings',
    'credits',
    'episode_groups',
    'external_ids',
    'images',
    'keywords',
    'lists',
    'recommendations',
    'reviews',
    'screened_theatrically',
    'similar',
    'translations',
    'videos',
    'watch/providers',
  ],
  person: [
    'changes',
    'combined_credits',
    'external_ids',
    'images',
    'movie_credits',
    'tagged_images',
    'translations',
    'tv_credits',
  ],
}

const getAppendParams = (type) => {
  const append = DETAIL_APPEND_MAP[type]
  if (!append || append.length === 0) return ''
  return append.join(',')
}

export class TmdbService {
  static async searchContent(query, searchType = 'multi', page = 1) {
    try {
      const validTypes = ['multi', 'movie', 'tv', 'person']
      const type = validTypes.includes(searchType) ? searchType : 'multi'

      const endpoint = `/search/${type}?query=${encodeURIComponent(query)}&page=${page}&language=en-US`

      const searchRes = await tmdbClient.get(endpoint)

      if (searchRes.data && searchRes.data.results) {
        let items = searchRes.data.results.map((item) => ({
          ...item,
          media_type: item.media_type || (type !== 'multi' ? type : undefined),
        }))

        items = items
          .filter(
            (item) =>
              item.media_type === 'movie' ||
              item.media_type === 'tv' ||
              item.media_type === 'person'
          )
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))

        searchRes.data.results = items
      }

      return {
        data: searchRes.data,
        error: null,
        status: searchRes.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || 'Error occurred during search',
        status: err.status || 0,
      }
    }
  }

  static async getDetailBundle(id, type = 'movie') {
    try {
      const validTypes = ['movie', 'tv', 'person']
      if (!validTypes.includes(type)) {
        throw new Error(
          'Invalid type parameter. Must be "movie", "tv" or "person"'
        )
      }

      let targetId = id
      if (typeof id === 'string' && id.startsWith('tt')) {
        const findRes = await this.findByExternalId(id)
        if (findRes.data) {
          const results =
            type === 'movie'
              ? findRes.data.movie_results
              : findRes.data.tv_results
          if (results && results.length > 0) {
            targetId = results[0].id
          }
        }
      }

      const append = getAppendParams(type)
      const appendQuery = append ? `&append_to_response=${append}` : ''
      const endpoint = `/${type}/${targetId}?language=en-US${appendQuery}`
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error:
          err.message ||
          `Error occurred fetching detail bundle for ${type} ${id}`,
        status: err.status || 0,
      }
    }
  }

  static async getDetails(id, type = 'movie') {
    try {
      if (type !== 'movie' && type !== 'tv') {
        throw new Error('Invalid type parameter. Must be "movie" or "tv"')
      }

      const endpoint = `/${type}/${id}?append_to_response=credits,images,external_ids&language=en-US`
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error:
          err.message || `Error occurred fetching details for ${type} ${id}`,
        status: err.status || 0,
      }
    }
  }

  static async getScoreTable(tvId) {
    try {
      const tvDetailsEndpoint = `/tv/${tvId}?language=en-US`
      const tvDetailsRes = await tmdbClient.get(tvDetailsEndpoint)
      const seasons = tvDetailsRes.data?.seasons || []

      const validSeasons = seasons.filter((season) => season.season_number > 0)

      const seasonPromises = validSeasons.map((season) =>
        tmdbClient.get(
          `/tv/${tvId}/season/${season.season_number}?language=en-US`
        )
      )

      const seasonsDataResponses = await Promise.all(seasonPromises)

      const scoreMatrix = seasonsDataResponses.map((res) => {
        const seasonData = res.data
        return {
          seasonNumber: seasonData.season_number,
          seasonName: seasonData.name,
          episodes: (seasonData.episodes || []).map((episode) => ({
            episode_number: episode.episode_number,
            name: episode.name,
            vote_average: episode.vote_average,
            air_date: episode.air_date,
            id: episode.id,
          })),
        }
      })

      return {
        data: scoreMatrix,
        error: null,
        status: 200,
      }
    } catch (err) {
      return {
        data: null,
        error:
          err.message || `Error occurred generating score table for TV ${tvId}`,
        status: err.status || 0,
      }
    }
  }

  static async getSeasonDetail(tvId, seasonNumber) {
    try {
      const endpoint = `/tv/${tvId}/season/${seasonNumber}?language=en-US`
      const response = await tmdbClient.get(endpoint)
      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error:
          err.message || `Error fetching season ${seasonNumber} for TV ${tvId}`,
        status: err.status || 0,
      }
    }
  }

  static async getPersonDetails(id) {
    return this.getDetailBundle(id, 'person')
  }

  static async getPersonAwards(id) {
    try {
      const response = await fetch(`/api/person/${id}/awards`)
      if (!response.ok) return { data: null }
      const data = await response.json()
      return { data }
    } catch (e) {
      console.error('Failed to parse awards:', e)
      return { data: null }
    }
  }

  static async getTrending(timeWindow = 'day') {
    try {
      const endpoint = `/trending/all/${timeWindow}?language=en-US`
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || 'Error occurred fetching trending content',
        status: err.status || 0,
      }
    }
  }

  static async getTopRated(type = 'movie') {
    try {
      if (type !== 'movie' && type !== 'tv') {
        throw new Error('Invalid type parameter. Must be "movie" or "tv"')
      }

      const endpoint = `/${type}/top_rated?language=en-US`
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || `Error occurred fetching top rated ${type}`,
        status: err.status || 0,
      }
    }
  }

  static async getPopular(type = 'movie') {
    try {
      if (type !== 'movie' && type !== 'tv') {
        throw new Error('Invalid type parameter. Must be "movie" or "tv"')
      }

      const endpoint = `/${type}/popular?language=en-US`
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || `Error occurred fetching popular ${type}`,
        status: err.status || 0,
      }
    }
  }

  static async getNowPlaying() {
    try {
      const endpoint = '/movie/now_playing?language=en-US'
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || 'Error occurred fetching now playing movies',
        status: err.status || 0,
      }
    }
  }

  static async getUpcoming() {
    try {
      const endpoint = '/movie/upcoming?language=en-US'
      const response = await tmdbClient.get(endpoint)

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || 'Error occurred fetching upcoming movies',
        status: err.status || 0,
      }
    }
  }

  static async getGenres(type = 'movie') {
    try {
      if (type !== 'movie' && type !== 'tv') {
        throw new Error('Invalid type parameter. Must be "movie" or "tv"')
      }
      const endpoint = `/genre/${type}/list?language=en-US`
      const response = await tmdbClient.get(endpoint)
      return {
        data: response.data?.genres || [],
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || `Error fetching genres for ${type}`,
        status: err.status || 0,
      }
    }
  }

  static async findByExternalId(externalId, source = 'imdb_id') {
    try {
      const endpoint = `/find/${externalId}?external_source=${source}&language=en-US`
      const response = await tmdbClient.get(endpoint)
      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error:
          err.message || `Error finding content with ${source} ${externalId}`,
        status: err.status || 0,
      }
    }
  }

  static async discoverContent({
    type = 'movie',
    genreId,
    page = 1,
    sortBy = 'popularity.desc',
  }) {
    try {
      if (type !== 'movie' && type !== 'tv') {
        throw new Error('Invalid type parameter. Must be "movie" or "tv"')
      }
      let endpoint = `/discover/${type}?language=en-US&page=${page}&sort_by=${sortBy}`
      if (genreId && genreId !== 'all') {
        endpoint += `&with_genres=${genreId}`
      }
      const response = await tmdbClient.get(endpoint)

      if (response.data && response.data.results) {
        response.data.results = response.data.results.map((item) => ({
          ...item,
          media_type: type,
        }))
      }

      return {
        data: response.data,
        error: null,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || `Error discovering ${type}`,
        status: err.status || 0,
      }
    }
  }
}
