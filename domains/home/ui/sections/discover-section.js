'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { HomeReveal } from '@/app/motion';
import { useDiscoverFeed } from '@/domains/home/client/use-discover-feed';
import {
  MOBILE_DISCOVER_MEDIA_QUERY,
  getDiscoverBatchSize,
  getUniqueDiscoverItems,
} from '@/domains/home/shared/discover';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import { useRegistry } from '@/modules/registry';
import SegmentedControl from '@/ui/primitives/segmented-control';
import Icon from '@/ui/primitives/icon';
import {
  HOME_SECTION_CONTENT_CLASS,
  HOME_SECTION_HEADER_CLASS,
} from '@/domains/home/ui/layouts/home-section';

const MEDIA_TYPE_ITEMS = Object.freeze([
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
]);

export function DiscoverSection({
  initialDiscoverItems = [],
  initialDiscoverPage = 1,
  initialHasMore = false,
}) {
  const [mediaType, setMediaType] = useState('movie');
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [discoverItems, setDiscoverItems] = useState(initialDiscoverItems);
  const [discoverPage, setDiscoverPage] = useState(initialDiscoverPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sectionsLoaded, setSectionsLoaded] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [gridError, setGridError] = useState('');
  const requestDiscoverPage = useDiscoverFeed();
  const batchSize = getDiscoverBatchSize(isMobileGrid);
  const gridItems = getUniqueDiscoverItems(discoverItems, discoverItems.length).slice(
    0,
    sectionsLoaded * batchSize,
  );

  useRegistry(
    useMemo(
      () => ({
        nav: {
          description: mediaType === 'tv' ? 'Discover TV shows' : 'Discover movies',
        },
      }),
      [mediaType],
    ),
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
    async ({ append = false, minimumCount = 0, page, nextMediaType = mediaType }) => {
      const payload = await requestDiscoverPage({
        genreId: 'all',
        mediaType: nextMediaType,
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
    [discoverItems, mediaType, requestDiscoverPage],
  );

  const handleMediaTypeChange = useCallback(
    async (nextMediaType) => {
      if (nextMediaType === mediaType || isFiltering) {
        return;
      }

      setMediaType(nextMediaType);
      setDiscoverItems([]);
      setDiscoverPage(1);
      setHasMore(true);
      setSectionsLoaded(1);
      setGridError('');
      setIsFiltering(true);

      try {
        await loadDiscover({
          nextMediaType,
          page: 1,
          minimumCount: batchSize,
        });
      } catch {
        setGridError(`Could not load ${nextMediaType === 'tv' ? 'TV shows' : 'movies'} right now.`);
      } finally {
        setIsFiltering(false);
      }
    },
    [batchSize, isFiltering, loadDiscover, mediaType],
  );

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore || isFiltering) {
      return;
    }

    setGridError('');
    const nextSectionsLoaded = sectionsLoaded + 1;
    const nextVisibleCount = nextSectionsLoaded * batchSize;
    setSectionsLoaded(nextSectionsLoaded);

    if (discoverItems.length >= nextVisibleCount) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await loadDiscover({
        page: discoverPage + 1,
        append: true,
        minimumCount: nextVisibleCount,
      });
    } catch {
      setGridError('Could not load more titles right now.');
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
    batchSize,
    discoverItems.length,
    discoverPage,
    hasMore,
    isFiltering,
    isLoadingMore,
    loadDiscover,
    sectionsLoaded,
  ]);

  const title = mediaType === 'tv' ? 'TV shows' : 'Movies';

  return (
    <section className="relative w-full">
      <div className="relative">
        <HomeReveal stage="discover.controls">
          <div className={HOME_SECTION_HEADER_CLASS}>
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-xs leading-4 font-semibold tracking-wide text-black/45 uppercase">
                Discover
              </p>
              <h1 className="text-base leading-5 font-semibold tracking-tight text-black">
                {title}
              </h1>
            </div>
            <SegmentedControl
              ariaLabel="Choose media type"
              items={MEDIA_TYPE_ITEMS}
              value={mediaType}
              onChange={handleMediaTypeChange}
              className="shrink-0 self-start sm:self-auto"
            />
          </div>
        </HomeReveal>
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </div>

      <HomeReveal stage="discover.grid">
        <div className={HOME_SECTION_CONTENT_CLASS}>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            {gridItems.map((item, index) => (
              <HomeReveal
                key={`${item.media_type || mediaType}-${item.id}`}
                itemIndex={index}
                stage="discover.item"
              >
                <MediaPosterCard
                  item={item}
                  className="w-full"
                  imageLoading={index === 0 ? 'eager' : undefined}
                  imageFetchPriority={index === 0 ? 'high' : undefined}
                  fallbackMediaType={mediaType}
                />
              </HomeReveal>
            ))}

            {isFiltering || isLoadingMore
              ? Array.from({ length: batchSize }, (_, index) => (
                  <div key={`loading-${index}`} className="skeleton-block-soft aspect-2/3 w-full" />
                ))
              : null}
          </div>

          {gridError ? (
            <div className="mt-6 border border-black/10 bg-white/70 p-3 text-sm text-black/50">
              {gridError}
            </div>
          ) : null}

          {gridItems.length === 0 && !isFiltering && !isLoadingMore ? (
            <div className="mt-6 border border-black/10 bg-white/70 p-4 text-sm text-black/50">
              No {title.toLowerCase()} are available right now.
            </div>
          ) : null}

          <HomeReveal stage="control">
            <div className="flex justify-center pt-6">
              {hasMore ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || isFiltering}
                  className="bg-primary inline-flex h-10 items-center gap-2 border border-black/5 px-5 text-xs font-semibold text-black/70 uppercase hover:border-black/10 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon
                    icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'}
                    size={16}
                  />
                  {isLoadingMore ? 'Loading' : `Load more ${title.toLowerCase()}`}
                </button>
              ) : null}
            </div>
          </HomeReveal>
        </div>
      </HomeReveal>
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
