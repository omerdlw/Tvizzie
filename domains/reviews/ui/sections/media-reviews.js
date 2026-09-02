'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TMDB_IMG } from '@/shared';
import { AuthGate } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav';
import { createConfirmationSurfaceEntry } from '@/domains/shell/navigation/surfaces/confirmation-surface';
import { createReviewEditorSurfaceEntry } from '@/domains/shell/navigation/surfaces/review-editor-surface';
import { Button, Select } from '@/ui/primitives';
import ReviewAuthFallback from '../components/review-auth-fallback';
import ReviewHeader from '../components/review-header';
import ReviewList from '../components/review-list';
import { useMediaReviews } from '../../hooks/use-media-reviews';
import {
  getRatingStats,
  parseReviewSortMode,
  sortReviewsByMode,
} from '@/domains/reviews/utils/formatting';
import { REVIEW_SORT_MODE, REVIEW_SORT_OPTIONS } from '@/domains/reviews/utils/constants';

export default function MediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  headerTitle = 'Community Reviews',
  listMode = 'all',
  allReviewsHref,
  sectionClassName = 'mt-12 md:mt-16',
  enableSortControl = false,
  defaultSortMode = REVIEW_SORT_MODE.NEWEST,
  useQuerySortMode = false,
  useQueryUserFilter = false,
  hideWhenEmpty = false,
  showComposer = false,
  onReviewStateChange,
  motionStage = null,
  motionDeferred = false,
  dividerPositionClassName = null,
  showTopDivider = null,
}) {
  const [sortMode, setSortMode] = useState(defaultSortMode);
  const searchParams = useSearchParams();

  const querySortMode = parseReviewSortMode(searchParams?.get('sort'), REVIEW_SORT_MODE.NEWEST);
  const queryReviewUser = String(searchParams?.get('user') || '').trim();

  const isRecentListMode = listMode === 'recent';
  const isSortControlEnabled = enableSortControl && !isRecentListMode;
  const activeSortMode = useQuerySortMode ? querySortMode : sortMode;
  const effectiveDividerPosition =
    dividerPositionClassName ||
    (isRecentListMode ? 'left-1/2 w-screen -translate-x-1/2' : 'left-px right-px');
  const shouldShowTopDivider = showTopDivider ?? isRecentListMode;

  const {
    currentUserId,
    handleDelete,
    handleLike,
    handleSignInRequest,
    isLoading,
    loadError,
    ownReview,
    applyOptimisticReviewUpdate,
    ratingStats,
    reviews,
    sortedReviews,
    userProfile,
  } = useMediaReviews({
    backdropPath,
    entityId,
    entityType,
    limitCount: isRecentListMode ? 20 : undefined,
    onReviewStateChange,
    posterPath,
    title,
  });

  const { openSurface } = useNavigationActions();

  const buildReviewUser = useCallback(
    (review = null) => {
      if (!currentUserId) return null;
      return {
        ...(review?.user || {}),
        ...(userProfile || {}),
        id: currentUserId,
      };
    },
    [currentUserId, userProfile],
  );

  const openReviewModal = useCallback(
    (review = null) => {
      if (!currentUserId) {
        handleSignInRequest();
        return;
      }
      const targetReview = review || ownReview || null;

      openSurface(
        createReviewEditorSurfaceEntry({
          media: { entityId, entityType, posterPath, title },
          onSuccess: applyOptimisticReviewUpdate,
          review: targetReview,
          user: buildReviewUser(targetReview),
        }),
      );
    },
    [
      applyOptimisticReviewUpdate,
      buildReviewUser,
      currentUserId,
      entityId,
      entityType,
      handleSignInRequest,
      openSurface,
      ownReview,
      posterPath,
      title,
    ],
  );

  const handleEditReview = useCallback(
    (review) => {
      openReviewModal(review);
    },
    [openReviewModal],
  );

  const handleDeleteRequest = useCallback(() => {
    const confirmation = {
      title: 'Delete Review?',
      description: 'Are you sure you want to delete this review?',
      confirmText: 'Delete',
      confirmLoadingText: 'Deleting',
      isDestructive: true,
      icon: posterPath
        ? posterPath.startsWith('/')
          ? `${TMDB_IMG}/w342${posterPath}`
          : posterPath
        : undefined,
      onConfirm: async () => {
        const isDeleted = await handleDelete();
        if (!isDeleted) throw new Error('review-delete-failed');
      },
    };

    openSurface(createConfirmationSurfaceEntry(confirmation));
  }, [handleDelete, openSurface, posterPath]);

  const filteredReviews = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) return reviews;
    const normalizedUser = queryReviewUser.toLowerCase();

    return reviews.filter((review) => {
      const username = String(review?.user?.username || '')
        .trim()
        .toLowerCase();
      const userId = String(review?.user?.id || review?.reviewUserId || '')
        .trim()
        .toLowerCase();
      return username === normalizedUser || userId === normalizedUser;
    });
  }, [queryReviewUser, reviews, useQueryUserFilter]);

  const effectiveRatingStats = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) return ratingStats;
    return getRatingStats(filteredReviews);
  }, [filteredReviews, queryReviewUser, ratingStats, useQueryUserFilter]);

  const defaultOrderedReviews = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) return sortedReviews;
    return sortReviewsByMode(filteredReviews, REVIEW_SORT_MODE.NEWEST);
  }, [filteredReviews, queryReviewUser, sortedReviews, useQueryUserFilter]);

  const recentReviews = useMemo(
    () => sortReviewsByMode(filteredReviews, REVIEW_SORT_MODE.NEWEST),
    [filteredReviews],
  );

  const sortedByModeReviews = useMemo(
    () => sortReviewsByMode(filteredReviews, activeSortMode),
    [activeSortMode, filteredReviews],
  );

  const shouldUseCustomSort = isSortControlEnabled || useQuerySortMode;
  const listAnimationKey = shouldUseCustomSort
    ? `reviews-sort-${activeSortMode}`
    : 'reviews-default-order';

  const displayedReviews = isRecentListMode
    ? recentReviews.slice(0, 5)
    : shouldUseCustomSort
      ? sortedByModeReviews
      : defaultOrderedReviews;

  const shouldHideRecentList =
    hideWhenEmpty && isRecentListMode && !isLoading && !loadError && displayedReviews.length === 0;

  return (
    <section data-community-reviews="true" className="relative flex w-full flex-col gap-4">
      <div className="relative flex w-full flex-col">
        <ReviewHeader
          ratingStats={effectiveRatingStats}
          title={headerTitle}
          allReviewsHref={allReviewsHref}
          totalReviews={filteredReviews.length}
          onDeleteOwnReview={ownReview ? handleDeleteRequest : null}
          onEditOwnReview={ownReview ? () => openReviewModal(ownReview) : null}
          onAddReview={!currentUserId ? handleSignInRequest : null}
        />
      </div>

      <div className="w-full">
        {showComposer && !ownReview && (
          <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={title} />}>
            <div className="flex w-full flex-col items-start gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Rate or review this title</p>
                <p className="text-xs text-white/70">
                  Share your rating and thoughts from the review modal.
                </p>
              </div>
              <Button
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full ring-1 ring-inset ring-white/5 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 uppercase hover:bg-white hover:text-black sm:w-auto sm:justify-between"
                type="button"
                onClick={() => openReviewModal()}
              >
                Add Review
              </Button>
            </div>
          </AuthGate>
        )}
        {isSortControlEnabled && (
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs font-semibold text-white/50 uppercase">Sort</span>
            <Select
              onChange={setSortMode}
              options={REVIEW_SORT_OPTIONS}
              classNames={{
                trigger:
                  'bg-white/5 inline-flex h-10 min-w-[290px] justify-between rounded-[12px] ring-1 ring-inset ring-white/5 px-3 text-xs font-semibold text-white/70 uppercase',
                menu: 'overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/10 bg-black p-1',
                optionsList: 'flex flex-col gap-1',
                option:
                  'cursor-pointer rounded-[8px] px-3 py-2 text-xs font-semibold text-white/70 uppercase outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-white',
                optionActive: 'bg-white/5 text-white',
                indicator: 'ml-auto text-white',
                icon: 'text-white/50',
              }}
              aria-label="Sort reviews"
            />
          </div>
        )}
        {!shouldHideRecentList && (
          <div key={listAnimationKey} style={{ willChange: 'transform, opacity, filter' }}>
            <ReviewList
              currentUserId={currentUserId}
              displayVariant={isRecentListMode ? 'media-recent' : 'media-all'}
              isLoading={isLoading}
              loadError={loadError}
              onDeleteRequest={handleDeleteRequest}
              onEdit={handleEditReview}
              onLike={handleLike}
              showOwnActions={false}
              sortedReviews={displayedReviews}
              userProfile={userProfile}
              motionStage={motionStage}
              motionDeferred={motionDeferred}
            />
          </div>
        )}
      </div>
    </section>
  );
}
