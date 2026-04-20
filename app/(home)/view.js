'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import Link from 'next/link';

import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/core/constants';
import { HOME_HERO_CONTENT_TRANSITION, HOME_HERO_IMAGE_TRANSITION, HOME_HERO_PAGER_TRANSITION, HomeSectionReveal } from './motion';
import Carousel from '@/features/shared/carousel';
import MediaPosterCard from '@/features/shared/media-poster-card';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import Icon from '@/ui/icon';

const ALL_GENRE_ID = 'all';
const MOBILE_DISCOVER_BATCH = 9;
const DESKTOP_DISCOVER_BATCH = 24;
const MOBILE_DISCOVER_MEDIA_QUERY = '(max-width: 639px)';

function getTitle(item) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

function getYear(item) {
  return String(item?.release_date || item?.first_air_date || '').slice(0, 4) || null;
}

function getRating(item) {
  const value = Number(item?.vote_average);
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
}

function getBackdropSrc(item, size = 'w1280') {
  return item?.backdrop_path ? `${TMDB_IMG}/${size}${item.backdrop_path}` : null;
}

function getMovieHref(item) {
  return `/movie/${item?.id}`;
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

import { HeroPager } from '@/features/home/hero-pager';
import { GenreChip } from '@/features/home/genre-chip';
import { PosterRail } from '@/features/home/poster-rail';
import { SectionLabel } from '@/features/home/section-label';

function getDiscoverBatchSize(isMobileGrid) {
  return isMobileGrid ? MOBILE_DISCOVER_BATCH : DESKTOP_DISCOVER_BATCH;
}

export default function View({ homeData = {}, heroItems = [], selectedHeroId = null, onSelectHero = () => {} }) {
  const dailyItems = Array.isArray(homeData.heroItems) ? homeData.heroItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies) ? homeData.weeklyPopularMovies : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems) ? homeData.initialDiscoverItems : [];
  const initialGenres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);
  const reduceMotion = useReducedMotion();

  const requestIdRef = useRef(0);
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

  const heroItem = heroItems.find((item) => item?.id === selectedHeroId) || heroItems[0] || null;
  const heroHref = heroItem ? getMovieHref(heroItem) : '/search';
  const heroPagerItems = heroItems.slice(0, 5);
  const gridItems = getUniqueItems(discoverItems, discoverItems.length).slice(0, sectionsLoaded * batchSize);
  const todayRailItems = getUniqueItems(dailyItems, 12);
  const weekRailItems = getUniqueItems(weeklyItems, 12);

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
  }, [activeGenreId, batchSize, discoverItems.length, discoverPage, hasMore, isFiltering, isLoadingMore, sectionsLoaded]);

  return (
    <PageGradientShell className="overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.18),transparent_55%)] opacity-50" />

      <div className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-3 pt-20 pb-20 sm:px-4 md:px-6`}>
        <HomeSectionReveal delay={0.04} distance={24}>
          <section className="mx-auto w-full max-w-5xl">
            <div className="relative overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
              <div className="relative h-[21rem] w-full sm:h-[28rem] lg:h-[38rem]">
                {heroPagerItems.map((item, index) => {
                  const itemBackdrop = getBackdropSrc(item, 'w1280');
                  const isActive = item?.id === heroItem?.id;

                  return (
                    <motion.div
                      key={item.id}
                      initial={false}
                      animate={
                        reduceMotion
                          ? { opacity: isActive ? 1 : 0 }
                          : {
                              opacity: isActive ? 1 : 0,
                              scale: isActive ? 1 : 1.025,
                              filter: isActive ? 'blur(0px)' : 'blur(0px)',
                            }
                      }
                      transition={reduceMotion ? { duration: 0.12 } : HOME_HERO_IMAGE_TRANSITION}
                      className="absolute inset-0"
                      style={{ zIndex: 0, pointerEvents: 'none' }}
                    >
                      {itemBackdrop ? (
                        <AdaptiveImage
                          src={itemBackdrop}
                          alt={getTitle(item)}
                          fill
                          priority={index === 0}
                          fetchPriority={index === 0 ? 'high' : 'low'}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          sizes="(max-width: 1024px) 100vw, 960px"
                          className="object-cover object-center"
                          wrapperClassName="h-full w-full"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,20,18,0.82),rgba(24,20,18,0.24))]" />
                      )}
                    </motion.div>
                  );
                })}

                {!heroPagerItems.length ? (
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,20,18,0.82),rgba(24,20,18,0.24))]" />
                ) : null}

                <div className="absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(6,6,6,0.04),rgba(6,6,6,0.18)_24%,rgba(6,6,6,0.72)_76%,rgba(6,6,6,0.92))]" />
                <div className="absolute inset-0 z-10 bg-[linear-gradient(106deg,rgba(8,8,8,0.9)_0%,rgba(8,8,8,0.52)_34%,rgba(8,8,8,0.14)_64%,rgba(8,8,8,0.18)_100%)]" />
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%)]" />
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(250,249,245,0.08),transparent_28%)]" />
                <div className="absolute inset-0 z-10 ring-1 ring-white/6 ring-inset" />

                <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-6 p-5 sm:p-8 lg:p-10">
                  <div className="min-w-0 max-w-[35rem]">
                    <AnimatePresence initial={false} mode="sync">
                      <motion.div
                        key={`hero-content-${heroItem?.id || 'empty'}`}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.985 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.992 }}
                        transition={reduceMotion ? { duration: 0.16 } : HOME_HERO_CONTENT_TRANSITION}
                        className="flex flex-col gap-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-white/84 uppercase">
                          <span className="rounded-[8px] border border-white/14 bg-white/10 px-2 py-1 text-white backdrop-blur-sm">
                            Movie
                          </span>
                          {getRating(heroItem) ? (
                            <span className="inline-flex items-center gap-1 text-white/84">
                              <Icon icon="solar:star-bold" size={12} className="text-warning" />
                              {getRating(heroItem)}
                            </span>
                          ) : null}
                          {getYear(heroItem) ? <span className="text-white/72">{getYear(heroItem)}</span> : null}
                        </div>

                        <div className="flex flex-col gap-3">
                          <h1 className="font-zuume max-w-[18rem] text-5xl leading-[0.9] font-bold text-white uppercase sm:max-w-[22rem] sm:text-6xl lg:max-w-[24rem] lg:text-7xl">
                            {getTitle(heroItem)}
                          </h1>
                          {heroItem?.overview ? (
                            <p className="line-clamp-3 max-w-[34rem] text-[13px] leading-relaxed text-white/66 sm:line-clamp-4 sm:text-[15px] sm:leading-7">
                              {heroItem.overview}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <Link
                            href={heroHref}
                            className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-white/12 bg-white/12 px-5 text-[11px] font-semibold tracking-[0.16em] text-white uppercase shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white hover:text-black"
                          >
                            <Icon icon="solar:play-bold" size={14} />
                            Discover
                          </Link>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="hidden shrink-0 self-end sm:flex">
                    <HeroPager items={heroPagerItems} activeId={heroItem?.id} onSelect={onSelectHero} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end sm:hidden">
              <HeroPager items={heroPagerItems} activeId={heroItem?.id} onSelect={onSelectHero} />
            </div>
          </section>
        </HomeSectionReveal>

        <HomeSectionReveal delay={0.08} distance={18}>
          <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
            <div className="overflow-x-auto pb-1">
              <div className="flex w-max min-w-full items-center gap-2">
                {genreItems.map((genre) => (
                  <GenreChip
                    key={genre.id}
                    genre={genre}
                    isActive={String(genre.id) === String(activeGenreId)}
                    onClick={() => handleGenreChange(String(genre.id))}
                  />
                ))}
              </div>
            </div>

              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                {gridItems.map((item, index) => (
                  <HomeSectionReveal key={item.id} delay={Math.min(index * 0.015, 0.16)} distance={14}>
                    <MediaPosterCard item={item} className="w-full" />
                  </HomeSectionReveal>
                ))}

              {isFiltering
                ? Array.from({ length: batchSize }).map((_, index) => (
                    <div key={`loading-${index}`} className="skeleton-block-soft aspect-2/3 w-full rounded-[14px]" />
                  ))
                : null}
            </div>

            {gridError ? (
              <div className="rounded-[10px] border border-black/10 bg-white/70 p-3 text-sm text-black/60">{gridError}</div>
            ) : null}

            {gridItems.length === 0 && !isFiltering ? (
              <div className="rounded-[10px] border border-black/10 bg-white/70 p-4 text-sm text-black/60">
                No movies found for this genre.
              </div>
            ) : null}

            <div className="flex justify-center pt-1">
              {hasMore ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || isFiltering}
                  className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/10 bg-white px-5 text-[11px] font-semibold tracking-[0.15em] text-black/72 uppercase transition hover:border-black/20 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon icon={isLoadingMore ? 'solar:refresh-bold' : 'solar:restart-bold'} size={14} className={isLoadingMore ? 'animate-spin' : ''} />
                  {isLoadingMore ? 'Loading' : 'Load more'}
                </button>
              ) : null}
            </div>
          </section>
        </HomeSectionReveal>

        <HomeSectionReveal delay={0.12} distance={18}>
          <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <SectionLabel>Today&apos;s popular movies</SectionLabel>
            <PosterRail items={todayRailItems} />
          </section>
        </HomeSectionReveal>

        <HomeSectionReveal delay={0.16} distance={18}>
          <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <SectionLabel>This week&apos;s popular movies</SectionLabel>
            <PosterRail items={weekRailItems} />
          </section>
        </HomeSectionReveal>
      </div>
    </PageGradientShell>
  );
}
