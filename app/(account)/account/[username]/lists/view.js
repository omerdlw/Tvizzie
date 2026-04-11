import AccountListsFeed from '@/features/account/feeds/lists';
import { AccountPageShell } from '@/features/account/shared/layout';
import Registry from './registry';

export default function ListsView({
  auth,
  canShowLists,
  currentPage,
  followerCount,
  followingCount,
  followState,
  handleDeleteList,
  handleEditList,
  handleEditProfile,
  handleFollow,
  handleOpenFollowList,
  handleSignInRequest,
  isBioSurfaceOpen,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  likeCount,
  itemRemoveConfirmation,
  listDeleteConfirmation,
  listCount,
  lists,
  onCreateList,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
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
      listDeleteConfirmation={listDeleteConfirmation}
      onCreateList={onCreateList}
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
      activeSection="lists"
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
      skeletonVariant="lists"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      <AccountListsFeed
        canShowLists={canShowLists}
        currentPage={currentPage}
        isOwner={isOwner}
        lists={lists}
        onDeleteList={handleDeleteList}
        onEditList={handleEditList}
        username={username}
      />
    </AccountPageShell>
  );
}
