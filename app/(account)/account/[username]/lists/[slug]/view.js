import AccountPageShell from '@/features/account/page-shell';
import AccountProfileMediaActions from '@/features/account/profile/profile-media-actions';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import AccountSectionState from '@/features/account/section-state';
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback';
import ReviewHeader from '@/features/reviews/parts/review-header';
import ReviewList from '@/features/reviews/parts/review-list';
import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { AuthGate } from '@/core/modules/auth';
import { Button } from '@/ui/elements';
import Registry from './registry';

const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6 px-4 sm:px-8`;

function getPosterUrl(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

function ListDetailMediaGrid({ isOwner = false, items = [], onRemoveItem = null }) {
  if (items.length === 0) {
    return <div className="border border-[#0284c7] px-4 py-5 text-sm text-[#0f172a]">No titles in this list yet.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item, index) => {
        const mediaType = item?.entityType || item?.media_type;
        const mediaId = item?.entityId || item?.id;
        const title = item?.title || item?.name || 'Untitled';

        return (
          <MediaCard
            key={`${item.mediaKey || `${mediaType}-${mediaId}`}-${index}`}
            href={`/${mediaType}/${mediaId}`}
            className="w-full"
            imageSrc={getPosterUrl(item)}
            imageAlt={title}
            imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
            topOverlay={
              isOwner && typeof onRemoveItem === 'function' ? (
                <AccountProfileMediaActions
                  media={item}
                  onRemoveItem={onRemoveItem}
                  removeLabel={`Remove ${title} from this list`}
                />
              ) : null
            }
            tooltipText={title}
          />
        );
      })}
    </div>
  );
}

export default function ListView({
  auth,
  canShowList,
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
  handleOpenReviewComposer,
  handleRemoveListItem,
  handleSignInRequest,
  handleToggleLike,
  isBioSurfaceOpen,
  isFollowLoading,
  isLiked,
  isLikeLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  list,
  listDeleteConfirmation,
  listCount,
  listItems,
  ownReview,
  pendingFollowRequestCount,
  profile,
  ratingStats,
  resolveError,
  resolvedUserId,
  reviews,
  setIsBioSurfaceOpen,
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
      isBioSurfaceOpen={isBioSurfaceOpen}
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
      showProfileFollowAction={!isOwner}
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
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowList && list ? (
        <>
          <header className="relative text-[#0f172a]">
            <div className={`${LIST_SECTION_SHELL_CLASS} pt-10 pb-8`}>
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">{list.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tracking-widest text-[#0f172a] uppercase">
                  <span>{listItems.length} items</span>
                  <span>{list?.likesCount || 0} likes</span>
                  <span>{list?.reviewsCount || 0} reviews</span>
                </div>
              </div>
            </div>
          </header>

          <div className={`${LIST_SECTION_SHELL_CLASS} pb-12`}>
            <ListDetailMediaGrid isOwner={isOwner} items={listItems} onRemoveItem={handleRemoveListItem} />
          </div>

          <div className={`${LIST_SECTION_SHELL_CLASS} pt-4 pb-20`}>
            <ReviewHeader ratingStats={ratingStats} totalReviews={reviews.length} />

            {!isOwner && (
              <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={list.title} />}>
                <div className="flex items-center justify-between gap-3 border border-[#0284c7] bg-[#dbeafe] p-3 sm:p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a]">
                      {ownReview ? 'Update your list review' : 'Rate or review this list'}
                    </p>
                    <p className="text-xs text-black/70">
                      {ownReview
                        ? 'Open the review modal to edit your score or text.'
                        : 'Share your rating and thoughts from the review modal.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-10 shrink-0 px-4 text-[11px] font-semibold tracking-widest uppercase"
                    onClick={handleOpenReviewComposer}
                  >
                    {ownReview ? 'Edit Review' : 'Add Review'}
                  </Button>
                </div>
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
  );
}
