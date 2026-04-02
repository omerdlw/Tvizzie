import AccountPageShell from '@/features/account/page-shell'
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils'
import AccountSectionState from '@/features/account/section-state'
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback'
import ReviewComposer from '@/features/reviews/parts/review-composer'
import ReviewHeader from '@/features/reviews/parts/review-header'
import ReviewList from '@/features/reviews/parts/review-list'
import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/lib/constants'
import { AuthGate } from '@/modules/auth'
import Registry from './registry'

const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6 px-4 sm:px-8`

function getPosterUrl(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

function ListDetailMediaGrid({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="border border-white/5  px-4 py-5 text-sm text-white">
        No titles in this list yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item, index) => {
        const mediaType = item?.entityType || item?.media_type
        const mediaId = item?.entityId || item?.id
        const title = item?.title || item?.name || 'Untitled'

        return (
          <MediaCard
            key={`${item.mediaKey || `${mediaType}-${mediaId}`}-${index}`}
            href={`/${mediaType}/${mediaId}`}
            className="w-full"
            imageSrc={getPosterUrl(item)}
            imageAlt={title}
            imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
            fallbackIconClassName="text-white/50"
            tooltipText={title}
          />
        )
      })}
    </div>
  )
}



export default function ListView({
  auth,
  canShowList,
  requiresFollowForProfileInteractions = false,
  followerCount,
  followingCount,
  followState,
  handleDeleteList,
  handleDeleteRequest,
  handleEditReview,
  handleEditList,
  handleEditProfile,
  handleFollow,
  handleLikeReview,
  handleOpenFollowList,
  handleSignInRequest,
  handleSubmitReview,
  handleToggleLike,
  isBioMaskOpen,
  isEditingReview,
  isFollowLoading,
  isLiked,
  isLikeLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  isSpoiler,
  itemRemoveConfirmation,
  likeCount,
  list,
  listDeleteConfirmation,
  listCount,
  listItems,
  ownReview,
  pendingFollowRequestCount,
  profile,
  rating,
  ratingStats,
  resolveError,
  resolvedUserId,
  reviews,
  reviewState,
  reviewText,
  setIsBioMaskOpen,
  setIsEditingReview,
  setIsSpoiler,
  setRating,
  setReviewText,
  unfollowConfirmation,
  username,
  userProfile,
  watchlistCount,
}) {
  const pageRegistry = (
    <Registry
      auth={auth}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleToggleLike={handleToggleLike}
      isBioMaskOpen={isBioMaskOpen}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      list={list}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      reviewState={reviewState}
      showProfileFollowAction={!isOwner}
      setIsBioMaskOpen={setIsBioMaskOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  )

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
      onReadMore={() => setIsBioMaskOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowList && list ? (
        <>
          <header className="relative  text-white">
            <div className={`${LIST_SECTION_SHELL_CLASS} pb-8 pt-10`}>
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {list.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tracking-widest text-white uppercase">
                  <span>{listItems.length} items</span>
                  <span>{list?.likesCount || 0} likes</span>
                  <span>{list?.reviewsCount || 0} reviews</span>
                </div>
              </div>
            </div>
          </header>

            <div className={`${LIST_SECTION_SHELL_CLASS} pb-12`}>
              <ListDetailMediaGrid items={listItems} />
            </div>

            <div className={`${LIST_SECTION_SHELL_CLASS} pb-20 pt-4`}>
              <ReviewHeader
                ratingStats={ratingStats}
                totalReviews={reviews.length}
              />

              {!isOwner && (
                <AuthGate
                  fallback={
                    <ReviewAuthFallback
                      onSignIn={handleSignInRequest}
                      title={list.title}
                    />
                  }
                >
                  {(!ownReview || isEditingReview) && (
                    <ReviewComposer
                      isEditing={isEditingReview}
                      isSpoiler={isSpoiler}
                      mediaTypeLabel="List"
                      normalizedReviewLength={reviewText.trim().length}
                      onSubmit={handleSubmitReview}
                      ownReview={ownReview}
                      rating={rating}
                      reviewText={reviewText}
                      setIsEditing={setIsEditingReview}
                      setIsSpoiler={setIsSpoiler}
                      setRating={setRating}
                      setReviewText={setReviewText}
                      title={list.title}
                    />
                  )}
                </AuthGate>
              )}
              <ReviewList
                currentUserId={auth.user?.id || null}
                isLoading={false}
                loadError={null}
                onDeleteRequest={handleDeleteRequest}
                onEdit={handleEditReview}
                onLike={handleLikeReview}
                sortedReviews={reviews}
                userProfile={userProfile}
              />
            </div>
        </>
      ) : canShowList ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  )
}
