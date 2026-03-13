export class ImdbService {
  static async getTop100(type = 'movies') {
    try {
      const response = await fetch(`/api/imdb/${type}`, {
        next: { revalidate: 86400 },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch IMDB top 100')
      }

      const resJson = await response.json()

      const mappedResults = (resJson.data || []).map((item) => {
        const isMovie = type === 'movies'
        return {
          id: item.id,
          title: isMovie ? item.title : undefined,
          name: !isMovie ? item.title : undefined,
          original_title: isMovie
            ? item.original_title || item.title
            : undefined,
          original_name: !isMovie
            ? item.original_title || item.title
            : undefined,
          release_date: isMovie && item.year ? `${item.year}-01-01` : undefined,
          first_air_date:
            !isMovie && item.year ? `${item.year}-01-01` : undefined,
          vote_average: item.rating ? parseFloat(item.rating) : 0,
          poster_path_full: item.poster,
          media_type: isMovie ? 'movie' : 'tv',
          rank: item.rank,
        }
      })

      return {
        data: { results: mappedResults },
        error: null,
      }
    } catch (err) {
      console.error(err)
      return {
        data: null,
        error: err.message || 'Error occurred fetching IMDB top 100',
      }
    }
  }
}
