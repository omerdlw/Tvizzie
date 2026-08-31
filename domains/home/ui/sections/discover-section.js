'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDiscoverFeed } from '@/domains/home/client/use-discover-feed';
import {
  MOBILE_DISCOVER_MEDIA_QUERY,
  getDiscoverBatchSize,
  getUniqueDiscoverItems,
} from '@/domains/home/utils/discover';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import { usePageRegistry } from '@/modules/registry';
import SegmentedControl from '@/ui/components/segmented-control';
import { Button } from '@/ui/primitives';
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

  usePageRegistry(
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
      <div className={HOME_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-xs font-semibold text-white/40 uppercase">Discover</p>
          <h1 className="text-base font-bold text-white sm:text-lg">{title}</h1>
        </div>
        <SegmentedControl
          ariaLabel="Choose media type"
          items={MEDIA_TYPE_ITEMS}
          value={mediaType}
          onChange={handleMediaTypeChange}
          className="shrink-0 self-start bg-white/5 p-0.5 ring-1 ring-white/10 ring-inset sm:self-auto"
        />
      </div>

      <div className={HOME_SECTION_CONTENT_CLASS}>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {gridItems.map((item, index) => (
            <MediaPosterCard
              key={`${item.media_type || mediaType}-${item.id}`}
              item={item}
              className="w-full"
              imageLoading={index < 6 ? 'eager' : 'lazy'}
              imageFetchPriority={index < 6 ? 'high' : undefined}
              fallbackMediaType={mediaType}
            />
          ))}

          {isFiltering || isLoadingMore
            ? Array.from({ length: batchSize }, (_, index) => (
                <div
                  key={`loading-${index}`}
                  className="skeleton-block-soft aspect-2/3 w-full rounded-[20px] ring-1 ring-white/5 ring-inset"
                />
              ))
            : null}
        </div>

        {gridError ? (
          <div className="mt-4 rounded-[20px] bg-white/5 p-6 text-center text-sm text-white/40 ring-1 ring-white/10 ring-inset">
            {gridError}
          </div>
        ) : null}

        {gridItems.length === 0 && !isFiltering && !isLoadingMore ? (
          <div className="mt-4 rounded-[20px] bg-white/5 p-6 text-center text-sm text-white/40 ring-1 ring-white/10 ring-inset">
            No {title.toLowerCase()} are available right now.
          </div>
        ) : null}

        <div className="flex justify-center pt-6">
          {hasMore ? (
            <Button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore || isFiltering}
              className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-white/5 px-5 text-xs font-semibold text-white/70 uppercase shadow-sm ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'} size={15} />
              {isLoadingMore ? 'Loading' : `Load more ${title.toLowerCase()}`}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
