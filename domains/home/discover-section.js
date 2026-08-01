'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb.service';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import Icon from '@/ui/primitives/icon';
import { useRegistry } from '@/modules/registry';
import {
  homeSectionVariants,
  getGenreChipProps,
  genreNavButtonProps,
  getDiscoverCardProps,
  loadMoreButtonVariants,
} from '@/domains/home/animation-config';
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

function GenreChip({ genre, isActive, onClick, index = 0 }) {
  const chipProps = getGenreChipProps(index);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      {...chipProps}
      className={`center border px-3 h-10 text-xs tracking-wide rounded-2xl text-black/70 w-full transition-colors duration-200 ${isActive ? 'border-black bg-black font-semibold text-white' : 'hover:bg-primary border-black/10 bg-white/40 backdrop-blur-sm hover:text-black'}`}
    >
      <span className="truncate">{genre.name}</span>
    </motion.button>
  );
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
  const genreItems = [
    {
      id: ALL_GENRE_ID,
      name: 'All',
    },
    ...initialGenres,
  ];
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [activeGenreId, setActiveGenreId] = useState(ALL_GENRE_ID);
  const [discoverItems, setDiscoverItems] = useState(initialDiscoverItems);
  const [discoverPage, setDiscoverPage] = useState(initialDiscoverPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sectionsLoaded, setSectionsLoaded] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [gridError, setGridError] = useState('');

  const activeGenreName = useMemo(() => {
    return genreItems.find((g) => String(g.id) === String(activeGenreId))?.name || '';
  }, [activeGenreId, genreItems]);

  useRegistry(
    useMemo(() => ({
      nav: {
        description: activeGenreId === ALL_GENRE_ID ? 'Discover titles' : activeGenreName,
      },
    }), [activeGenreId, activeGenreName])
  );
  const batchSize = getDiscoverBatchSize(isMobileGrid);
  const gridItems = getUniqueItems(discoverItems, discoverItems.length).slice(
    0,
    sectionsLoaded * batchSize,
  );
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
      await loadDiscover({
        genreId: nextGenreId,
        page: 1,
        minimumCount: batchSize,
      });
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

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth + 8;
    el.scrollTo({
      left: el.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateScrollButtons();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <motion.section variants={homeSectionVariants} className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex items-center w-full relative">
        <motion.button
          type="button"
          disabled={!canScrollLeft}
          {...genreNavButtonProps}
          className="inline-flex shrink-0 size-10 items-center justify-center border rounded-2xl text-black/70 hover:bg-primary border-black/10 bg-white/40 backdrop-blur-sm hover:text-black cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 mr-2"
          onClick={() => scroll('left')}
        >
          <Icon icon="solar:alt-arrow-left-linear" size={16} className="text-black/70" />
        </motion.button>
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide cursor-grab overflow-x-auto select-none active:cursor-grabbing rounded-2xl flex-1 flex items-center gap-2 snap-x snap-mandatory scroll-smooth"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onScroll={updateScrollButtons}
        >
          {genreItems.map((genre, index) => (
            <div key={genre.id} className="snap-start w-[calc((100%-72px)/10)] shrink-0">
              <GenreChip
                genre={genre}
                index={index}
                isActive={String(genre.id) === String(activeGenreId)}
                onClick={() => handleChipClick(String(genre.id))}
              />
            </div>
          ))}
        </div>
        <motion.button
          type="button"
          disabled={!canScrollRight}
          {...genreNavButtonProps}
          className="inline-flex shrink-0 size-10 items-center justify-center border w-[38px] h-[38px] rounded-2xl text-black/70 hover:bg-primary border-black/10 bg-white/40 backdrop-blur-sm hover:text-black cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 ml-2"
          onClick={() => scroll('right')}
        >
          <Icon icon="solar:alt-arrow-right-linear" size={16} className="text-black/70" />
        </motion.button>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {gridItems.map((item, index) => (
          <motion.div key={item.id} {...getDiscoverCardProps(index)}>
            <MediaPosterCard item={item} className="w-full" />
          </motion.div>
        ))}

        {isFiltering
          ? Array.from({
              length: batchSize,
            }).map((_, index) => (
              <div key={`loading-${index}`} className="skeleton-block-soft aspect-2/3 w-full" />
            ))
          : null}
      </div>

      {gridError ? (
        <div className="border border-black/10 bg-white/70 rounded-2xl p-3 text-sm text-black/50">
          {gridError}
        </div>
      ) : null}

      {gridItems.length === 0 && !isFiltering ? (
        <div className="border border-black/10 bg-white/70 rounded-2xl p-4 text-sm text-black/50">
          No movies found for this genre.
        </div>
      ) : null}

      <div className="flex justify-center pt-1">
        {hasMore ? (
          <motion.button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore || isFiltering}
            {...loadMoreButtonVariants}
            className="inline-flex h-10 items-center gap-2 border border-black/5 rounded-2xl bg-primary px-5 text-xs font-semibold text-black/70 uppercase hover:border-black/10 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'}
              size={16}
              className={isLoadingMore ? 'animate-spin' : ''}
            />
            {isLoadingMore ? 'Loading' : 'Load more'}
          </motion.button>
        ) : null}
      </div>
    </motion.section>
  );
}
