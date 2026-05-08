'use client';

import { useMemo, useState } from 'react';

import { ACCOUNT_ROUTE_SHELL_CLASS, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import { cn } from '@/core/utils';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import SearchAction from '@/features/navigation/actions/search-action';
import { AccountSectionHeading } from '@/features/account/shared/section-wrapper';
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
    <div>
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
    </div>
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
    background: backgroundImage
      ? {
          image: backgroundImage,
          overlay: true,
          overlayOpacity: 0.5,
          overlayColor: 'var(--white)',
          noiseStyle: {
            opacity: 0.1,
          },
          imageStyle: {
            opacity: 0.9,
          },
        }
      : {
          image: null,
          video: null,
          overlay: false,
          overlayOpacity: 0,
        },
  });

  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content">
        <main className="pt-0">
          <div className={cn(ACCOUNT_ROUTE_SHELL_CLASS, 'account-detail-grid-frame')}>
            <div className="account-detail-grid-main">
              <section className="account-detail-grid-subsection bg-transparent">
                <div className="account-detail-section-shell flex flex-col">
                  <AccountSectionHeading
                    icon="cib:imdb"
                    showSeeMore={false}
                    summaryLabel={`${stats.totalCount} films${stats.averageRating ? ` • Avg ${stats.averageRating}` : ''}`}
                    title="IMDb Top 250"
                    showDivider={true}
                  />

                  <div className="account-detail-section-body top250-section-body">
                    <div className="account-filter-bar account-detail-full-width-item top250-filter-bar">
                      <div className="top250-filter-grid">
                        <label className="top250-filter-field">
                          <span className="top250-filter-label">Search</span>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Title, cast, director, genre..."
                            className="top250-filter-input"
                          />
                        </label>

                        <label className="top250-filter-field">
                          <span className="top250-filter-label">Genre</span>
                          <select
                            value={genreFilter}
                            onChange={(event) => setGenreFilter(event.target.value)}
                            className="top250-filter-input"
                          >
                            <option value="all">All genres</option>
                            {availableGenres.map((genre) => (
                              <option key={genre} value={genre}>
                                {genre}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="top250-filter-field">
                          <span className="top250-filter-label">Decade</span>
                          <select
                            value={yearFilter}
                            onChange={(event) => setYearFilter(event.target.value)}
                            className="top250-filter-input"
                          >
                            <option value="all">All decades</option>
                            {availableYears.map((yearValue) => (
                              <option key={yearValue} value={yearValue}>
                                {yearValue}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="top250-filter-field">
                          <span className="top250-filter-label">Sort</span>
                          <select
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value)}
                            className="top250-filter-input"
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
                    </div>

                    {filteredItems.length ? (
                      <section className="top250-grid">
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
              </section>

              <section className="account-detail-grid-subsection bg-transparent">
                <NavHeightSpacer className="w-full" />
              </section>
            </div>
          </div>
        </main>
      </PageGradientShell>
    </>
  );
}
