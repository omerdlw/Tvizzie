'use client';

import { useEffect, useRef } from 'react';

export function useReviewNavState({
  canSubmit = true,
  handleSubmit,
  isEditing,
  isSpoiler,
  isSubmitting,
  loadingLabel = null,
  navConfirmation,
  onReviewStateChange,
  ownReview,
  rating,
  reviewText,
  submitLabel = null,
}) {
  const lastStateRef = useRef(null);

  useEffect(() => {
    if (!onReviewStateChange) {
      return;
    }

    const normalizedReviewText = reviewText.trim();
    const hasText = normalizedReviewText.length > 0;
    const effectiveIsSpoiler = hasText && isSpoiler;
    const existingReview = ownReview && typeof ownReview === 'object' ? ownReview : null;
    const existingText = existingReview?.content || '';
    const existingHasText = existingText.trim().length > 0;
    const existingSpoiler = existingHasText && Boolean(existingReview?.isSpoiler);
    const isChanged = existingReview
      ? normalizedReviewText !== existingText ||
        rating !== (existingReview.rating ?? null) ||
        effectiveIsSpoiler !== existingSpoiler
      : hasText || rating !== null;

    const currentState = {
      canSubmit,
      confirmation: navConfirmation,
      isActive: isChanged && (!ownReview || isEditing),
      isSubmitting,
      loadingLabel,
      ownReview: Boolean(ownReview),
      submitLabel,
    };

    const previousState = lastStateRef.current;
    const isModified =
      !previousState ||
      previousState.canSubmit !== currentState.canSubmit ||
      previousState.confirmation !== currentState.confirmation ||
      previousState.isActive !== currentState.isActive ||
      previousState.isSubmitting !== currentState.isSubmitting ||
      previousState.loadingLabel !== currentState.loadingLabel ||
      previousState.ownReview !== currentState.ownReview ||
      previousState.submitLabel !== currentState.submitLabel;

    if (!isModified) {
      return;
    }

    lastStateRef.current = currentState;

    onReviewStateChange({
      ...currentState,
      submitReview: handleSubmit,
    });
  }, [
    handleSubmit,
    isEditing,
    isSpoiler,
    isSubmitting,
    canSubmit,
    loadingLabel,
    navConfirmation,
    onReviewStateChange,
    ownReview,
    rating,
    reviewText,
    submitLabel,
  ]);
}
