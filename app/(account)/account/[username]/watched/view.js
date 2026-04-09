import AccountWatchedFeed from '@/features/account/feeds/watched';
import { AccountPageShell } from '@/features/account/profile/layout';
import Registry from './registry';

export default function WatchedView({
  auth,
  canShowWatchedGrid,
  currentPage,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleFollow,
  handleOpenFollowList,
  handleRequestRemoveWatchedItem,
  handleSignInRequest,
  isBioSurfaceOpen,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  listCount,
  loadError,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
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
      activeSection="watched"
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
      skeletonVariant="collection"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      <AccountWatchedFeed
        auth={auth}
        canShowWatchedGrid={canShowWatchedGrid}
        currentPage={currentPage}
        isOwner={isOwner}
        loadError={loadError}
        watchedItems={watchedItems}
        username={username}
        onRemoveItem={handleRequestRemoveWatchedItem}
      />
    </AccountPageShell>
  );
}
