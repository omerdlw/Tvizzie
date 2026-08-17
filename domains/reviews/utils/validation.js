import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH } from './constants.js';
import { capitalizeLabel, normalizeRating, normalizeReviewContent } from './formatting.js';

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
  let normalizedRating = null;

  try {
    normalizedRating = normalizeRating(rating);
  } catch (error) {
    return error?.message || 'Rating is invalid';
  }

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

  if (normalizedContent.length > REVIEW_MAX_LENGTH) {
    return `${capitalizeLabel(textLabel) || 'Review'} must be at most ${REVIEW_MAX_LENGTH} characters long`;
  }

  return null;
}
