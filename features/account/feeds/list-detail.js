'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { AccountPageShell, AccountSectionReveal } from '@/features/account/shared/layout';
import {
  LIST_COMMENT_SORT_OPTIONS,
  LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS,
  REVIEW_ITEMS_PER_PAGE,
  useListDetailFilters,
} from '@/features/account/feeds/list-detail-filters';
import ListDetailMediaGrid from '@/features/account/feeds/list-detail-media-grid';
import { AccountMediaFilterBar, AccountReviewFilterBar } from '@/features/account/shared/content-filters';
import AccountPagination from '@/features/account/shared/pagination';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import AccountInlineSectionState from '@/features/account/shared/section-state';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback';
import ReviewHeader from '@/features/reviews/parts/review-header';
import ReviewList from '@/features/reviews/parts/review-list';
import { AuthGate } from '@/core/modules/auth';
import { Button } from '@/ui/elements';

const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} account-detail-section-body`;

export default function AccountListDetailFeed({ model = null, RegistryComponent = null }) {
  const {
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
    listItems = [],
    likes = [],
    ownReview,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    reviews = [],
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    username,
    userProfile,
    watchedItems = [],
    watchlistCount = 0,
    watchlistItems = [],
  } = model || {};

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const collectionRootPath = useMemo(() => String(pathname || ''), [pathname]);
  const {
    decadeOptions,
    filteredListItems,
    filteredReviews,
    genreOptions,
    hasMediaFilters,
    hasReviewFilters,
    mediaFilters,
    resetMediaFilters,
    resetReviewFilters,
    reviewFilters,
    reviewYearOptions,
    updateMediaFilters,
    updateReviewFilters,
  } = useListDetailFilters({
    collectionRootPath,
    likes,
    listItems,
    reviews,
    searchParamsKey,
    watchedItems,
    watchlistItems,
  });
  const hasListItems = listItems.length > 0;
  const hasListReviews = reviews.length > 0;

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
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
      listItemsCount={listItems.length}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const totalReviewPages = filteredReviews.length ? Math.ceil(filteredReviews.length / REVIEW_ITEMS_PER_PAGE) : 1;
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);
  const reviewPageStart = (safeCurrentReviewPage - 1) * REVIEW_ITEMS_PER_PAGE;
  const visibleReviews = useMemo(
    () => filteredReviews.slice(reviewPageStart, reviewPageStart + REVIEW_ITEMS_PER_PAGE),
    [filteredReviews, reviewPageStart]
  );

  useEffect(() => {
    setCurrentReviewPage(1);
  }, [list?.id, reviewFilters]);

  useEffect(() => {
    if (currentReviewPage > totalReviewPages) {
      setCurrentReviewPage(totalReviewPages);
    }
  }, [currentReviewPage, totalReviewPages]);

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
          <AccountSectionReveal>
            <header className="account-detail-grid-subsection">
              <div className={LIST_SECTION_SHELL_CLASS}>
                <div className="flex w-full flex-col gap-3">
                  <h1 className="w-full text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
                  <p className="w-full text-sm leading-6 text-white/70">
                    {String(list?.description || '').trim() || 'No description provided.'}
                  </p>
                </div>
              </div>
            </header>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.06}>
            <div className="account-detail-grid-subsection">
              <div className={LIST_SECTION_SHELL_CLASS}>
                <ListDetailMediaGrid
                  emptyMessage={
                    hasMediaFilters && listItems.length > 0 ? 'No titles match the current filters.' : undefined
                  }
                  isOwner={isOwner}
                  items={filteredListItems}
                  onRemoveItem={handleRemoveListItem}
                  userId={auth.user?.id || null}
                  toolbar={
                    hasListItems ? (
                      <>
                        <AccountMediaFilterBar
                          filters={mediaFilters}
                          decadeOptions={decadeOptions}
                          genreOptions={genreOptions}
                          visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                          onChange={updateMediaFilters}
                          onReset={hasMediaFilters ? resetMediaFilters : null}
                        />

                        {hasMediaFilters ? (
                          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                            {filteredListItems.length} of {listItems.length} titles shown
                          </p>
                        ) : null}
                      </>
                    ) : null
                  }
                />
              </div>
            </div>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.1}>
            <div className="account-detail-grid-subsection">
              <div className={LIST_SECTION_SHELL_CLASS}>
                <ReviewHeader
                  itemLabel="comment"
                  showRatingSummary={false}
                  title="Comments"
                  totalReviews={reviews.length}
                />

                {hasListReviews ? (
                  <AccountReviewFilterBar
                    filters={reviewFilters}
                    showRatingFilter={false}
                    sortOptions={LIST_COMMENT_SORT_OPTIONS}
                    visibilityOptions={[]}
                    yearOptions={reviewYearOptions}
                    onChange={updateReviewFilters}
                    onReset={hasReviewFilters ? resetReviewFilters : null}
                  />
                ) : null}

                {hasListReviews && hasReviewFilters ? (
                  <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                    {filteredReviews.length} of {reviews.length} comments shown
                  </p>
                ) : null}

                {!isOwner && (
                  <AuthGate
                    fallback={<ReviewAuthFallback mode="comment" onSignIn={handleSignInRequest} title={list.title} />}
                  >
                    <div className="flex w-full flex-col items-start gap-3 border-y border-white/5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{ownReview ? 'Update your comment' : 'Write a comment'}</p>
                        <p className="text-xs text-white/70">
                          {ownReview
                            ? 'Open the comment composer to edit your text.'
                            : 'Share your thoughts from the comment composer.'}
                        </p>
                      </div>
                      <Button
                        className="bg-primary/30 inline-flex w-full items-center justify-center gap-2 border border-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-white/70 uppercase hover:bg-white hover:text-black sm:w-auto sm:justify-between"
                        type="button"
                        onClick={handleOpenReviewComposer}
                      >
                        {ownReview ? 'Edit Comment' : 'Add Comment'}
                      </Button>
                    </div>
                  </AuthGate>
                )}
                {visibleReviews.length === 0 ? (
                  <AccountInlineSectionState>
                    {hasReviewFilters && reviews.length > 0
                      ? 'No comments match the current filters.'
                      : 'No comments yet'}
                  </AccountInlineSectionState>
                ) : (
                  <ReviewList
                    currentUserId={auth.user?.id || null}
                    isLoading={false}
                    loadError={null}
                    onDeleteRequest={handleDeleteRequest}
                    onEdit={handleEditReview}
                    onLike={handleLikeReview}
                    showTopBorder={false}
                    sortedReviews={visibleReviews}
                    userProfile={userProfile}
                  />
                )}

                {totalReviewPages > 1 ? (
                  <div className="mt-4">
                    <AccountPagination
                      className="w-full"
                      currentPage={safeCurrentReviewPage}
                      totalPages={totalReviewPages}
                      onPageChange={setCurrentReviewPage}
                      prevAriaLabel="Go to previous review page"
                      nextAriaLabel="Go to next review page"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </AccountSectionReveal>
        </>
      ) : canShowList ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
