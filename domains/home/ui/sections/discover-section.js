'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import Icon from '@/ui/primitives/icon';
import { useRegistry } from '@/modules/registry';
import {
  ALL_GENRE_ID,
  MOBILE_DISCOVER_MEDIA_QUERY,
  getUniqueDiscoverItems,
  getDiscoverBatchSize,
} from '@/domains/home/shared/discover';
import { useDiscoverFeed } from '@/domains/home/client/use-discover-feed';

function GenreChip({ genre, isActive, onClick, index = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`center h-10 w-full rounded-2xl border px-3 text-xs tracking-wide text-black/70 ${isActive ? 'border-black bg-black font-semibold text-white' : 'hover:bg-primary border-black/10 bg-white/40 backdrop-blur-sm hover:text-black'}`}
    >
      <span className="truncate">{genre.name}</span>
    </button>
  );
}

export function DiscoverSection({
  initialDiscoverItems = [],
  initialGenres = [],
  initialDiscoverPage = 1,
  initialHasMore = false,
}) {
  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const draggedDistanceRef = useRef(0);
  const genreItems = useMemo(
    () => [{ id: ALL_GENRE_ID, name: 'All' }, ...initialGenres],
    [initialGenres],
  );
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [activeGenreId, setActiveGenreId] = useState(ALL_GENRE_ID);
  const [discoverItems, setDiscoverItems] = useState(initialDiscoverItems);
  const [discoverPage, setDiscoverPage] = useState(initialDiscoverPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sectionsLoaded, setSectionsLoaded] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [gridError, setGridError] = useState('');
  const requestDiscoverPage = useDiscoverFeed();

  const activeGenreName = useMemo(() => {
    return genreItems.find((g) => String(g.id) === String(activeGenreId))?.name || '';
  }, [activeGenreId, genreItems]);

  useRegistry(
    useMemo(
      () => ({
        nav: {
          description: activeGenreId === ALL_GENRE_ID ? 'Discover titles' : activeGenreName,
        },
      }),
      [activeGenreId, activeGenreName],
    ),
  );
  const batchSize = getDiscoverBatchSize(isMobileGrid);
  const gridItems = getUniqueDiscoverItems(discoverItems, discoverItems.length).slice(
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
  const loadDiscover = useCallback(
    async ({ append = false, genreId, minimumCount = 0, page }) => {
      const payload = await requestDiscoverPage({
        genreId,
        items: append ? discoverItems : [],
        minimumCount,
        page,
      });

      if (!payload) {
        return false;
      }

      setDiscoverItems(payload.items);
      setDiscoverPage(payload.page);
      setHasMore(payload.hasMore);
      return true;
    },
    [discoverItems, requestDiscoverPage],
  );
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
    loadDiscover,
  ]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

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

    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(updateScrollButtons) : null;
    observer?.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      observer?.disconnect();
    };
  }, [updateScrollButtons]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="relative flex w-full items-center">
        <button
          type="button"
          disabled={!canScrollLeft}
          className="hover:bg-primary mr-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-black/10 bg-white/40 text-black/70 backdrop-blur-sm hover:text-black disabled:pointer-events-none disabled:opacity-50"
          onClick={() => scroll('left')}
        >
          <Icon icon="solar:alt-arrow-left-linear" size={16} className="text-black/70" />
        </button>
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide flex flex-1 cursor-grab snap-x snap-mandatory items-center gap-2 overflow-x-auto scroll-smooth rounded-2xl select-none active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {genreItems.map((genre, index) => (
            <div key={genre.id} className="w-[calc((100%-72px)/10)] shrink-0 snap-start">
              <GenreChip
                genre={genre}
                index={index}
                isActive={String(genre.id) === String(activeGenreId)}
                onClick={() => handleChipClick(String(genre.id))}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={!canScrollRight}
          className="hover:bg-primary ml-2 inline-flex size-10 h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-black/10 bg-white/40 text-black/70 backdrop-blur-sm hover:text-black disabled:pointer-events-none disabled:opacity-50"
          onClick={() => scroll('right')}
        >
          <Icon icon="solar:alt-arrow-right-linear" size={16} className="text-black/70" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {gridItems.map((item, index) => (
          <div key={item.id}>
            <MediaPosterCard
              item={item}
              className="w-full"
              imageLoading={index === 0 ? 'eager' : undefined}
              imageFetchPriority={index === 0 ? 'high' : undefined}
            />
          </div>
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
        <div className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm text-black/50">
          {gridError}
        </div>
      ) : null}

      {gridItems.length === 0 && !isFiltering ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/50">
          No movies found for this genre.
        </div>
      ) : null}

      <div className="flex justify-center pt-1">
        {hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore || isFiltering}
            className="bg-primary inline-flex h-10 items-center gap-2 rounded-2xl border border-black/5 px-5 text-xs font-semibold text-black/70 uppercase hover:border-black/10 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'}
              size={16}
            />
            {isLoadingMore ? 'Loading' : 'Load more'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
