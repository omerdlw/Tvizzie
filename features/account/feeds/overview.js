'use client';

import AccountActivityOverview from '@/features/account/overview/activity';
import AccountFavoritesOverview from '@/features/account/overview/favorites';
import AccountListsOverview from '@/features/account/overview/lists';
import AccountReviewsOverview from '@/features/account/overview/reviews';
import AccountWatchedOverview from '@/features/account/overview/watched';
import AccountWatchlistOverview from '@/features/account/overview/watchlist';
import { AccountPageShell } from '@/features/account/components/layout';
import { ProfileMediaActions } from '@/features/account/components/media-grid';
import { AccountSectionState } from '@/features/account/components/section-wrapper';

const LIMITS = { activity: 5, media: 6, favorites: 5, lists: 3 };

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
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = model;

  const currentUserId = auth.user?.id || null;
  const buildHref = (suffix) => (profileHandle ? `/account/${profileHandle}${suffix}` : null);

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
      registry={RegistryComponent ? <RegistryComponent /> : null}
      resolvedUserId={resolvedUserId}
      skeletonVariant="overview"
      username={profileHandle}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
    >
      {!canViewProfileCollections ? (
        <AccountSectionState message="This profile is private." />
      ) : (
        <>
          {favoriteShowcase.length > 0 && (
            <AccountFavoritesOverview
              icon="solar:star-bold"
              isOwner={isOwner}
              items={favoriteShowcase.slice(0, LIMITS.favorites)}
              title="Favorites"
              titleHref={buildHref('/likes')}
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
            />
          )}

          {watched.length > 0 && (
            <AccountWatchedOverview
              emptyMessage="No watched titles yet"
              icon="solar:eye-bold"
              items={watched.slice(0, LIMITS.media)}
              showSeeMore={watchedCount > LIMITS.media}
              title="Watched"
              titleHref={buildHref('/watched')}
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
            />
          )}

          {watchlist.length > 0 && (
            <AccountWatchlistOverview
              icon="solar:bookmark-bold"
              isOwner={isOwner}
              items={watchlist.slice(0, LIMITS.media)}
              onRemoveItem={handleRequestRemoveWatchlistItem}
              showSeeMore={watchlistCount > LIMITS.media}
              title="Watchlist"
              titleHref={buildHref('/watchlist')}
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
            />
          )}

          <AccountActivityOverview
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

          {lists.length > 0 && (
            <AccountListsOverview
              icon="solar:list-broken"
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

          {authoredReviews.length > 0 && (
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
              showOwnActions={isOwner}
              showSeeMore={hasMoreAuthoredReviews}
              summaryLabel=""
              title="Recent Reviews"
              titleHref={buildHref('/reviews')}
            />
          )}
        </>
      )}
    </AccountPageShell>
  );
}
