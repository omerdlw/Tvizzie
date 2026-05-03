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
import {
  REVIEW_SORT_MODE,
  REVIEW_SORT_OPTIONS,
  getRatingStats,
  hasReviewText,
  parseReviewSortMode,
  sortReviewsByMode,
} from './utils';

export default function MediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  headerTitle = 'Community Reviews',
  listMode = 'all',
  allReviewsHref,
  sectionClassName = '',
  showBackdropGradient = true,
  enableSortControl = false,
  defaultSortMode = REVIEW_SORT_MODE.NEWEST,
  useQuerySortMode = false,
  useQueryUserFilter = false,
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
  const visibleReviews = useMemo(() => filteredReviews.filter(hasReviewText), [filteredReviews]);

  const effectiveRatingStats = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) {
      return ratingStats;
    }

    return getRatingStats(filteredReviews);
  }, [filteredReviews, queryReviewUser, ratingStats, useQueryUserFilter]);

  const defaultOrderedReviews = useMemo(() => {
    if (!useQueryUserFilter || !queryReviewUser) {
      return sortedReviews.filter(hasReviewText);
    }

    return sortReviewsByMode(visibleReviews, REVIEW_SORT_MODE.NEWEST);
  }, [queryReviewUser, sortedReviews, useQueryUserFilter, visibleReviews]);

  const recentReviews = [...visibleReviews].sort((first, second) => {
    const firstTime = new Date(first.updatedAt || first.createdAt || 0).getTime();
    const secondTime = new Date(second.updatedAt || second.createdAt || 0).getTime();
    return secondTime - firstTime;
  });
  const sortedByModeReviews = useMemo(
    () => sortReviewsByMode(visibleReviews, activeSortMode),
    [activeSortMode, visibleReviews]
  );
  const hasMoreThanRecentLimit = isRecentListMode && recentReviews.length > 5;
  const shouldUseCustomSort = isSortControlEnabled || useQuerySortMode;
  const listAnimationKey = shouldUseCustomSort ? `reviews-sort-${activeSortMode}` : 'reviews-default-order';
  const displayedReviews = isRecentListMode
    ? recentReviews.slice(0, 5)
    : shouldUseCustomSort
      ? sortedByModeReviews
      : defaultOrderedReviews;
  const shouldShowComposer = !ownReview || !hasReviewText(ownReview);

  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <section
      data-community-reviews="true"
      className={`relative isolate z-0 flex w-full flex-col gap-0 ${sectionClassName}`}
    >
      {showBackdropGradient ? (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="media-reviews-backdrop-gradient absolute inset-0" style={{ bottom: -backdropExtension }} />
        </div>
      ) : null}
      <div className="media-reviews-header-plus p-5">
        <ReviewHeader
          ratingStats={effectiveRatingStats}
          title={headerTitle}
          allReviewsHref={allReviewsHref}
          totalReviews={visibleReviews.length}
          onDeleteOwnReview={ownReview ? handleDeleteRequest : null}
          onEditOwnReview={ownReview ? () => openReviewModal(ownReview) : null}
        />
      </div>

      {isSortControlEnabled ? (
        <div className="border-grid-line grid-diamonds-top flex items-center justify-between border-t p-5">
          <span className="text-white-muted text-xs font-semibold tracking-wider uppercase">Sort</span>
          <Select
            value={sortMode}
            onChange={setSortMode}
            options={REVIEW_SORT_OPTIONS}
            classNames={{
              trigger:
                'media-review-sort-trigger inline-flex h-10 justify-between rounded border px-3 text-xs font-semibold tracking-wide uppercase',
              menu: 'media-review-sort-menu overflow-hidden rounded p-1 shadow-lg',
              optionsList: 'flex flex-col gap-1',
              option:
                'media-review-sort-option cursor-pointer rounded-xs px-3 py-2 text-xs font-semibold tracking-wide uppercase outline-none',
              optionActive: 'media-review-sort-option-active',
              indicator: 'ml-auto text-white',
              icon: 'text-white-muted',
            }}
            aria-label="Sort reviews"
          />
        </div>
      ) : null}

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
            emptyMessage="No written reviews yet"
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
    </section>
  );
}
