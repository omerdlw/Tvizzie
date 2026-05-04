'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { TMDB_IMG } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { DiscoverSection } from '@/features/home/discover-section';
import { TrendingSection } from '@/features/home/trending-section';
import MediaPosterCard from '@/ui/media/media-poster-card';

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

function getMovieYear(item) {
  return item?.release_date?.slice(0, 4) || null;
}

function HomeGridDivider() {
  return (
    <div className="movie-detail-grid-divider" aria-hidden="true">
      <span className="movie-detail-grid-divider-startcap" />
      <span className="movie-detail-grid-divider-endcap" />
    </div>
  );
}

function HomeFeatureSection({ heroItem, onSelectHeroItem, supportItems = [] }) {
  if (!heroItem) {
    return null;
  }

  const title = heroItem.title || heroItem.original_title || 'Untitled';
  const year = getMovieYear(heroItem);
  const backdropStyle = heroItem.backdrop_path
    ? { backgroundImage: `url(${TMDB_IMG}/w1280${heroItem.backdrop_path})` }
    : undefined;

  return (
    <section className="home-feature-section relative overflow-hidden">
      <div className="home-feature-backdrop absolute inset-0" style={backdropStyle} aria-hidden="true" />
      <div className="home-feature-content relative grid gap-6">
        <div className="flex min-w-0 flex-col justify-end gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-widest text-white-muted uppercase">Today on Tvizzie</p>
            <h1 className="font-zuume max-w-4xl text-7xl leading-none font-bold text-white uppercase sm:text-8xl lg:text-9xl">
              {title}
            </h1>
          </div>

          {heroItem.overview ? (
            <p className="max-w-2xl text-base leading-7 text-white-soft">{heroItem.overview}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/movie/${heroItem.id}`}
              className="inline-flex min-h-10 items-center border border-white bg-white px-5 text-xs font-semibold tracking-widest text-black uppercase transition hover:bg-primary hover:text-white"
            >
              Open movie
            </Link>
            {year ? (
              <span className="text-xs font-semibold tracking-widest text-white-muted uppercase">{year}</span>
            ) : null}
          </div>
        </div>

        <div className="home-feature-side grid gap-3">
          <div className="home-feature-poster">
            <MediaPosterCard item={heroItem} imagePriority imageFetchPriority="high" onSelect={onSelectHeroItem} />
          </div>

          {supportItems.length ? (
            <div className="grid grid-cols-3 gap-3">
              {supportItems.map((item, index) => (
                <MediaPosterCard
                  key={item.id}
                  item={item}
                  imagePriority={index < 3}
                  imageFetchPriority={index < 3 ? 'high' : undefined}
                  onSelect={onSelectHeroItem}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.dailyTrendingItems) ? homeData.dailyTrendingItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies) ? homeData.weeklyPopularMovies : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems) ? homeData.initialDiscoverItems : [];
  const initialGenres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);
  const heroItems = useMemo(
    () => getUniqueItems([...dailyItems, ...weeklyItems, ...initialDiscoverItems], 12),
    [dailyItems, initialDiscoverItems, weeklyItems]
  );
  const [activeHeroItemId, setActiveHeroItemId] = useState(() => heroItems[0]?.id || null);
  const heroItem = heroItems.find((item) => item.id === activeHeroItemId) || heroItems[0] || null;
  const supportItems = heroItems.filter((item) => item.id !== heroItem?.id).slice(0, 6);

  return (
    <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
      <div
        className={`home-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
      >
        <HomeFeatureSection
          heroItem={heroItem}
          onSelectHeroItem={(item) => setActiveHeroItemId(item?.id || null)}
          supportItems={supportItems}
        />

        <div className="home-grid-section relative">
          <HomeGridDivider />
          <div className="home-grid-section-content">
            <TrendingSection title="Trending today" items={dailyItems} delay={0.12} distance={18} />
          </div>
        </div>

        <div className="home-grid-section relative">
          <HomeGridDivider />
          <div className="home-grid-section-content">
            <TrendingSection title="Popular this week" items={weeklyItems} delay={0.16} distance={18} />
          </div>
        </div>

        <div className="home-grid-section relative">
          <HomeGridDivider />
          <div className="home-grid-section-content">
            <DiscoverSection
              initialDiscoverItems={initialDiscoverItems}
              initialGenres={initialGenres}
              initialDiscoverPage={initialDiscoverPage}
              initialHasMore={initialHasMore}
            />
          </div>
        </div>
      </div>
    </PageGradientShell>
  );
}
