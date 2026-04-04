import AccountPageShell from '@/features/account/page-shell';
import AccountReviewFeed from '@/features/account/sections/review-feed';
import AccountSectionState from '@/features/account/section-state';
import Registry from './registry';

export default function ReviewsView({
  auth,
  canShowReviews,
  feedError,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleEditReview,
  handleFollow,
  handleDeleteReview,
  handleLike,
  handleOpenFollowList,
  handleSignInRequest,
  hasMore,
  isBioSurfaceOpen,
  isFeedLoading,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  likes,
  listCount,
  loadReviews,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
  reviews,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  watchedItems,
  watchlistCount,
}) {
  const pageRegistry = (
    <Registry
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
      activeSection="reviews"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading}
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
      skeletonVariant="reviews"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowReviews ? (
        <AccountReviewFeed
          currentUserId={auth.user?.id || null}
          emptyMessage="No reviews yet"
          hasMore={hasMore}
          icon="solar:chat-round-bold"
          isLoading={isFeedLoading}
          items={reviews}
          likes={likes}
          loadError={feedError}
          onDeleteRequest={handleDeleteReview}
          onEdit={handleEditReview}
          onLike={handleLike}
          onLoadMore={() => loadReviews({ append: true })}
          showOwnActions={isOwner}
          title="Reviews"
          watchedItems={watchedItems}
        />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
