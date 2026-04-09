'use client';

import { useCallback } from 'react';

import { AuthGate } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { Button } from '@/ui/elements';

import ReviewAuthFallback from './parts/review-auth-fallback';
import ReviewHeader from './parts/review-header';
import ReviewList from './parts/review-list';
import { useMediaReviews } from './use-media-reviews';

export default function MediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  onReviewStateChange,
}) {
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

  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <section
      data-community-reviews="true"
      className="relative isolate z-0 mt-12 flex w-full flex-col gap-6 overflow-hidden md:mt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(250,249,245,0)_0%,rgba(250,249,245,0.84)_12%,#faf9f5_34%,#faf9f5_100%)]"
        style={{ bottom: -backdropExtension }}
      />
      <ReviewHeader ratingStats={ratingStats} totalReviews={reviews.length} />
      <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={title} />}>
        <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{ownReview ? 'Update your review' : 'Rate or review this title'}</p>
            <p className="text-xs text-black/70">
              {ownReview
                ? 'Open the review modal to edit your score or text.'
                : 'Share your rating and thoughts from the review modal.'}
            </p>
          </div>
          <Button
            className="bg-primary/40 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white sm:w-auto sm:justify-between"
            type="button"
            onClick={() => openReviewModal()}
          >
            {ownReview ? 'Edit Review' : 'Add Review'}
          </Button>
        </div>
      </AuthGate>

      <ReviewList
        currentUserId={currentUserId}
        isLoading={isLoading}
        loadError={loadError}
        onDeleteRequest={handleDeleteRequest}
        onEdit={handleEditReview}
        onLike={handleLike}
        sortedReviews={sortedReviews}
        userProfile={userProfile}
      />
    </section>
  );
}
