import AccountActivityFeed from '@/features/account/feeds/activity';
import { AccountPageShell } from '@/features/account/shared/layout';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import Registry from './registry';

export default function ActivityView({
  activeScope,
  activityFilters,
  auth,
  canShowActivity,
  currentPage,
  feedError,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleFollow,
  handleOpenFollowList,
  handleSignInRequest,
  isBioSurfaceOpen,
  isFeedLoading,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  items,
  likeCount,
  listCount,
  onFiltersChange,
  onPageChange,
  onScopeChange,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  watchlistCount,
  totalCount,
}) {
  const pageRegistry = (
    <Registry
      activeScope={activeScope}
      auth={auth}
      canShowActivity={canShowActivity}
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
      onScopeChange={onScopeChange}
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
      activeSection="activity"
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
      skeletonVariant="activity"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowActivity ? (
        <AccountActivityFeed
          emptyMessage={activeScope === 'following' ? 'No following activity yet' : 'No activity yet'}
          currentPage={currentPage}
          filters={activityFilters}
          icon="solar:bolt-bold"
          isLoading={isFeedLoading}
          items={items}
          loadError={feedError}
          onFiltersChange={onFiltersChange}
          onPageChange={onPageChange}
          showHeader={false}
          totalCount={totalCount}
          title={activeScope === 'following' ? 'Following Activity' : 'Your Activity'}
          variant="showcase"
        />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
