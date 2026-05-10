'use client';

import { REVIEW_MIN_LENGTH } from './constants.js';
import { capitalizeLabel, normalizeRating, normalizeReviewContent } from './shared.js';

export function getReviewMinLength() {
  return REVIEW_MIN_LENGTH;
}

export function getReviewValidationError({
  content,
  rating,
  allowRating = true,
  requireText = false,
  textLabel = 'review',
}) {
  const normalizedContent = normalizeReviewContent(content);
  const normalizedRating = normalizeRating(rating);

  if (!allowRating && normalizedRating !== null) {
    return 'Lists only support comments';
  }

  if (requireText && !normalizedContent) {
    return 'Write a comment to share your thoughts';
  }

  if (!normalizedContent && normalizedRating === null) {
    return 'Add a score or write a review';
  }

  if (normalizedContent.length > 0 && normalizedContent.length < REVIEW_MIN_LENGTH) {
    return `${capitalizeLabel(textLabel) || 'Review'} must be at least ${REVIEW_MIN_LENGTH} characters long`;
  }

  return null;
}
