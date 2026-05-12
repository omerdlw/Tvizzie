'use client';

import AccountActivityOverview from '@/features/account/collections/activity/overview';
import AccountFavoritesOverview from '@/features/account/collections/favorites/overview';
import AccountListsOverview from '@/features/account/collections/lists/overview';
import AccountReviewsOverview from '@/features/account/collections/reviews/overview';
import AccountWatchedOverview from '@/features/account/collections/watched/overview';
import AccountWatchlistOverview from '@/features/account/collections/watchlist/overview';
import { AccountPageShell } from '@/features/account/components/layout';
import { ProfileMediaActions } from '@/features/account/components/media-grid';
import { AccountSectionState } from '@/features/account/components/section-wrapper';

const OVERVIEW_ACTIVITY_LIMIT = 5;
const OVERVIEW_MEDIA_LIMIT = 6;
const OVERVIEW_FAVORITES_LIMIT = 5;
const OVERVIEW_LIST_LIMIT = 3;

function buildSectionHref(username, suffix = '') {
  return username ? `/account/${username}${suffix}` : null;
}

export default function AccountOverviewFeed({ model = {}, RegistryComponent = null }) {
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
    isOwner = false,
    isPageLoading = false,
    isPrivateProfile = false,
    isViewerReady = false,
    likeCount = 0,
    likes = [],
    listCount = 0,
    lists = [],
    profile,
    profileHandle,
    resolvedUserId,
    setIsBioSurfaceOpen,
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = model;

  const shouldShowFavorites = favoriteShowcase.length > 0;
  const shouldShowWatched = watched.length > 0;
  const shouldShowWatchlist = watchlist.length > 0;
  const shouldShowLists = lists.length > 0;
  const shouldShowReviews = authoredReviews.length > 0;
  const currentUserId = auth.user?.id || null;
  const isShellLoading = isPageLoading || (!username && auth.isReady && !auth.isAuthenticated);
  const activityHref = buildSectionHref(profileHandle, '/activity');
  const likesHref = buildSectionHref(profileHandle, '/likes');
  const listsHref = buildSectionHref(profileHandle, '/lists');
  const reviewsHref = buildSectionHref(profileHandle, '/reviews');
  const watchedHref = buildSectionHref(profileHandle, '/watched');
  const watchlistHref = buildSectionHref(profileHandle, '/watchlist');
  const pageRegistry = RegistryComponent ? <RegistryComponent /> : null;

  return (
    <AccountPageShell
      activeSection="overview"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isShellLoading}
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
              isOwner={isOwner}
              items={favoriteShowcase.slice(0, OVERVIEW_FAVORITES_LIMIT)}
              renderOverlay={(item) =>
                isOwner ? (
                  <ProfileMediaActions
                    media={item}
                    onRemoveItem={handleRequestRemoveLike}
                    removeLabel={`Remove ${item.title || item.name} from favorites`}
                    userId={currentUserId}
                  />
                ) : null
              }
              revealIndex={0}
              title="Favorites"
              titleHref={likesHref}
            />
          ) : null}

          {shouldShowWatched ? (
            <AccountWatchedOverview
              emptyMessage="No watched films yet"
              icon="solar:eye-bold"
              items={watched.slice(0, OVERVIEW_MEDIA_LIMIT)}
              renderOverlay={(item) =>
                isOwner ? (
                  <ProfileMediaActions
                    media={item}
                    onRemoveItem={handleRequestRemoveWatchedItem}
                    removeLabel={`Remove ${item.title || item.name} from watched`}
                    userId={currentUserId}
                  />
                ) : null
              }
              revealIndex={1}
              showSeeMore={watchedCount > OVERVIEW_MEDIA_LIMIT}
              title="Watched"
              titleHref={watchedHref}
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
                  <ProfileMediaActions
                    media={item}
                    onRemoveItem={handleRequestRemoveWatchlistItem}
                    removeLabel={`Remove ${item.title || item.name} from watchlist`}
                    userId={currentUserId}
                  />
                ) : null
              }
              revealIndex={2}
              showSeeMore={watchlistCount > OVERVIEW_MEDIA_LIMIT}
              title="Watchlist"
              titleHref={watchlistHref}
            />
          ) : null}

          <AccountActivityOverview
            canViewPrivateContent={canViewPrivateContent}
            icon="solar:bolt-bold"
            initialFeed={initialActivityFeed}
            isOwner={isOwner}
            isPrivateProfile={isPrivateProfile}
            isViewerReady={isViewerReady}
            limit={OVERVIEW_ACTIVITY_LIMIT}
            revealIndex={3}
            resolvedUserId={resolvedUserId}
            summaryLabel=""
            title="Recent Activity"
            titleHref={activityHref}
          />

          {shouldShowLists ? (
            <AccountListsOverview
              icon="solar:list-broken"
              items={lists.slice(0, OVERVIEW_LIST_LIMIT)}
              isOwner={isOwner}
              onDeleteList={handleDeleteList}
              onEditList={handleEditList}
              ownerUsername={profileHandle}
              revealIndex={4}
              showSeeMore={listCount > OVERVIEW_LIST_LIMIT}
              title="Lists"
              titleHref={listsHref}
            />
          ) : null}

          {shouldShowReviews ? (
            <AccountReviewsOverview
              currentUserId={currentUserId}
              icon="solar:chat-round-bold"
              isLoading={authoredReviewsLoading}
              items={authoredReviews}
              likes={likes}
              loadError={authoredReviewsError}
              onDeleteRequest={handleDeleteReview}
              onEdit={handleEditReview}
              onLike={handleLikeReview}
              revealIndex={5}
              showOwnActions={isOwner}
              showSeeMore={hasMoreAuthoredReviews}
              summaryLabel=""
              title="Recent Reviews"
              titleHref={reviewsHref}
            />
          ) : null}
        </>
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
