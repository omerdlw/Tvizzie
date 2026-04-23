'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { AuthGate } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { Button, Select } from '@/ui/elements';

import ReviewAuthFallback from './parts/review-auth-fallback';
import ReviewHeader from './parts/review-header';
import ReviewList from './parts/review-list';
import { useMediaReviews } from './use-media-reviews';
import { REVIEW_SORT_MODE, REVIEW_SORT_OPTIONS, getRatingStats, parseReviewSortMode, sortReviewsByMode } from './utils';

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
  onReviewStateChange,
}) {
  const isRecentListMode = listMode === 'recent';
  const isSortControlEnabled = enableSortControl && !isRecentListMode;
  const [sortMode, setSortMode] = useState(defaultSortMode);
  const searchParams = useSearchParams();
  const querySortMode = parseReviewSortMode(searchParams?.get('sort'), REVIEW_SORT_MODE.NEWEST);
  const activeSortMode = useQuerySortMode ? querySortMode : sortMode;
  const queryReviewUser = String(searchParams?.get('user') || '').trim();

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
    setNavConfirmation,
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
  const { openModal } = useModal();

  const buildReviewUser = useCallback(
    (review = null) => {
      if (!currentUserId) {
        return null;
      }

      return {
        ...(review?.user || {}),
        ...(userProfile || {}),
        id: currentUserId,
      };
    },
    [currentUserId, userProfile]
  );

  const openReviewModal = useCallback(
    (review = null) => {
      if (!currentUserId) {
        handleSignInRequest();
        return;
      }

      const targetReview = review || ownReview || null;

      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          media: {
            entityId,
            entityType,
            posterPath,
            title,
          },
          onSuccess: targetReview
            ? (updatedReview) => {
                applyOptimisticReviewUpdate(targetReview, updatedReview);
              }
            : null,
          review: targetReview,
          user: buildReviewUser(targetReview),
        },
      });
    },
    [
      applyOptimisticReviewUpdate,
      buildReviewUser,
      currentUserId,
      entityId,
      entityType,
      handleSignInRequest,
      openModal,
      ownReview,
      posterPath,
      title,
    ]
  );

  const handleEditReview = useCallback(
    (review) => {
      openReviewModal(review);
    },
    [openReviewModal]
  );

  const handleDeleteRequest = useCallback(() => {
    setNavConfirmation({
      title: 'Delete Review?',
      description: 'Are you sure you want to delete this review?',
      confirmText: 'Delete',
      isDestructive: true,
      onCancel: () => setNavConfirmation(null),
      onConfirm: async () => {
        const isDeleted = await handleDelete();

        if (!isDeleted) {
          throw new Error('review-delete-failed');
        }
      },
    });
  }, [handleDelete, setNavConfirmation]);

  const filteredReviews = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) {
      return reviews;
    }

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
    if (!useQueryUserFilter || !queryReviewUser) {
      return ratingStats;
    }

    return getRatingStats(filteredReviews);
  }, [filteredReviews, queryReviewUser, ratingStats, useQueryUserFilter]);

  const defaultOrderedReviews = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) {
      return sortedReviews;
    }

    return sortReviewsByMode(filteredReviews, REVIEW_SORT_MODE.NEWEST);
  }, [filteredReviews, queryReviewUser, sortedReviews, useQueryUserFilter]);

  const recentReviews = [...filteredReviews].sort((first, second) => {
    const firstTime = new Date(first.updatedAt || first.createdAt || 0).getTime();
    const secondTime = new Date(second.updatedAt || second.createdAt || 0).getTime();
    return secondTime - firstTime;
  });
  const sortedByModeReviews = useMemo(
    () => sortReviewsByMode(filteredReviews, activeSortMode),
    [activeSortMode, filteredReviews]
  );
  const hasMoreThanRecentLimit = isRecentListMode && recentReviews.length > 5;
  const shouldUseCustomSort = isSortControlEnabled || useQuerySortMode;
  const listAnimationKey = shouldUseCustomSort ? `reviews-sort-${activeSortMode}` : 'reviews-default-order';
  const displayedReviews = isRecentListMode
    ? recentReviews.slice(0, 5)
    : shouldUseCustomSort
      ? sortedByModeReviews
      : defaultOrderedReviews;
  const shouldHideRecentList =
    hideWhenEmpty && isRecentListMode && !isLoading && !loadError && displayedReviews.length === 0;
  const shouldShowComposer = !ownReview;

  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <section
      data-community-reviews="true"
      className={`relative isolate z-0 flex w-full flex-col gap-6 overflow-hidden ${sectionClassName}`}
    >
      {showBackdropGradient ? (
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(250,249,245,0)_0%,rgba(250,249,245,0.84)_12%,#faf9f5_34%,#faf9f5_100%)]"
          style={{ bottom: -backdropExtension }}
        />
      ) : null}
      <ReviewHeader
        ratingStats={effectiveRatingStats}
        title={headerTitle}
        allReviewsHref={allReviewsHref}
        totalReviews={filteredReviews.length}
        onDeleteOwnReview={ownReview ? handleDeleteRequest : null}
        onEditOwnReview={ownReview ? () => openReviewModal(ownReview) : null}
      />
      {shouldShowComposer ? (
        <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={title} />}>
          <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Rate or review this title</p>
              <p className="text-xs text-black/70">Share your rating and thoughts from the review modal.</p>
            </div>
            <Button
              className="bg-primary/30 inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white sm:w-auto sm:justify-between"
              type="button"
              onClick={() => openReviewModal()}
            >
              Add Review
            </Button>
          </div>
        </AuthGate>
      ) : null}
      {isSortControlEnabled ? (
        <div className="flex w-full items-center justify-between border-b border-black/10 pb-4">
          <span className="text-[11px] font-semibold tracking-wider text-black/50 uppercase">Sort</span>
          <Select
            value={sortMode}
            onChange={setSortMode}
            options={REVIEW_SORT_OPTIONS}
            classNames={{
              trigger:
                'bg-primary/30 inline-flex h-10 min-w-[290px] justify-between border border-black/10 px-3 text-[11px] font-semibold tracking-wide text-black/70 uppercase',
              menu: 'overflow-hidden border border-black/10 bg-[#faf9f5] p-1 shadow-lg',
              optionsList: 'flex flex-col gap-1',
              option:
                'cursor-pointer px-3 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase outline-none data-[highlighted]:bg-black/5 data-[highlighted]:text-black',
              optionActive: 'bg-black/5 text-black',
              indicator: 'ml-auto text-black',
              icon: 'text-black/50',
            }}
            aria-label="Sort reviews"
          />
        </div>
      ) : null}

      {!shouldHideRecentList ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={listAnimationKey}
            initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ willChange: 'transform, opacity, filter' }}
          >
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
          </motion.div>
        </AnimatePresence>
      ) : null}
    </section>
  );
}
