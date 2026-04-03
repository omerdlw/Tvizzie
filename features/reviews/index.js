'use client'

import { useCallback } from 'react'

import { AuthGate } from '@/core/modules/auth'
import { useModal } from '@/core/modules/modal/context'
import { Button } from '@/ui/elements'

import ReviewAuthFallback from './parts/review-auth-fallback'
import ReviewHeader from './parts/review-header'
import ReviewList from './parts/review-list'
import { useMediaReviews } from './use-media-reviews'

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
  })
  const { openModal } = useModal()

  const buildReviewUser = useCallback(
    (review = null) => {
      if (!currentUserId) {
        return null
      }

      return {
        ...(review?.user || {}),
        ...(userProfile || {}),
        id: currentUserId,
      }
    },
    [currentUserId, userProfile]
  )

  const openReviewModal = useCallback(
    (review = null) => {
      if (!currentUserId) {
        handleSignInRequest()
        return
      }

      const targetReview = review || ownReview || null

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
                applyOptimisticReviewUpdate(targetReview, updatedReview)
              }
            : null,
          review: targetReview,
          user: buildReviewUser(targetReview),
        },
      })
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
  )

  const handleEditReview = useCallback(
    (review) => {
      openReviewModal(review)
    },
    [openReviewModal]
  )

  const handleDeleteRequest = useCallback(() => {
    setNavConfirmation({
      title: 'Delete Review?',
      description: 'Are you sure you want to delete this review?',
      confirmText: 'Delete',
      isDestructive: true,
      onCancel: () => setNavConfirmation(null),
      onConfirm: async () => {
        const isDeleted = await handleDelete()

        if (!isDeleted) {
          throw new Error('review-delete-failed')
        }
      },
    })
  }, [handleDelete, setNavConfirmation])

  const backdropExtension = Math.max(0, Math.round(navHeight || 0))

  return (
    <section className="relative mx-auto mt-12 flex w-full flex-col gap-6 pt-12 md:mt-16 md:pt-20 lg:pt-24">
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 "
        style={{ bottom: -backdropExtension }}
      />
      <div className="pointer-events-none absolute bottom-full left-1/2 -z-10 h-150 w-screen -translate-x-1/2 bg-linear-to-t from-black to-transparent" />

      <ReviewHeader ratingStats={ratingStats} totalReviews={reviews.length} />

      <AuthGate
        fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={title} />}
      >
        <div className="flex items-center justify-between gap-3 border border-white/5 bg-white/5 p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {ownReview ? 'Update your review' : 'Rate or review this title'}
            </p>
            <p className="text-xs text-white/70">
              {ownReview
                ? 'Open the review modal to edit your score or text.'
                : 'Share your rating and thoughts from the review modal.'}
            </p>
          </div>
          <Button
            type="button"
            className="h-10 shrink-0 px-4 text-[11px] font-semibold tracking-widest uppercase"
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
  )
}
