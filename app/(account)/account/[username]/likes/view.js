import FavoriteShowcaseManager from '@/features/account/favorite-showcase-manager'
import AccountMediaGridPage from '@/features/account/media-grid-page'
import AccountPageShell from '@/features/account/page-shell'
import AccountPaginatedListGrid from '@/features/account/paginated-list-grid'
import AccountProfileMediaActions from '@/features/account/profile-media-actions'
import AccountReviewFeed from '@/features/account/review-feed'
import AccountSectionState from '@/features/account/section-state'
import Registry from './registry'

export default function LikesView({
  activeSegment,
  auth,
  canShowLikesGrid,
  currentPage,
  favoriteShowcase,
  followerCount,
  followingCount,
  followState,
  handleEditProfile,
  handleFollow,
  handleLike,
  handleOpenFollowList,
  handleRequestRemoveLike,
  handleSegmentChange,
  handleSignInRequest,
  handleToggleShowcase,
  hasMoreReviews,
  isBioMaskOpen,
  isFollowLoading,
  isLikedListsLoading,
  isOwner,
  isPageLoading,
  isReviewsLoading,
  isResolvingProfile,
  isShowcaseSaving,
  itemRemoveConfirmation,
  likedLists,
  likedListsError,
  likeCount,
  likes,
  listCount,
  loadReviews,
  pendingFollowRequestCount,
  persistShowcase,
  profile,
  resolveError,
  resolvedUserId,
  reviews,
  reviewsError,
  setIsBioMaskOpen,
  showcaseMap,
  unfollowConfirmation,
  username,
  watchedItems,
  watchlistCount,
}) {
  const pageRegistry = (
    <Registry
      activeSegment={activeSegment}
      auth={auth}
      canShowLikesGrid={canShowLikesGrid}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSegmentChange={handleSegmentChange}
      handleSignInRequest={handleSignInRequest}
      isBioMaskOpen={isBioMaskOpen}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioMaskOpen={setIsBioMaskOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  )

  return (
    <AccountPageShell
      activeSection="likes"
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
      onReadMore={() => setIsBioMaskOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="collection"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {isOwner && activeSegment === 'films' ? (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isSaving={isShowcaseSaving}
          onRemoveItem={handleToggleShowcase}
          onReorder={persistShowcase}
        />
      ) : null}

      {canShowLikesGrid ? (
        activeSegment === 'films' ? (
          <AccountMediaGridPage
            currentPage={currentPage}
            emptyMessage="No liked films yet"
            icon="solar:heart-bold"
            items={likes}
            pageBasePath={`/account/${username}/likes?segment=films`}
            renderOverlay={(item) =>
              isOwner ? (
                <AccountProfileMediaActions
                  extraActions={[
                    {
                      disabled:
                        !showcaseMap.has(item.mediaKey) &&
                        favoriteShowcase.length >= 5,
                      icon: showcaseMap.has(item.mediaKey)
                        ? 'solar:star-bold'
                        : 'solar:star-linear',
                      label: showcaseMap.has(item.mediaKey)
                        ? 'Remove from favorites showcase'
                        : 'Add to favorites showcase',
                      onClick: handleToggleShowcase,
                    },
                  ]}
                  media={item}
                  onRemoveItem={handleRequestRemoveLike}
                  removeLabel={`Remove ${item.title || item.name} from likes`}
                  userId={auth.user?.id || null}
                />
              ) : null
            }
            title="Films"
          />
        ) : activeSegment === 'reviews' ? (
          <AccountReviewFeed
            currentUserId={auth.user?.id || null}
            emptyMessage="No liked reviews yet"
            hasMore={hasMoreReviews}
            icon="solar:chat-round-bold"
            isLoading={isReviewsLoading}
            items={reviews}
            loadError={reviewsError}
            onLike={handleLike}
            onLoadMore={() => loadReviews({ append: true })}
            showOwnActions={false}
            title="Reviews"
            watchedItems={watchedItems}
          />
        ) : (
          <AccountPaginatedListGrid
            currentPage={currentPage}
            emptyMessage="No liked lists yet"
            icon="solar:list-heart-bold"
            isLoading={isLikedListsLoading}
            lists={likedLists}
            loadError={likedListsError}
            pageBasePath={`/account/${username}/likes?segment=lists`}
            title="Lists"
          />
        )
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  )
}
