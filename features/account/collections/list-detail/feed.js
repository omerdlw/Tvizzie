'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { AccountPageShell } from '@/features/account/components/layout';
import {
  LIST_COMMENT_SORT_OPTIONS,
  LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS,
  REVIEW_ITEMS_PER_PAGE,
  useListDetailFilters,
} from './filters';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/core/constants';
import { AccountSectionState } from '@/features/account/components/section-wrapper';
import ListDetailRegistry from './registry';
import { ListDetailCommentsSection, ListDetailHeaderSection, ListDetailItemsSection } from './sections';

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

  const pageRegistry = <ListDetailRegistry model={model} RegistryComponent={RegistryComponent} />;
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
          <ListDetailHeaderSection list={list} sectionShellClass={LIST_SECTION_SHELL_CLASS} />

          <ListDetailItemsSection
            auth={auth}
            decadeOptions={decadeOptions}
            filteredListItems={filteredListItems}
            genreOptions={genreOptions}
            hasListItems={hasListItems}
            hasMediaFilters={hasMediaFilters}
            isOwner={isOwner}
            listItems={listItems}
            mediaFilters={mediaFilters}
            onRemoveListItem={handleRemoveListItem}
            onResetMediaFilters={resetMediaFilters}
            onUpdateMediaFilters={updateMediaFilters}
            sectionShellClass={LIST_SECTION_SHELL_CLASS}
            visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
          />

          <ListDetailCommentsSection
            auth={auth}
            currentReviewPage={currentReviewPage}
            filteredReviews={filteredReviews}
            handleDeleteRequest={handleDeleteRequest}
            handleEditReview={handleEditReview}
            handleLikeReview={handleLikeReview}
            handleOpenReviewComposer={handleOpenReviewComposer}
            handleSignInRequest={handleSignInRequest}
            hasListReviews={hasListReviews}
            hasReviewFilters={hasReviewFilters}
            isOwner={isOwner}
            list={list}
            ownReview={ownReview}
            reviewFilters={reviewFilters}
            reviewSortOptions={LIST_COMMENT_SORT_OPTIONS}
            reviewYearOptions={reviewYearOptions}
            reviews={reviews}
            safeCurrentReviewPage={safeCurrentReviewPage}
            sectionShellClass={LIST_SECTION_SHELL_CLASS}
            setCurrentReviewPage={setCurrentReviewPage}
            totalReviewPages={totalReviewPages}
            updateReviewFilters={updateReviewFilters}
            resetReviewFilters={resetReviewFilters}
            userProfile={userProfile}
            visibleReviews={visibleReviews}
          />
        </>
      ) : canShowList ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
