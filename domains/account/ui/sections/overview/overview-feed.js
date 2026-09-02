'use client';

import { useCallback } from 'react';
import AccountActivityOverview from '@/domains/account/ui/sections/overview/activity';
import AccountFavoritesOverview from '@/domains/account/ui/sections/overview/favorites';
import AccountListsOverview from '@/domains/account/ui/sections/overview/lists';
import AccountReviewsOverview from '@/domains/account/ui/sections/overview/reviews';
import AccountWatchedOverview from '@/domains/account/ui/sections/overview/watched';
import AccountWatchlistOverview from '@/domains/account/ui/sections/overview/watchlist';
import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import { ProfileMediaActions } from '@/domains/account/ui/components/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';

const LIMITS = { activity: 6, media: 6, favorites: 6, lists: 6 };

export default function AccountOverviewFeed({ overviewData = {}, RegistryComponent = null }) {
  const {
    auth = { isAuthenticated: false, isReady: false, user: null },
    authoredReviews = [],
    authoredReviewsError,
    authoredReviewsLoading,
    canViewPrivateContent = false,
    canViewProfileCollections = false,
    favoriteShowcase = [],
    followerCount = 0,
    followingCount = 0,
    followState,
    handleDeleteReview,
    handleEditReview,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleDeleteList,
    handleEditList,
    handleRequestRemoveLike,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    hasMoreAuthoredReviews,
    initialActivityFeed = null,
    isFollowLoading = false,
    isListsLoading = false,
    isOwner = false,
    isPageLoading = false,
    isPrivateProfile = false,
    isLikesLoading = false,
    isViewerReady = false,
    isWatchedLoading = false,
    isWatchlistLoading = false,
    likeCount = 0,
    likedLists = [],
    likes = [],
    listCount = 0,
    lists = [],
    profile,
    profileHandle,
    reviewCount = 0,
    resolvedUserId,
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = overviewData;

  const currentUserId = auth.user?.id || null;
  const buildHref = (suffix) => (profileHandle ? `/account/${profileHandle}${suffix}` : null);

  const hasFavorites = Array.isArray(favoriteShowcase) && favoriteShowcase.length > 0;
  const hasLikes = likeCount > 0 || (Array.isArray(likes) && likes.length > 0);
  const hasWatched = watchedCount > 0 || (Array.isArray(watched) && watched.length > 0);
  const hasWatchlist = watchlistCount > 0 || (Array.isArray(watchlist) && watchlist.length > 0);
  const hasLists = listCount > 0 || (Array.isArray(lists) && lists.length > 0);
  const initialActivityItems = Array.isArray(initialActivityFeed?.items)
    ? initialActivityFeed.items
    : [];
  const hasActivity =
    initialActivityItems.length > 0 || Number(initialActivityFeed?.totalCount || 0) > 0;
  const shouldRenderActivity = hasActivity;
  const hasReviews = Array.isArray(authoredReviews) && authoredReviews.length > 0;

  const isOverviewEmpty =
    !isLikesLoading &&
    !isWatchedLoading &&
    !isWatchlistLoading &&
    !isListsLoading &&
    !authoredReviewsLoading &&
    !hasFavorites &&
    !hasLikes &&
    !hasWatched &&
    !hasWatchlist &&
    !hasLists &&
    !shouldRenderActivity &&
    !hasReviews;

  let sectionCounter = 0;

  const getSectionProps = () => {
    const index = sectionCounter++;
    return {
      isInitialSection: index === 0,
      baseDelay: index === 0 ? 0.06 : undefined,
      revealDelay: index,
    };
  };

  const renderFavoriteOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveLike}
          removeLabel={`Remove ${item.title || item.name} from favorites`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveLike, currentUserId],
  );

  const renderWatchlistOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveWatchlistItem}
          removeLabel={`Remove ${item.title || item.name} from watchlist`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveWatchlistItem, currentUserId],
  );

  const renderWatchedOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveWatchedItem}
          removeLabel={`Remove ${item.title || item.name} from watched`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveWatchedItem, currentUserId],
  );

  const renderLikesOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveLike}
          removeLabel={`Remove ${item.title || item.name} from likes`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveLike, currentUserId],
  );

  return (
    <AccountPageShell
      activeSection="overview"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading || (!username && auth.isReady && !auth.isAuthenticated)}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      profile={profile}
      reviewsCount={reviewCount}
      registry={RegistryComponent ? <RegistryComponent /> : null}
      resolvedUserId={resolvedUserId}
      skeletonVariant="overview"
      username={profileHandle}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
    >
      <div className="flex w-full flex-col gap-8 sm:gap-10 lg:gap-12">
        {!canViewProfileCollections ? (
          <AccountSectionState message="This profile is private" />
        ) : isOverviewEmpty ? (
          <AccountSectionState message="This account has no activity or content yet" />
        ) : (
          <>
            {hasFavorites && (
              <AccountFavoritesOverview
                key="section-favorites"
                {...getSectionProps()}
                icon="solar:star-bold"
                isOwner={isOwner}
                items={favoriteShowcase.slice(0, LIMITS.favorites)}
                title="Favorites"
                titleHref={buildHref('/likes')}
                renderOverlay={renderFavoriteOverlay}
              />
            )}

            {(hasWatchlist || isWatchlistLoading) && (
              <AccountWatchlistOverview
                key="section-watchlist"
                {...getSectionProps()}
                icon="solar:bookmark-bold"
                isLoading={isWatchlistLoading}
                isOwner={isOwner}
                items={watchlist.slice(0, LIMITS.media)}
                onRemoveItem={handleRequestRemoveWatchlistItem}
                showSeeMore={watchlistCount > LIMITS.media}
                title="Watchlist"
                titleHref={buildHref('/watchlist')}
                renderOverlay={renderWatchlistOverlay}
              />
            )}

            {(hasWatched || isWatchedLoading) && (
              <AccountWatchedOverview
                key="section-watched"
                {...getSectionProps()}
                emptyMessage="No watched titles yet"
                icon="solar:eye-bold"
                isLoading={isWatchedLoading}
                items={watched.slice(0, LIMITS.media)}
                showSeeMore={watchedCount > LIMITS.media}
                title="Watched"
                titleHref={buildHref('/watched')}
                renderOverlay={renderWatchedOverlay}
              />
            )}

            {(hasLikes || isLikesLoading) && (
              <AccountFavoritesOverview
                key="section-likes"
                {...getSectionProps()}
                cardLimit={LIMITS.media}
                emptyMessage="No liked titles yet"
                icon="solar:heart-bold"
                isLoading={isLikesLoading}
                isOwner={isOwner}
                items={likes.slice(0, LIMITS.media)}
                showSeeMore={likeCount > LIMITS.media}
                title="Likes"
                titleHref={buildHref('/likes')}
                wideGrid
                renderOverlay={renderLikesOverlay}
              />
            )}

            {(hasLists || isListsLoading) && (
              <AccountListsOverview
                key="section-lists"
                {...getSectionProps()}
                icon="solar:list-broken"
                isLoading={isListsLoading}
                items={lists.slice(0, LIMITS.lists)}
                isOwner={isOwner}
                onDeleteList={handleDeleteList}
                onEditList={handleEditList}
                ownerUsername={profileHandle}
                showSeeMore={listCount > LIMITS.lists}
                title="Lists"
                titleHref={buildHref('/lists')}
              />
            )}

            {shouldRenderActivity && (
              <AccountActivityOverview
                key="section-activity"
                {...getSectionProps()}
                canViewPrivateContent={canViewPrivateContent}
                icon="solar:bolt-bold"
                initialFeed={initialActivityFeed}
                isOwner={isOwner}
                isPrivateProfile={isPrivateProfile}
                isViewerReady={isViewerReady}
                limit={LIMITS.activity}
                resolvedUserId={resolvedUserId}
                summaryLabel=""
                title="Recent Activity"
                titleHref={buildHref('/activity')}
              />
            )}

            {(hasReviews || authoredReviewsLoading) && (
              <AccountReviewsOverview
                key="section-reviews"
                {...getSectionProps()}
                currentUserId={currentUserId}
                icon="solar:chat-round-bold"
                isLoading={authoredReviewsLoading}
                items={authoredReviews}
                likedLists={likedLists}
                likes={likes}
                loadError={authoredReviewsError}
                onDeleteRequest={handleDeleteReview}
                onEdit={handleEditReview}
                onLike={handleLikeReview}
                showOwnActions={isOwner}
                showSeeMore={hasMoreAuthoredReviews}
                summaryLabel=""
                title="Recent Reviews"
                titleHref={buildHref('/reviews')}
              />
            )}
          </>
        )}
      </div>
    </AccountPageShell>
  );
}
