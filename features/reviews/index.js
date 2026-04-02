'use client'

import { useCallback } from 'react'

import { AuthGate } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'

import ReviewAuthFallback from './parts/review-auth-fallback'
import ReviewComposer from './parts/review-composer'
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
    handleSubmit,
    isEditing,
    isLoading,
    isSpoiler,
    loadError,
    mediaTypeLabel,
    navHeight,
    normalizedReviewLength,
    ownReview,
    applyOptimisticReviewUpdate,
    rating,
    ratingStats,
    reviewText,
    reviews,
    setIsEditing,
    setIsSpoiler,
    setNavConfirmation,
    setRating,
    setReviewText,
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

  const handleEditReview = useCallback(
    (review) => {
      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          onSuccess: (updatedReview) => {
            applyOptimisticReviewUpdate(review, updatedReview)
          },
          review,
          user: currentUserId
            ? {
                ...(review.user || {}),
                ...(userProfile || {}),
                id: currentUserId,
              }
            : null,
        },
      })
    },
    [applyOptimisticReviewUpdate, currentUserId, openModal, userProfile]
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
        {(!ownReview || isEditing) && (
          <ReviewComposer
            isEditing={isEditing}
            isSpoiler={isSpoiler}
            mediaTypeLabel={mediaTypeLabel}
            normalizedReviewLength={normalizedReviewLength}
            onSubmit={handleSubmit}
            ownReview={ownReview}
            rating={rating}
            reviewText={reviewText}
            setIsEditing={setIsEditing}
            setIsSpoiler={setIsSpoiler}
            setRating={setRating}
            setReviewText={setReviewText}
            title={title}
          />
        )}
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
