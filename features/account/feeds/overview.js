'use client';

import AccountActivityOverview from '@/features/account/overview/activity';
import AccountFavoritesOverview from '@/features/account/overview/favorites';
import AccountReviewsOverview from '@/features/account/overview/reviews';
import AccountWatchedOverview from '@/features/account/overview/watched';
import AccountWatchlistOverview from '@/features/account/overview/watchlist';
import { AccountPageShell } from '@/features/account/profile/layout';
import { AccountProfileMediaActions } from '@/features/account/profile/media-grid';
import { AccountSectionState } from '@/features/account/profile/section-wrapper';

const OVERVIEW_MEDIA_LIMIT = 5;

function buildSectionHref(username, suffix = '') {
  return username ? `/account/${username}${suffix}` : null;
}

export default function AccountOverviewFeed({
  model = {},
  RegistryComponent = null,
}) {
  const {
    auth = { isAuthenticated: false, isReady: false, user: null },
    activityError,
    activityItems = [],
    activityLoading,
    authoredReviews = [],
    authoredReviewsError,
    authoredReviewsLoading,
    canViewProfileCollections = false,
    favoriteShowcase = [],
    followerCount = 0,
    followingCount = 0,
    followState,
    handleDeleteReview,
    handleEditProfile,
    handleEditReview,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    handleSignInRequest,
    hasMoreActivityItems,
    hasMoreAuthoredReviews,
    isBioSurfaceOpen = false,
    isFollowLoading = false,
    isOwner = false,
    isPageLoading = false,
    isResolvingProfile = false,
    itemRemoveConfirmation,
    likeCount = 0,
    likes = [],
    listCount = 0,
    navDescription,
    pendingFollowRequestCount,
    profile,
    profileHandle,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = model;

  const shouldShowFavorites = favoriteShowcase.length > 0;
  const shouldShowWatched = watched.length > 0;
  const shouldShowWatchlist = watchlist.length > 0;
  const shouldShowActivity = activityItems.length > 0;
  const shouldShowReviews = authoredReviews.length > 0;

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
      auth={auth}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      navDescription={navDescription}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;

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
      onReadMore={() => setIsBioSurfaceOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="overview"
      username={profileHandle}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
    >
      {canViewProfileCollections ? (
        <>
          {shouldShowFavorites ? (
            <AccountFavoritesOverview
              icon="solar:star-bold"
              items={favoriteShowcase.slice(0, OVERVIEW_MEDIA_LIMIT)}
              showSeeMore={favoriteShowcase.length > OVERVIEW_MEDIA_LIMIT}
              summaryLabel={`${favoriteShowcase.length} selected`}
              title="Favorites"
              titleHref={buildSectionHref(profileHandle, '/likes')}
            />
          ) : null}

          {shouldShowWatched ? (
            <AccountWatchedOverview
              emptyMessage="No watched films yet"
              icon="solar:eye-bold"
              items={watched.slice(0, OVERVIEW_MEDIA_LIMIT)}
              renderOverlay={(item) =>
                isOwner ? (
                  <AccountProfileMediaActions
                    media={item}
                    onRemoveItem={handleRequestRemoveWatchedItem}
                    removeLabel={`Remove ${item.title || item.name} from watched`}
                    userId={auth.user?.id || null}
                  />
                ) : null
              }
              showSeeMore={watchedCount > OVERVIEW_MEDIA_LIMIT}
              summaryLabel={`${watchedCount} titles`}
              title="Watched"
              titleHref={buildSectionHref(profileHandle, '/watched')}
            />
          ) : null}

          {shouldShowWatchlist ? (
            <AccountWatchlistOverview
              icon="solar:bookmark-bold"
              isOwner={isOwner}
              items={watchlist.slice(0, OVERVIEW_MEDIA_LIMIT)}
              onRemoveItem={handleRequestRemoveWatchlistItem}
              renderOverlay={(item) =>
                isOwner ? (
                  <AccountProfileMediaActions
                    media={item}
                    onRemoveItem={handleRequestRemoveWatchlistItem}
                    removeLabel={`Remove ${item.title || item.name} from watchlist`}
                    userId={auth.user?.id || null}
                  />
                ) : null
              }
              showSeeMore={watchlistCount > OVERVIEW_MEDIA_LIMIT}
              summaryLabel={`${watchlistCount} titles`}
              title="Watchlist"
              titleHref={buildSectionHref(profileHandle, '/watchlist')}
            />
          ) : null}

          {shouldShowActivity ? (
            <AccountActivityOverview
              hasMore={hasMoreActivityItems}
              icon="solar:bolt-bold"
              isLoading={activityLoading}
              items={activityItems}
              loadError={activityError}
              showcaseGridClassName="grid-cols-3 gap-3 lg:grid-cols-5"
              showSeeMore={hasMoreActivityItems}
              summaryLabel=""
              title="Recent Activity"
              titleHref={buildSectionHref(profileHandle, '/activity')}
              variant="showcase"
            />
          ) : null}

          {shouldShowReviews ? (
            <AccountReviewsOverview
              currentUserId={auth.user?.id || null}
              icon="solar:chat-round-bold"
              isLoading={authoredReviewsLoading}
              items={authoredReviews}
              likes={likes}
              loadError={authoredReviewsError}
              onDeleteRequest={handleDeleteReview}
              onEdit={handleEditReview}
              onLike={handleLikeReview}
              showOwnActions={isOwner}
              showSeeMore={hasMoreAuthoredReviews}
              summaryLabel=""
              title="Recent Reviews"
              titleHref={buildSectionHref(profileHandle, '/reviews')}
            />
          ) : null}
        </>
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
