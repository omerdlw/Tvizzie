'use client';

import Link from 'next/link';

import { AppRouteItem, AppRouteShell } from '@/app/motion';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS, TMDB_IMG } from '@/core/constants';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import SearchMovieFilterBar from '@/features/account/filters/media/search-movie-bar';
import { AccountGridDivider, AccountGridFrame } from '@/features/account/components/grid-animation';
import AccountSectionLayout from '@/features/account/components/section-wrapper';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';
import { SEARCH_TYPES } from '@/features/search/constants';
import SearchGridItem from '@/features/search/grid-item';

const SEARCH_COMMUNITY_CARD_CLASS =
  'group relative grid min-h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border border-white/10 bg-primary/80 p-3 transition-colors hover:border-white/20 hover:bg-white/10';
const SEARCH_MEDIA_FRAME_CLASS = 'border border-white/10 bg-white/10 text-white/60';

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
    <Link
      href={detailPath}
      className={SEARCH_COMMUNITY_CARD_CLASS}
      data-soft-hover="row"
    >
      <div className={cn(SEARCH_MEDIA_FRAME_CLASS, 'relative h-18 w-18 overflow-hidden')}>
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.6875rem] leading-none font-bold text-white/60 uppercase">User</span>
        <strong className="overflow-hidden truncate text-base leading-tight text-white uppercase">{title}</strong>
        <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/70">
          @{item.username || item.id}
        </span>
        {stats.length ? (
          <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/60">
            {stats.join(' - ')}
          </span>
        ) : null}
      </div>
      <Icon className="text-white/60 group-hover:text-white" icon="solar:arrow-right-up-linear" size={18} />
    </Link>
  );
}

function SearchListCover({ item }) {
  const imageSrc = getImageSrc(item.coverUrl);

  if (!imageSrc) {
    return (
      <div className={cn(SEARCH_MEDIA_FRAME_CLASS, 'center relative h-[5.75rem] w-18 overflow-hidden')}>
        <Icon icon="solar:list-bold" size={22} />
      </div>
    );
  }

  return (
    <div className={cn(SEARCH_MEDIA_FRAME_CLASS, 'relative h-[5.75rem] w-18 overflow-hidden')}>
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.6875rem] leading-none font-bold text-white/60 uppercase">List</span>
        <strong className="overflow-hidden truncate text-base leading-tight text-white uppercase">
          {item.title || 'Untitled List'}
        </strong>
        <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/70">
          by {item.owner?.displayName || item.owner?.username || 'Anonymous User'}
        </span>
        {item.description ? (
          <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/60">
            {item.description}
          </span>
        ) : null}
        {stats ? (
          <span className="overflow-hidden truncate text-xs font-bold text-white/60 uppercase">{stats}</span>
        ) : null}
      </div>
      <Icon className="text-white/60 group-hover:text-white" icon="solar:arrow-right-up-linear" size={18} />
    </>
  );

  if (!detailPath) {
    return (
      <article
        className={SEARCH_COMMUNITY_CARD_CLASS}
        data-soft-hover="row"
      >
        {card}
      </article>
    );
  }

  return (
    <Link
      href={detailPath}
      className={SEARCH_COMMUNITY_CARD_CLASS}
      data-soft-hover="row"
    >
      {card}
    </Link>
  );
}

function SearchReviewPoster({ item }) {
  const imageSrc = getImageSrc(item.subject?.poster);

  if (!imageSrc) {
    return (
      <div className={cn(SEARCH_MEDIA_FRAME_CLASS, 'center relative h-[5.75rem] w-15 overflow-hidden')}>
        <Icon icon="solar:chat-round-like-bold" size={22} />
      </div>
    );
  }

  return (
    <div className={cn(SEARCH_MEDIA_FRAME_CLASS, 'relative h-[5.75rem] w-15 overflow-hidden')}>
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.6875rem] leading-none font-bold text-white/60 uppercase">Review</span>
        <strong className="overflow-hidden truncate text-base leading-tight text-white uppercase">
          {item.subject?.title || 'Untitled'}
        </strong>
        <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/70">
          {item.user?.displayName || item.user?.username || 'Anonymous User'}
          {rating ? ` - ${rating}` : ''}
        </span>
        <span className="overflow-hidden truncate text-[0.8125rem] leading-snug text-white/60">
          {item.isSpoiler ? 'Spoiler review' : item.content || 'Review without text'}
        </span>
      </div>
      <Icon className="text-white/60 group-hover:text-white" icon="solar:arrow-right-up-linear" size={18} />
    </>
  );

  if (!detailPath) {
    return (
      <article
        className={SEARCH_COMMUNITY_CARD_CLASS}
        data-soft-hover="row"
      >
        {card}
      </article>
    );
  }

  return (
    <Link
      href={detailPath}
      className={SEARCH_COMMUNITY_CARD_CLASS}
      data-soft-hover="row"
    >
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
    <div className="flex min-h-20 items-center gap-3 border border-white/10 bg-primary/80 p-4 text-sm font-bold text-white/70">
      <Icon icon="solar:magnifer-linear" size={20} />
      <span>{message}</span>
    </div>
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
    <AppRouteShell className="account-detail-grid-content relative isolate min-h-dvh w-full overflow-hidden bg-black">
      <AccountGridFrame routeKey="search" className={cn('flex flex-col gap-0 px-0', ACCOUNT_ROUTE_SHELL_CLASS)}>
        <div className="account-detail-hero-divider">
          <AccountGridDivider />
        </div>

        <main className="account-detail-grid-main flex w-full min-w-0 flex-col gap-0">
          {shouldShowMovieFilters ? (
            <AppRouteItem
              className="account-filter-bar account-detail-full-width-item border-y border-white/10 bg-primary/80 py-3"
              index={0}
            >
              <SearchMovieFilterBar
                decadeOptions={decadeOptions}
                filters={movieFilters}
                genreOptions={genreOptions}
                onChange={onMovieFiltersChange}
                onReset={hasActiveMovieFilters ? onMovieFiltersReset : undefined}
                yearOptions={yearOptions}
              />
            </AppRouteItem>
          ) : null}

          {!trimmedQuery ? (
            <AccountSectionLayout icon="solar:keyboard-bold" revealIndex={1} summaryLabel="Waiting" title="Ready">
              <SearchEmptyState trimmedQuery={trimmedQuery} />
            </AccountSectionLayout>
          ) : null}

          {showMedia ? (
            <AccountSectionLayout
              icon={searchType === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:clapperboard-play-bold'}
              revealIndex={1}
              summaryLabel={`${mediaResults.length} Visible`}
              title={searchType === SEARCH_TYPES.PERSON ? 'People Results' : 'Movies And People'}
            >
              <div className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-8">
                {mediaResults.map((item, index) => (
                  <AppRouteItem key={`${item.media_type}-${item.id}`} index={index}>
                    <SearchGridItem item={item} />
                  </AppRouteItem>
                ))}
              </div>
            </AccountSectionLayout>
          ) : null}

          {showCommunity ? (
            <AccountSectionLayout
              icon="solar:users-group-rounded-bold"
              revealIndex={2}
              summaryLabel={`${communityResults.length} Visible`}
              title="Community Results"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {communityResults.map((item, index) => (
                  <AppRouteItem key={`${item.media_type}-${item.id}`} index={index}>
                    <SearchCommunityCard item={item} />
                  </AppRouteItem>
                ))}
              </div>
            </AccountSectionLayout>
          ) : null}

          {showEmpty ? (
            <AccountSectionLayout
              icon="solar:danger-triangle-bold"
              revealIndex={1}
              summaryLabel="Empty"
              title="No Results"
            >
              <SearchEmptyState
                hasActiveMovieFilters={hasActiveMovieFilters}
                searchType={searchType}
                trimmedQuery={trimmedQuery}
              />
            </AccountSectionLayout>
          ) : null}

          {canLoadMore ? (
            <section className="account-detail-grid-subsection bg-transparent">
              <AppRouteItem className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'flex justify-center px-4 py-8')} index={3}>
                <button
                  type="button"
                  className="min-h-11 min-w-56 border border-white/10 bg-white/10 px-5 text-xs font-extrabold text-white uppercase transition-colors hover:border-white/20 hover:bg-white/15 disabled:text-white/60"
                  data-soft-hover="control"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                >
                  {loadingMore ? 'Loading' : 'Load more results'}
                </button>
              </AppRouteItem>
            </section>
          ) : null}
        </main>

        <NavHeightSpacer />
      </AccountGridFrame>
    </AppRouteShell>
  );
}
