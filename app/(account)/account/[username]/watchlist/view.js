import AccountMediaGridPage from '@/features/account/sections/media-grid-page'
import AccountPageShell from '@/features/account/page-shell'
import AccountProfileMediaActions from '@/features/account/profile/profile-media-actions'
import AccountSectionState from '@/features/account/section-state'
import Registry from './registry'

export default function WatchlistView({
  auth,
  canShowWatchlistGrid,
  currentPage,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleFollow,
  handleOpenFollowList,
  handleRequestRemoveWatchlistItem,
  handleSignInRequest,
  isBioSurfaceOpen,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  listCount,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  watchlistCount,
  watchlist,
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
      activeSection="watchlist"
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
      {canShowWatchlistGrid ? (
        <AccountMediaGridPage
          currentPage={currentPage}
          emptyMessage="No watchlist yet"
          icon="solar:bookmark-bold"
          items={watchlist}
          pageBasePath={`/account/${username}/watchlist`}
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
          title="Watchlist"
        />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  )
}
