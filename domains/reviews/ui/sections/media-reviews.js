'use client';

/**
 * Media Reviews - Main Container Feature Component
 * Path: features/media-reviews/media-reviews.js
 */

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TMDB_IMG } from '@/shared/constants';
import { AuthGate } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useNavigationActions } from '@/modules/nav';
import { createConfirmationSurfaceEntry } from '@/ui/feedback/confirmation-surface';
import { createReviewEditorSurfaceEntry } from '@/domains/reviews/ui/surfaces/review-editor-surface';
import { Button, Select } from '@/ui/primitives';
import ReviewAuthFallback from '../components/review-auth-fallback';
import ReviewHeader from '../components/review-header';
import ReviewList from '../components/review-list';
import { useMediaReviews } from '../../hooks/use-media-reviews';
import {
  getRatingStats,
  parseReviewSortMode,
  REVIEW_SORT_MODE,
  REVIEW_SORT_OPTIONS,
  sortReviewsByMode,
} from '../../services/review-data';

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
  showBackdropGradient = true,
  enableSortControl = false,
  defaultSortMode = REVIEW_SORT_MODE.NEWEST,
  useQuerySortMode = false,
  useQueryUserFilter = false,
  hideWhenEmpty = false,
  showComposer = false,
  onReviewStateChange,
}) {
  // ------------------------------------------
  // 1. STATE & ROUTING PARAMS
  // ------------------------------------------
  const [sortMode, setSortMode] = useState(defaultSortMode);
  const searchParams = useSearchParams();

  const querySortMode = parseReviewSortMode(searchParams?.get('sort'), REVIEW_SORT_MODE.NEWEST);
  const queryReviewUser = String(searchParams?.get('user') || '').trim();

  const isRecentListMode = listMode === 'recent';
  const isSortControlEnabled = enableSortControl && !isRecentListMode;
  const activeSortMode = useQuerySortMode ? querySortMode : sortMode;

  // ------------------------------------------
  // 2. FEATURE HOOK & SERVICES
  // ------------------------------------------
  const {
    currentUserId,
    handleDelete,
    handleLike,
    handleSignInRequest,
    isLoading,
    loadError,
    navHeight,
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
    onReviewStateChange,
    posterPath,
    title,
  });

  const { openSurface } = useNavigationActions();

  // ------------------------------------------
  // 3. HANDLERS & MODAL TRIGGERS
  // ------------------------------------------
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
          onSuccess: targetReview
            ? (updated) => applyOptimisticReviewUpdate(targetReview, updated)
            : (newRev) => applyOptimisticReviewUpdate(null, newRev),
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

  // ------------------------------------------
  // 4. MEMOIZED DATA FILTERS & SORTS
  // ------------------------------------------
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

  const recentReviews = useMemo(() => {
    return [...filteredReviews].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [filteredReviews]);

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

  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  // ------------------------------------------
  // 5. RENDER UI
  // ------------------------------------------
  return (
    <section
      data-community-reviews="true"
      className={`relative isolate z-0 flex w-full flex-col gap-6 overflow-hidden ${sectionClassName}`}
    >
      <ReviewHeader
        ratingStats={effectiveRatingStats}
        title={headerTitle}
        allReviewsHref={allReviewsHref}
        totalReviews={filteredReviews.length}
        onDeleteOwnReview={ownReview ? handleDeleteRequest : null}
        onEditOwnReview={ownReview ? () => openReviewModal(ownReview) : null}
        onAddReview={!currentUserId ? handleSignInRequest : null}
      />
      {showComposer && !ownReview && (
        <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={title} />}>
          <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Rate or review this title</p>
              <p className="text-xs text-black/70">
                Share your rating and thoughts from the review modal.
              </p>
            </div>
            <Button
              className="bg-primary/30 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase hover:bg-black hover:text-white sm:w-auto sm:justify-between"
              type="button"
              onClick={() => openReviewModal()}
            >
              Add Review
            </Button>
          </div>
        </AuthGate>
      )}
      {isSortControlEnabled && (
        <div className="flex w-full items-center justify-between border-b border-black/10 pb-4">
          <span className="text-[11px] font-semibold tracking-wider text-black/50 uppercase">
            Sort
          </span>
          <Select
            onChange={setSortMode}
            options={REVIEW_SORT_OPTIONS}
            classNames={{
              trigger:
                'bg-primary/30 inline-flex h-10 min-w-[290px] justify-between rounded-xl border border-black/10 px-3 text-[11px] font-semibold tracking-wide text-black/70 uppercase',
              menu: 'overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-lg',
              optionsList: 'flex flex-col gap-1',
              option:
                'cursor-pointer rounded-[8px] px-3 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase outline-none data-[highlighted]:bg-black/5 data-[highlighted]:text-black',
              optionActive: 'bg-black/5 text-black',
              indicator: 'ml-auto text-black',
              icon: 'text-black/50',
            }}
            aria-label="Sort reviews"
          />
        </div>
      )}
      {!shouldHideRecentList && (
        <div key={listAnimationKey} style={{ willChange: 'transform, opacity, filter' }}>
          <ReviewList
            currentUserId={currentUserId}
            isLoading={isLoading}
            loadError={loadError}
            onDeleteRequest={handleDeleteRequest}
            onEdit={handleEditReview}
            onLike={handleLike}
            showOwnActions={false}
            sortedReviews={displayedReviews}
            userProfile={userProfile}
          />
        </div>
      )}
    </section>
  );
}
