'use client';

import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { SearchMovieFilterBar } from '@/features/account/shared/content-filters';
import { AccountGridDivider, AccountGridFrame } from '@/features/account/shared/grid-animation';
import AccountSectionLayout, { AccountSectionHeading } from '@/features/account/shared/section-wrapper';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';
import { SEARCH_TYPES } from '@/features/search/constants';
import SearchGridItem from '@/features/search/grid-item';

function isMediaResult(item) {
  return item?.media_type === SEARCH_TYPES.MOVIE || item?.media_type === SEARCH_TYPES.PERSON;
}

function isCommunityResult(item) {
  return (
    item?.media_type === SEARCH_TYPES.USER ||
    item?.media_type === SEARCH_TYPES.LIST ||
    item?.media_type === SEARCH_TYPES.REVIEW
  );
}

function formatCount(value, label) {
  const count = Number(value);

  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return `${Math.floor(count)} ${label}${count === 1 ? '' : 's'}`;
}

function getImageSrc(value) {
  if (!value) {
    return null;
  }

  return String(value).startsWith('/') ? `${TMDB_IMG}/w342${value}` : value;
}

function SearchUserCard({ item }) {
  const title = item.displayName || item.username || 'Anonymous User';
  const fallbackSrc = getUserAvatarFallbackUrl(item);
  const avatarSrc = getUserAvatarUrl(item) || fallbackSrc;
  const detailPath = `/account/${item.username || item.id}`;
  const stats = [
    formatCount(item.followerCount, 'follower'),
    formatCount(item.listsCount, 'list'),
    formatCount(item.watchedCount, 'film'),
  ].filter(Boolean);

  return (
    <Link href={detailPath} className="search-community-card search-community-card-user">
      <div className="search-avatar-frame">
        <AdaptiveImage
          mode="img"
          className="h-full w-full object-cover"
          src={avatarSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={(event) => applyAvatarFallback(event, fallbackSrc)}
          wrapperClassName="h-full w-full"
        />
      </div>
      <div className="search-community-copy">
        <span className="search-result-kicker">User</span>
        <strong className="search-result-title">{title}</strong>
        <span className="search-result-meta">@{item.username || item.id}</span>
        {stats.length ? <span className="search-result-detail">{stats.join(' - ')}</span> : null}
      </div>
      <Icon className="search-card-arrow" icon="solar:arrow-right-up-linear" size={18} />
    </Link>
  );
}

function SearchListCover({ item }) {
  const imageSrc = getImageSrc(item.coverUrl);

  if (!imageSrc) {
    return (
      <div className="search-list-cover search-list-cover-empty">
        <Icon icon="solar:list-bold" size={22} />
      </div>
    );
  }

  return (
    <div className="search-list-cover">
      <AdaptiveImage
        fill
        alt={item.title || 'List cover'}
        className="object-cover"
        src={imageSrc}
        sizes="96px"
        loading="lazy"
        decoding="async"
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

function SearchListCard({ item }) {
  const detailPath = item.href || (item.owner?.username ? `/account/${item.owner.username}/lists/${item.slug}` : null);
  const stats = [
    formatCount(item.itemsCount, 'film'),
    formatCount(item.likesCount, 'like'),
    formatCount(item.reviewsCount, 'review'),
  ]
    .filter(Boolean)
    .join(' - ');
  const card = (
    <>
      <SearchListCover item={item} />
      <div className="search-community-copy">
        <span className="search-result-kicker">List</span>
        <strong className="search-result-title">{item.title || 'Untitled List'}</strong>
        <span className="search-result-meta">
          by {item.owner?.displayName || item.owner?.username || 'Anonymous User'}
        </span>
        {item.description ? <span className="search-result-detail">{item.description}</span> : null}
        {stats ? <span className="search-result-detail search-result-detail-compact">{stats}</span> : null}
      </div>
      <Icon className="search-card-arrow" icon="solar:arrow-right-up-linear" size={18} />
    </>
  );

  if (!detailPath) {
    return <article className="search-community-card">{card}</article>;
  }

  return (
    <Link href={detailPath} className="search-community-card">
      {card}
    </Link>
  );
}

function SearchReviewPoster({ item }) {
  const imageSrc = getImageSrc(item.subject?.poster);

  if (!imageSrc) {
    return (
      <div className="search-review-poster search-review-poster-empty">
        <Icon icon="solar:chat-round-like-bold" size={22} />
      </div>
    );
  }

  return (
    <div className="search-review-poster">
      <AdaptiveImage
        fill
        alt={item.subject?.title || 'Review subject'}
        className="object-cover"
        src={imageSrc}
        sizes="72px"
        loading="lazy"
        decoding="async"
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

function SearchReviewCard({ item }) {
  const detailPath = item.href || item.subject?.href || null;
  const rating = Number.isFinite(Number(item.rating)) ? `${Number(item.rating).toFixed(1)} rated` : null;
  const card = (
    <>
      <SearchReviewPoster item={item} />
      <div className="search-community-copy">
        <span className="search-result-kicker">Review</span>
        <strong className="search-result-title">{item.subject?.title || 'Untitled'}</strong>
        <span className="search-result-meta">
          {item.user?.displayName || item.user?.username || 'Anonymous User'}
          {rating ? ` - ${rating}` : ''}
        </span>
        <span className="search-result-detail">
          {item.isSpoiler ? 'Spoiler review' : item.content || 'Review without text'}
        </span>
      </div>
      <Icon className="search-card-arrow" icon="solar:arrow-right-up-linear" size={18} />
    </>
  );

  if (!detailPath) {
    return <article className="search-community-card">{card}</article>;
  }

  return (
    <Link href={detailPath} className="search-community-card">
      {card}
    </Link>
  );
}

function SearchCommunityCard({ item }) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return <SearchUserCard item={item} />;
  }

  if (item.media_type === SEARCH_TYPES.LIST) {
    return <SearchListCard item={item} />;
  }

  return <SearchReviewCard item={item} />;
}

function SearchEmptyState({ hasActiveMovieFilters, searchType, trimmedQuery }) {
  const message = !trimmedQuery
    ? 'Use the navigation search to query movies, people, users, lists, and reviews.'
    : hasActiveMovieFilters && searchType === SEARCH_TYPES.MOVIE
      ? 'No results found for the selected movie filters.'
      : 'No results found for this query.';

  return (
    <div className="search-empty-state">
      <Icon icon="solar:magnifer-linear" size={20} />
      <span>{message}</span>
    </div>
  );
}

function SearchIntroSection({ trimmedQuery, visibleCount }) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'search-intro-section flex flex-col')}>
        <AccountSectionHeading
          icon="solar:magnifer-linear"
          showSeeMore={false}
          summaryLabel={trimmedQuery ? `${visibleCount} Visible` : 'Index Ready'}
          title="Search"
        />
        <div className="account-detail-section-body search-intro-body">
          <p className="search-intro-copy">
            Search keeps catalog and community results in one grid-aware surface without leaving the Tvizzie route
            system.
          </p>
          <div className="search-scope-grid" aria-label="Search scopes">
            <span>Movies</span>
            <span>People</span>
            <span>Users</span>
            <span>Lists</span>
            <span>Reviews</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SearchResultsSection({
  canLoadMore,
  decadeOptions,
  genreOptions,
  hasActiveMovieFilters,
  loading,
  loadingMore,
  movieFilters,
  onLoadMore,
  onMovieFiltersChange,
  onMovieFiltersReset,
  searchType,
  shouldShowMovieFilters,
  trimmedQuery,
  visibleResults,
  yearOptions,
}) {
  const mediaResults = visibleResults.filter(isMediaResult);
  const communityResults = visibleResults.filter(isCommunityResult);
  const showMedia = mediaResults.length > 0;
  const showCommunity = communityResults.length > 0;
  const showEmpty = Boolean(trimmedQuery) && !loading && !visibleResults.length;

  return (
    <div className="account-detail-grid-content relative min-h-dvh w-full overflow-hidden bg-black">
      <AccountGridFrame routeKey="search" className={cn('flex flex-col gap-0 px-0', ACCOUNT_ROUTE_SHELL_CLASS)}>
        <SearchIntroSection trimmedQuery={trimmedQuery} visibleCount={visibleResults.length} />

        <div className="account-detail-hero-divider">
          <AccountGridDivider />
        </div>

        <main className="account-detail-grid-main search-page-main">
          {shouldShowMovieFilters ? (
            <AccountSectionLayout
              icon="solar:tuning-2-bold"
              summaryLabel={hasActiveMovieFilters ? 'Filtered' : 'Any movie'}
              title="Movie Filters"
              contentClassName="search-filter-body"
            >
              <div className="account-filter-bar account-detail-full-width-item search-filter-panel">
                <SearchMovieFilterBar
                  decadeOptions={decadeOptions}
                  filters={movieFilters}
                  genreOptions={genreOptions}
                  onChange={onMovieFiltersChange}
                  onReset={hasActiveMovieFilters ? onMovieFiltersReset : undefined}
                  yearOptions={yearOptions}
                />
              </div>
            </AccountSectionLayout>
          ) : null}

          {!trimmedQuery ? (
            <AccountSectionLayout icon="solar:keyboard-bold" summaryLabel="Waiting" title="Ready">
              <SearchEmptyState trimmedQuery={trimmedQuery} />
            </AccountSectionLayout>
          ) : null}

          {showMedia ? (
            <AccountSectionLayout
              icon={searchType === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:clapperboard-play-bold'}
              summaryLabel={`${mediaResults.length} Visible`}
              title={searchType === SEARCH_TYPES.PERSON ? 'People Results' : 'Movies And People'}
            >
              <div className="search-media-grid">
                {mediaResults.map((item) => (
                  <div key={`${item.media_type}-${item.id}`}>
                    <SearchGridItem item={item} />
                  </div>
                ))}
              </div>
            </AccountSectionLayout>
          ) : null}

          {showCommunity ? (
            <AccountSectionLayout
              icon="solar:users-group-rounded-bold"
              summaryLabel={`${communityResults.length} Visible`}
              title="Community Results"
            >
              <div className="search-community-grid">
                {communityResults.map((item) => (
                  <SearchCommunityCard key={`${item.media_type}-${item.id}`} item={item} />
                ))}
              </div>
            </AccountSectionLayout>
          ) : null}

          {showEmpty ? (
            <AccountSectionLayout icon="solar:danger-triangle-bold" summaryLabel="Empty" title="No Results">
              <SearchEmptyState
                hasActiveMovieFilters={hasActiveMovieFilters}
                searchType={searchType}
                trimmedQuery={trimmedQuery}
              />
            </AccountSectionLayout>
          ) : null}

          {canLoadMore ? (
            <section className="account-detail-grid-subsection bg-transparent">
              <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'search-load-more-section')}>
                <button type="button" className="search-load-more-button" disabled={loadingMore} onClick={onLoadMore}>
                  {loadingMore ? 'Loading' : 'Load more results'}
                </button>
              </div>
            </section>
          ) : null}
        </main>

        <NavHeightSpacer />
      </AccountGridFrame>
    </div>
  );
}
