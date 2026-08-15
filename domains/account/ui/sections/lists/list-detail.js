'use client';

import { useState } from 'react';

import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import {
  AccountMediaFilterBar,
  AccountReviewFilterBar,
} from '@/domains/account/ui/filters/content-filter-primitives';
import ReviewAuthFallback from '@/domains/reviews/ui/components/review-auth-fallback';
import AccountSectionLayout, {
  AccountSectionState,
} from '@/domains/account/ui/sections/account-section';
import ListDetailCommentsSection from './list-detail-comments';
import {
  LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS,
  LIST_COMMENT_SORT_OPTIONS,
  LIST_SECTION_SHELL_CLASS,
} from './list-detail-config';
import { useListDetailFilterState } from './use-list-detail-filters';

export default function AccountListDetailFeed({ model = {}, RegistryComponent = null }) {
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
    unfollowConfirmation,
    username,
    userProfile,
    watchedItems = [],
    watchlistCount = 0,
    watchlistItems = [],
  } = model;

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
  } = useListDetailFilterState({
    likedItems: likes,
    listItems,
    reviews,
    watchedItems,
    watchlistItems,
  });
  const [mediaPage, setMediaPage] = useState(1);

  const hasListItems = listItems.length > 0;

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
      handleOpenReviewComposer={handleOpenReviewComposer}
      ownReview={ownReview}
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
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;

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
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {!canShowList ? (
        <AccountSectionState message="This profile is private." />
      ) : !list ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <>
          <AccountMediaGridPage
            currentPage={mediaPage}
            emptyMessage={
              hasMediaFilters && hasListItems ? 'No titles match the current filters.' : undefined
            }
            icon="solar:clapperboard-bold"
            items={filteredListItems}
            onPageChange={setMediaPage}
            showHeader={false}
            title={list?.title || 'List'}
            renderOverlay={(item) =>
              isOwner ? (
                <ProfileMediaActions
                  media={item}
                  onRemoveItem={handleRemoveListItem}
                  removeLabel={`Remove ${item?.title || item?.name || 'item'} from this list`}
                  userId={auth.user?.id}
                />
              ) : null
            }
            toolbar={
              hasListItems && (
                <AccountMediaFilterBar
                  filters={mediaFilters}
                  decadeOptions={decadeOptions}
                  genreOptions={genreOptions}
                  visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                  onChange={updateMediaFilters}
                  onReset={hasMediaFilters ? resetMediaFilters : null}
                />
              )
            }
          />

          <AccountSectionLayout
            contentPaddingClassName="p-0"
            icon="solar:chat-round-line-bold"
            isInitialSection={false}
            revealDelay={0.1}
            summaryLabel={`${reviews.length} ${reviews.length === 1 ? 'Comment' : 'Comments'}`}
            title="Comments"
            toolbarPaddingClassName="p-0"
            toolbar={
              !auth?.user || reviews.length > 0 ? (
                <>
                  {!auth?.user && (
                    <ReviewAuthFallback
                      mode="comment"
                      onSignIn={handleSignInRequest}
                      title={list.title}
                      variant="account-section"
                    />
                  )}
                  {reviews.length > 0 ? (
                    <div className="min-h-14 px-4 flex items-center">
                      <AccountReviewFilterBar
                        filters={reviewFilters}
                        showRatingFilter={false}
                        sortOptions={LIST_COMMENT_SORT_OPTIONS}
                        visibilityOptions={[]}
                        yearOptions={reviewYearOptions}
                        onChange={updateReviewFilters}
                        onReset={hasReviewFilters ? resetReviewFilters : null}
                      />
                    </div>
                  ) : null}
                </>
              ) : null
            }
          >
            <ListDetailCommentsSection
              auth={auth}
              filteredReviews={filteredReviews}
              list={list}
              onDeleteRequest={handleDeleteRequest}
              onEditReview={handleEditReview}
              onLikeReview={handleLikeReview}
              reviews={reviews}
              userProfile={userProfile}
            />
          </AccountSectionLayout>
        </>
      )}
    </AccountPageShell>
  );
}
