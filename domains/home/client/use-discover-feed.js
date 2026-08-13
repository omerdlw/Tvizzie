'use client';

import { useCallback, useEffect, useRef } from 'react';

import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { getUniqueDiscoverItems } from '@/domains/home/shared/discover';

function normalizePage(value, fallback = 1) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : fallback;
}

export function useDiscoverFeed() {
  const requestVersionRef = useRef(0);

  useEffect(
    () => () => {
      requestVersionRef.current += 1;
    },
    [],
  );

  return useCallback(
    async ({ genreId, mediaType = 'movie', items = [], minimumCount = 0, page = 1 }) => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;
      const targetCount = Math.max(0, Number(minimumCount) || 0);
      let nextItems = getUniqueDiscoverItems(items);
      let nextPage = normalizePage(page);
      let resolvedPage = Math.max(0, nextPage - 1);
      let hasMore = true;

      while (nextPage > 0 && hasMore) {
        const response = await TmdbService.discoverContent({
          genreId,
          mediaType,
          page: nextPage,
        });

        if (requestVersionRef.current !== requestVersion) {
          return null;
        }

        if (!response?.data) {
          throw new Error(response?.error || 'Discover content could not be loaded');
        }

        const results = Array.isArray(response.data.results) ? response.data.results : [];
        resolvedPage = normalizePage(response.data.page, nextPage);
        hasMore = resolvedPage < normalizePage(response.data.total_pages, resolvedPage);
        nextItems = getUniqueDiscoverItems([...nextItems, ...results]);

        if (!hasMore || targetCount === 0 || nextItems.length >= targetCount) {
          break;
        }

        nextPage = resolvedPage + 1;
      }

      return {
        hasMore,
        items: nextItems,
        page: resolvedPage,
      };
    },
    [],
  );
}
