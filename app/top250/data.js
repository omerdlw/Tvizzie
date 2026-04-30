import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TOP250_DATA_PATH = path.join(process.cwd(), 'public/data/top250.json');

function normalizeTop250Item(item, index) {
  const rank = Number(item?.rank) || index + 1;
  const title = String(item?.title || '').trim();
  const tmdbId = Number(item?.tmdbId) || null;
  const imdbId = String(item?.imdbId || '').trim();

  if (!title || !imdbId) {
    return null;
  }

  return {
    rank,
    imdbId,
    title,
    tmdbId,
    year: Number(item?.year) || null,
    rating: Number(item?.rating) || null,
    voteCount: Number(item?.voteCount) || null,
    runtimeMinutes: Number(item?.runtimeMinutes) || null,
    certificate: item?.certificate || null,
    genres: Array.isArray(item?.genres) ? item.genres.filter(Boolean) : [],
    directors: Array.isArray(item?.directors) ? item.directors.filter(Boolean) : [],
    cast: Array.isArray(item?.cast) ? item.cast.filter(Boolean) : [],
    overview: String(item?.overview || '').trim(),
    imageUrl: item?.imageUrl || null,
    imdbUrl: item?.imdbUrl || `https://www.imdb.com/title/${imdbId}/`,
    posterPath: item?.posterPath || null,
    backdropPath: item?.backdropPath || null,
  };
}

export async function getTop250Data() {
  const rawData = JSON.parse(await readFile(TOP250_DATA_PATH, 'utf8'));
  const items = (Array.isArray(rawData) ? rawData : rawData?.items || [])
    .map(normalizeTop250Item)
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank);

  return {
    source: rawData?.source || { type: 'static' },
    items,
  };
}
