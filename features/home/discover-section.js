'use client';

import { useEffect, useRef, useState } from 'react';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import MediaPosterCard from '@/ui/media/media-poster-card';
import { GenreChip } from './genre-chip';
import Icon from '@/ui/icon';

const ALL_GENRE_ID = 'all';
const MOBILE_DISCOVER_BATCH = 9;
const DESKTOP_DISCOVER_BATCH = 24;
const MOBILE_DISCOVER_MEDIA_QUERY = '(max-width: 639px)';

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

function getDiscoverBatchSize(isMobileGrid) {
  return isMobileGrid ? MOBILE_DISCOVER_BATCH : DESKTOP_DISCOVER_BATCH;
}

export function DiscoverSection({
  initialDiscoverItems = [],
  initialGenres = [],
  initialDiscoverPage = 1,
  initialHasMore = false,
}) {
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const draggedDistanceRef = useRef(0);

  const genreItems = [{ id: ALL_GENRE_ID, name: 'All' }, ...initialGenres];

  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [activeGenreId, setActiveGenreId] = useState(ALL_GENRE_ID);
  const [discoverItems, setDiscoverItems] = useState(initialDiscoverItems);
  const [discoverPage, setDiscoverPage] = useState(initialDiscoverPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sectionsLoaded, setSectionsLoaded] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [gridError, setGridError] = useState('');

  const batchSize = getDiscoverBatchSize(isMobileGrid);
  const gridItems = getUniqueItems(discoverItems, discoverItems.length).slice(0, sectionsLoaded * batchSize);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_DISCOVER_MEDIA_QUERY);
    const handleChange = (event) => setIsMobileGrid(event.matches);

    setIsMobileGrid(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  async function loadDiscover({ genreId, page, append = false, minimumCount = 0 }) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const minimumTarget = Math.max(0, Number(minimumCount) || 0);
    let aggregatedItems = append ? getUniqueItems(discoverItems, discoverItems.length) : [];
    let nextPageToFetch = page;
    let resolvedPage = append ? discoverPage : page - 1;
    let nextHasMore = hasMore;

    while (nextPageToFetch > 0) {
      const response = await TmdbService.discoverContent({
        genreId,
        page: nextPageToFetch,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!response?.data) {
        throw new Error(response?.error || 'Failed to load discover content.');
      }

      const nextResults = Array.isArray(response.data?.results) ? response.data.results : [];
      resolvedPage = Number(response.data?.page) || nextPageToFetch;
      nextHasMore = resolvedPage < (Number(response.data?.total_pages) || resolvedPage);
      aggregatedItems = getUniqueItems([...aggregatedItems, ...nextResults]);

      if (!nextHasMore || aggregatedItems.length >= minimumTarget || minimumTarget === 0) {
        break;
      }

      nextPageToFetch = resolvedPage + 1;
    }

    setDiscoverItems(aggregatedItems);
    setDiscoverPage(resolvedPage);
    setHasMore(nextHasMore);
  }

  async function handleGenreChange(nextGenreId) {
    if (nextGenreId === activeGenreId || isFiltering) {
      return;
    }

    setActiveGenreId(nextGenreId);
    setGridError('');
    setSectionsLoaded(1);
    setIsFiltering(true);

    try {
      await loadDiscover({ genreId: nextGenreId, page: 1, minimumCount: batchSize });
    } catch {
      setGridError('Could not refresh this genre right now.');
    } finally {
      setIsFiltering(false);
    }
  }

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    draggedDistanceRef.current = 0;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    draggedDistanceRef.current = Math.abs(walk);
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleChipClick = (genreId) => {
    if (draggedDistanceRef.current > 10) return;
    handleGenreChange(genreId);
  };

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore || isFiltering) {
      return;
    }

    setGridError('');
    const nextSectionsLoaded = sectionsLoaded + 1;
    const nextVisibleCount = nextSectionsLoaded * batchSize;

    setSectionsLoaded(nextSectionsLoaded);

    if (discoverItems.length >= nextVisibleCount || !hasMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      await loadDiscover({
        genreId: activeGenreId,
        page: discoverPage + 1,
        append: true,
        minimumCount: nextVisibleCount,
      });
    } catch {
      setGridError('Could not load more movies right now.');
      setSectionsLoaded((currentValue) => Math.max(1, currentValue - 1));
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    const nextVisibleCount = sectionsLoaded * batchSize;

    if (discoverItems.length >= nextVisibleCount || !hasMore || isFiltering || isLoadingMore) {
      return;
    }

    let isCancelled = false;

    async function fillVisibleGrid() {
      try {
        await loadDiscover({
          genreId: activeGenreId,
          page: discoverPage + 1,
          append: discoverItems.length > 0,
          minimumCount: nextVisibleCount,
        });
      } catch {
        if (!isCancelled) {
          setGridError('Could not fill the discover grid right now.');
        }
      }
    }

    void fillVisibleGrid();

    return () => {
      isCancelled = true;
    };
  }, [
    activeGenreId,
    batchSize,
    discoverItems.length,
    discoverPage,
    hasMore,
    isFiltering,
    isLoadingMore,
    sectionsLoaded,
  ]);

  return (
    <div className="w-full">
      <section className="home-section-shell flex w-full flex-col gap-5">
        <div className="home-section-heading flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-widest text-white-muted uppercase">Browse</p>
            <h2 className="font-zuume text-5xl leading-none font-bold text-white uppercase sm:text-6xl">
              Discover movies
            </h2>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="scrollbar-hide cursor-grab overflow-x-auto select-none active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="flex w-max min-w-full items-center gap-2">
            {genreItems.map((genre) => (
              <GenreChip
                key={genre.id}
                genre={genre}
                isActive={String(genre.id) === String(activeGenreId)}
                onClick={() => handleChipClick(String(genre.id))}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {gridItems.map((item) => (
            <div key={item.id}>
              <MediaPosterCard item={item} className="w-full" />
            </div>
          ))}

          {isFiltering
            ? Array.from({ length: batchSize }).map((_, index) => (
                <div key={`loading-${index}`} className="skeleton-block-soft aspect-2/3 w-full" />
              ))
            : null}
        </div>

        {gridError ? (
          <div className="rounded border border-grid-line bg-primary p-3 text-sm text-white-muted">{gridError}</div>
        ) : null}

        {gridItems.length === 0 && !isFiltering ? (
          <div className="rounded border border-grid-line bg-primary p-4 text-sm text-white-muted">
            No movies found for this genre.
          </div>
        ) : null}

        <div className="flex justify-center pt-1">
          {hasMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore || isFiltering}
              className="inline-flex h-10 items-center gap-2 rounded border border-grid-line bg-primary px-5 text-xs font-semibold tracking-widest text-white-soft uppercase transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon
                icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'}
                size={14}
                className={isLoadingMore ? 'animate-spin' : ''}
              />
              {isLoadingMore ? 'Loading' : 'Load more'}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
