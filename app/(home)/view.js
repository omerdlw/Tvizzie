import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Carousel from '@/features/shared/carousel';
import MediaPosterCard from '@/features/shared/media-poster-card';

function getTitle(item) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

function getYear(item) {
  return String(item?.release_date || item?.first_air_date || '').slice(0, 4) || null;
}

function getRuntime(item) {
  const value = Number(item?.runtime);
  return Number.isFinite(value) && value > 0 ? `${value} min` : null;
}

function getRating(item) {
  const value = Number(item?.vote_average);
  return Number.isFinite(value) && value > 0 ? `${value.toFixed(1)}/10` : null;
}

function getBackdropSrc(item) {
  return item?.backdrop_path ? `${TMDB_IMG}/w1280${item.backdrop_path}` : null;
}

function getMovieHref(item) {
  return `/movie/${item?.id}`;
}

function getGenreNames(item, genreMap, limit = 3) {
  return (item?.genre_ids || [])
    .map((genreId) => genreMap.get(genreId))
    .filter(Boolean)
    .slice(0, limit);
}

function getUniqueItems(items = [], limit = items.length) {
  const seen = new Set();

  return items
    .filter((item) => {
      const id = item?.id;

      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    })
    .slice(0, limit);
}

export default function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.heroItems) ? homeData.heroItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies) ? homeData.weeklyPopularMovies : [];
  const discoverItems = Array.isArray(homeData.initialDiscoverItems) ? homeData.initialDiscoverItems : [];
  const genres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));

  const heroItem = dailyItems[0] || weeklyItems[0] || discoverItems[0] || null;
  const heroSideItems = getUniqueItems(
    [...dailyItems, ...weeklyItems, ...discoverItems].filter((item) => item?.id !== heroItem?.id),
    4
  );
  const dailyShelf = getUniqueItems(
    dailyItems.filter((item) => item?.id !== heroItem?.id),
    10
  );
  const weeklyShelf = getUniqueItems(
    weeklyItems.filter((item) => item?.id !== heroItem?.id),
    10
  );
  const featuredItems = getUniqueItems(
    [...discoverItems, ...weeklyItems, ...dailyItems].filter((item) => item?.id !== heroItem?.id),
    4
  );
  const genreItems = genres.slice(0, 10);

  return <></>;
}
