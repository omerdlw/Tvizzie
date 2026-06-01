'use client';

import { useState } from 'react';

import { AccountPageShell, AccountSectionReveal } from '@/features/account/components/layout';
import AccountMediaGridPage, { ProfileMediaActions } from '@/features/account/components/media-grid';
import { AccountMediaFilterBar } from '@/features/account/filters/content-filter-primitives';
import { AccountSectionState } from '@/features/account/components/section-wrapper';
import ListDetailCommentsSection from './list-detail/comments-section';
import { LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS, LIST_SECTION_SHELL_CLASS } from './list-detail/config';
import { useListDetailFilterState } from './list-detail/filter-state';

export default function AccountListDetailFeed({ model = {}, RegistryComponent = null }) {
  const {
    auth, canShowList, followerCount, followingCount, followState, handleDeleteList,
    handleDeleteRequest, handleEditReview, handleEditList, handleEditProfile, handleFollow,
    handleLikeReview, handleOpenFollowList, handleOpenReviewComposer, handleRemoveListItem,
    handleSignInRequest, handleToggleLike, isBioSurfaceOpen, isFollowLoading, isLiked,
    isLikeLoading, isOwner, isPageLoading, isResolvingProfile, itemRemoveConfirmation,
    likeCount, list, listDeleteConfirmation, listCount, listItems = [], likes = [],
    ownReview, pendingFollowRequestCount, profile, resolveError, resolvedUserId,
    reviews = [], setIsBioSurfaceOpen, unfollowConfirmation, username, userProfile,
    watchedItems = [], watchlistCount = 0, watchlistItems = [],
  } = model;

  const {
    decadeOptions, filteredListItems, filteredReviews, genreOptions, hasMediaFilters,
    hasReviewFilters, mediaFilters, resetMediaFilters, resetReviewFilters, reviewFilters,
    reviewYearOptions, updateMediaFilters, updateReviewFilters,
  } = useListDetailFilterState({ likedItems: likes, listItems, reviews, watchedItems, watchlistItems });
  const [mediaPage, setMediaPage] = useState(1);

  const hasListItems = listItems.length > 0;

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
      auth={auth} followState={followState} handleDeleteList={handleDeleteList}
      handleEditList={handleEditList} handleEditProfile={handleEditProfile} handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList} handleSignInRequest={handleSignInRequest} handleToggleLike={handleToggleLike}
      isBioSurfaceOpen={isBioSurfaceOpen} isFollowLoading={isFollowLoading} isLiked={isLiked}
      isLikeLoading={isLikeLoading} isOwner={isOwner} isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile} itemRemoveConfirmation={itemRemoveConfirmation} list={list}
      listItemsCount={listItems.length} listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount} profile={profile} resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen} unfollowConfirmation={unfollowConfirmation} username={username}
    />
  ) : null;

  return (
    <AccountPageShell
      activeSection="lists" followerCount={followerCount} followState={followState}
      followingCount={followingCount} isLoading={isPageLoading} isFollowLoading={isFollowLoading}
      isOwner={isOwner} likesCount={likeCount} listsCount={listCount} onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList} onReadMore={() => setIsBioSurfaceOpen(true)}
      profile={profile} registry={pageRegistry} resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail" username={username} watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {!canShowList ? (
        <AccountSectionState message="This profile is private." />
      ) : !list ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <>
          <AccountSectionReveal>
            <header className="relative">
              <div className={`${LIST_SECTION_SHELL_CLASS} pt-10 pb-8`}>
                <div className="flex w-full flex-col gap-3">
                  <h1 className="w-full text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
                  <p className="w-full text-sm leading-6 text-black/70">
                    {String(list.description || '').trim() || 'No description provided.'}
                  </p>
                </div>
              </div>
            </header>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.06}>
            <AccountMediaGridPage
              currentPage={mediaPage}
              emptyMessage={hasMediaFilters && hasListItems ? 'No titles match the current filters.' : undefined}
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
              toolbar={hasListItems && (
                <>
                  <AccountMediaFilterBar
                    filters={mediaFilters}
                    decadeOptions={decadeOptions}
                    genreOptions={genreOptions}
                    visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                    onChange={updateMediaFilters}
                    onReset={hasMediaFilters ? resetMediaFilters : null}
                  />
                  {hasMediaFilters && (
                    <p className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                      {filteredListItems.length} of {listItems.length} titles shown
                    </p>
                  )}
                </>
              )}
            />
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.1}>
            <div className={`${LIST_SECTION_SHELL_CLASS} pt-2 pb-20`}>
              <ListDetailCommentsSection
                auth={auth} filteredReviews={filteredReviews} hasReviewFilters={hasReviewFilters}
                isOwner={isOwner} list={list} onDeleteRequest={handleDeleteRequest}
                onEditReview={handleEditReview} onLikeReview={handleLikeReview}
                onOpenReviewComposer={handleOpenReviewComposer} onResetReviewFilters={resetReviewFilters}
                onSignIn={handleSignInRequest} onUpdateReviewFilters={updateReviewFilters}
                ownReview={ownReview} reviewFilters={reviewFilters} reviewYearOptions={reviewYearOptions}
                reviews={reviews} userProfile={userProfile}
              />
            </div>
          </AccountSectionReveal>
        </>
      )}
    </AccountPageShell>
  );
}
