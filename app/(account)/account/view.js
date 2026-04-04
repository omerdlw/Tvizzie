import AccountActivityFeed from '@/features/account/sections/activity-feed';
import AccountFavoritesSection from '@/features/account/profile/favorites-section';
import AccountPageShell from '@/features/account/page-shell';
import AccountProfileMediaActions from '@/features/account/profile/profile-media-actions';
import AccountReviewFeed from '@/features/account/sections/review-feed';
import AccountSectionState from '@/features/account/section-state';
import AccountWatchlistSection from '@/features/account/sections/watchlist-section';
import Registry from './registry';

const OVERVIEW_MEDIA_LIMIT = 5;

function buildSectionHref(username, suffix = '') {
  return username ? `/account/${username}${suffix}` : null;
}

export default function AccountView({
  auth,
  activityError,
  activityItems,
  activityLoading,
  authoredReviews,
  authoredReviewsError,
  authoredReviewsLoading,
  canViewProfileCollections,
  favoriteShowcase,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleEditReview,
  handleFollow,
  handleDeleteReview,
  handleLikeReview,
  handleOpenFollowList,
  handleRequestRemoveWatchlistItem,
  handleSignInRequest,
  hasMoreAuthoredReviews,
  hasMoreActivityItems,
  isBioSurfaceOpen,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  likes,
  listCount,
  navDescription,
  pendingFollowRequestCount,
  profile,
  profileHandle,
  resolveError,
  resolvedUserId,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  watched,
  watchedCount,
  watchlistCount,
  watchlist,
  RegistryComponent = Registry,
}) {
  const shouldShowFavorites = favoriteShowcase.length > 0;
  const shouldShowWatched = watched.length > 0;
  const shouldShowWatchlist = watchlist.length > 0;
  const shouldShowActivity = activityItems.length > 0;
  const shouldShowReviews = authoredReviews.length > 0;

  const pageRegistry = (
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
            <AccountFavoritesSection
              icon="solar:star-bold"
              items={favoriteShowcase.slice(0, OVERVIEW_MEDIA_LIMIT)}
              showSeeMore={favoriteShowcase.length > OVERVIEW_MEDIA_LIMIT}
              summaryLabel={`${favoriteShowcase.length} selected`}
              title="Favorites"
              titleHref={buildSectionHref(profileHandle, '/likes')}
            />
          ) : null}

          {shouldShowWatched ? (
            <AccountWatchlistSection
              emptyMessage="No watched films yet"
              icon="solar:eye-bold"
              items={watched.slice(0, OVERVIEW_MEDIA_LIMIT)}
              showSeeMore={watchedCount > OVERVIEW_MEDIA_LIMIT}
              summaryLabel={`${watchedCount} titles`}
              title="Watched"
              titleHref={buildSectionHref(profileHandle, '/watched')}
            />
          ) : null}

          {shouldShowWatchlist ? (
            <AccountWatchlistSection
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
            <AccountActivityFeed
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
            <AccountReviewFeed
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
