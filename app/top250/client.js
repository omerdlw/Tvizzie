'use client';

import { useMemo, useState } from 'react';

import { AppRouteItem, AppRouteSection, AppRouteShell } from '@/app/motion';
import { ACCOUNT_ROUTE_SHELL_CLASS, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import { cn } from '@/core/utils';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import SearchAction from '@/features/navigation/actions/search-action';
import { AccountSectionHeading } from '@/features/account/components/section-wrapper';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import MediaCard from '@/ui/media/media-card';

function getPosterSrc(item) {
  const preferredPoster = getPreferredMoviePosterSrc(
    {
      id: item.tmdbId,
      entityId: item.tmdbId,
      poster_path: item.posterPath,
    },
    'w342'
  );

  if (preferredPoster) {
    return preferredPoster;
  }

  if (item.posterPath) {
    return `${TMDB_IMG}/w342${item.posterPath}`;
  }

  return item.imageUrl || null;
}

function getBackdropSrc(items) {
  const backdropItem = items.find((item) => item.backdropPath);
  return backdropItem?.backdropPath ? `${TMDB_IMG}/original${backdropItem.backdropPath}` : null;
}

function Top250MovieCard({ item, index }) {
  const posterSrc = getPosterSrc(item);
  const href = item.tmdbId ? `/movie/${item.tmdbId}` : item.imdbUrl;

  return (
    <AppRouteItem index={index}>
      <MediaCard
        href={href}
        className="bg-primary w-full border border-white/5"
        imageSrc={posterSrc}
        imageAlt={item.title}
        imageSizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        imagePreset="poster"
        imageLoading={index < 8 ? 'eager' : 'lazy'}
        imagePriority={index < 4}
        tooltipText={`${item.title}${item.year ? ` (${item.year})` : ''}`}
      />
    </AppRouteItem>
  );
}

function normalizeSearchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getYearBucket(item) {
  const year = Number(item?.year);

  if (!Number.isFinite(year) || year <= 0) {
    return 'unknown';
  }

  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

function getTop250Stats(items = []) {
  const source = Array.isArray(items) ? items : [];
  const ratings = source.map((item) => Number(item?.rating)).filter((rating) => Number.isFinite(rating));
  const averageRating = ratings.length
    ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)
    : null;

  return {
    averageRating,
    totalCount: source.length,
  };
}

export default function Top250Client({ data }) {
  usePosterPreferenceVersion();
  const items = Array.isArray(data?.items) ? data.items : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortMode, setSortMode] = useState('rank-asc');
  const backgroundImage = getBackdropSrc(items);
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const availableGenres = useMemo(() => {
    const set = new Set();

    items.forEach((item) => {
      (Array.isArray(item?.genres) ? item.genres : []).forEach((genre) => {
        const safeGenre = String(genre || '').trim();

        if (safeGenre) {
          set.add(safeGenre);
        }
      });
    });

    return [...set].sort((left, right) => left.localeCompare(right));
  }, [items]);
  const availableYears = useMemo(() => {
    const set = new Set(items.map(getYearBucket).filter((bucket) => bucket !== 'unknown'));
    return [...set].sort((left, right) => Number(right.slice(0, 4)) - Number(left.slice(0, 4)));
  }, [items]);
  const filteredItems = useMemo(() => {
    const searched = items.filter((item) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      const haystack = [
        item?.title,
        item?.overview,
        ...(Array.isArray(item?.directors) ? item.directors : []),
        ...(Array.isArray(item?.cast) ? item.cast : []),
        ...(Array.isArray(item?.genres) ? item.genres : []),
      ]
        .map(normalizeSearchValue)
        .join(' ');

      return haystack.includes(normalizedSearchTerm);
    });

    const genreFiltered =
      genreFilter === 'all'
        ? searched
        : searched.filter((item) => (Array.isArray(item?.genres) ? item.genres : []).includes(genreFilter));
    const yearFiltered =
      yearFilter === 'all' ? genreFiltered : genreFiltered.filter((item) => getYearBucket(item) === yearFilter);

    return [...yearFiltered].sort((left, right) => {
      if (sortMode === 'rank-desc') {
        return Number(right.rank || 0) - Number(left.rank || 0);
      }

      if (sortMode === 'rating-desc') {
        return Number(right.rating || 0) - Number(left.rating || 0);
      }

      if (sortMode === 'rating-asc') {
        return Number(left.rating || 0) - Number(right.rating || 0);
      }

      if (sortMode === 'year-desc') {
        return Number(right.year || 0) - Number(left.year || 0);
      }

      if (sortMode === 'year-asc') {
        return Number(left.year || 0) - Number(right.year || 0);
      }

      return Number(left.rank || 0) - Number(right.rank || 0);
    });
  }, [genreFilter, items, normalizedSearchTerm, sortMode, yearFilter]);
  const stats = useMemo(() => getTop250Stats(filteredItems), [filteredItems]);

  useRegistry({
    nav: {
      title: 'IMDb Top 250',
      description: `${items.length} movies ranked by IMDb ratings snapshot`,
      icon: 'cib:imdb',
      action: <SearchAction />,
    },
  });

  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content isolate">
        <AppRouteShell as="main" className="pt-0">
          <div className={cn(ACCOUNT_ROUTE_SHELL_CLASS, 'account-detail-grid-frame')}>
            <div className="account-detail-grid-main flex w-full min-w-0 flex-col">
              <AppRouteSection className="account-detail-grid-subsection bg-transparent" index={0}>
                <div className="account-detail-section-shell flex flex-col">
                  <AppRouteItem index={0}>
                    <AccountSectionHeading
                      icon="cib:imdb"
                      showSeeMore={false}
                      summaryLabel={`${stats.totalCount} films${stats.averageRating ? ` • Avg ${stats.averageRating}` : ''}`}
                      title="IMDb Top 250"
                      showDivider={true}
                    />
                  </AppRouteItem>

                  <div className="account-detail-section-body pt-0">
                    <AppRouteItem className="account-filter-bar account-detail-full-width-item mt-0 pt-4" index={1}>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                        <label className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-[0.625rem] font-semibold text-white/50 uppercase">Search</span>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Title, cast, director, genre..."
                            className="h-10 w-full min-w-0 border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/80 uppercase placeholder:text-white/50 placeholder:normal-case focus:border-white/20 focus:bg-white/15 focus:text-white focus:outline-none"
                          />
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-[0.625rem] font-semibold text-white/50 uppercase">Genre</span>
                          <select
                            value={genreFilter}
                            onChange={(event) => setGenreFilter(event.target.value)}
                            className="h-10 w-full min-w-0 border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/80 uppercase focus:border-white/20 focus:bg-white/15 focus:text-white focus:outline-none"
                          >
                            <option value="all">All genres</option>
                            {availableGenres.map((genre) => (
                              <option key={genre} value={genre}>
                                {genre}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-[0.625rem] font-semibold text-white/50 uppercase">Decade</span>
                          <select
                            value={yearFilter}
                            onChange={(event) => setYearFilter(event.target.value)}
                            className="h-10 w-full min-w-0 border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/80 uppercase focus:border-white/20 focus:bg-white/15 focus:text-white focus:outline-none"
                          >
                            <option value="all">All decades</option>
                            {availableYears.map((yearValue) => (
                              <option key={yearValue} value={yearValue}>
                                {yearValue}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-[0.625rem] font-semibold text-white/50 uppercase">Sort</span>
                          <select
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value)}
                            className="h-10 w-full min-w-0 border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/80 uppercase focus:border-white/20 focus:bg-white/15 focus:text-white focus:outline-none"
                          >
                            <option value="rank-asc">Rank (1 → 250)</option>
                            <option value="rank-desc">Rank (250 → 1)</option>
                            <option value="rating-desc">Rating (High → Low)</option>
                            <option value="rating-asc">Rating (Low → High)</option>
                            <option value="year-desc">Year (New → Old)</option>
                            <option value="year-asc">Year (Old → New)</option>
                          </select>
                        </label>
                      </div>
                    </AppRouteItem>

                    {filteredItems.length ? (
                      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {filteredItems.map((item, index) => (
                          <Top250MovieCard key={item.imdbId} item={item} index={index} />
                        ))}
                      </section>
                    ) : (
                      <section className="bg-primary border border-white/5 px-4 py-5 text-sm font-medium text-white/50">
                        No titles match your current filters.
                      </section>
                    )}
                  </div>
                </div>
              </AppRouteSection>

              <AppRouteSection className="account-detail-grid-subsection bg-transparent" index={1}>
                <NavHeightSpacer className="w-full" />
              </AppRouteSection>
            </div>
          </div>
        </AppRouteShell>
      </PageGradientShell>
    </>
  );
}
