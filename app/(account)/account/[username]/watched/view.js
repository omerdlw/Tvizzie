import AccountMediaGridPage from '@/features/account/sections/media-grid-page'
import AccountPageShell from '@/features/account/page-shell'
import AccountProfileMediaActions from '@/features/account/profile/profile-media-actions'
import AccountSectionState from '@/features/account/section-state'
import Registry from './registry'

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
  )

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
      {!canShowWatchedGrid ? (
        <AccountSectionState message="This profile is private." />
      ) : loadError ? (
        <AccountSectionState message={loadError} />
      ) : (
        <AccountMediaGridPage
          currentPage={currentPage}
          emptyMessage="No watched films yet"
          icon="solar:eye-bold"
          items={watchedItems}
          pageBasePath={`/account/${username}/watched`}
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
          title="Watched"
        />
      )}
    </AccountPageShell>
  )
}
