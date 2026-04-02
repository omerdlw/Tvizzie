'use client'

import { useAccountSectionPage } from '@/features/account/section-client-hooks'
import { useAuth } from '@/modules/auth'
import WatchlistView from './view'

export default function Client({
  currentPage = 1,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  username,
}) {
  const auth = useAuth()
  const {
    canViewProfileCollections,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRequestRemoveWatchlistItem,
    handleSignInRequest,
    isBioMaskOpen,
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
    setIsBioMaskOpen,
    unfollowConfirmation,
    watchlistCount,
    watchlist,
  } = useAccountSectionPage({
    activeTab: 'watchlist',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  })

  return (
    <WatchlistView
      auth={auth}
      canShowWatchlistGrid={canViewProfileCollections}
      currentPage={currentPage}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleRequestRemoveWatchlistItem={handleRequestRemoveWatchlistItem}
      handleSignInRequest={handleSignInRequest}
      isBioMaskOpen={isBioMaskOpen}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      likeCount={likeCount}
      listCount={listCount}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      setIsBioMaskOpen={setIsBioMaskOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchlistCount={watchlistCount}
      watchlist={watchlist}
    />
  )
}
