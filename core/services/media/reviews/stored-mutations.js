'use client';

import { isListSubjectType, isMovieMediaType } from '@/core/utils/media';
import { deleteListReview, toggleListReviewLike } from './list-mutations.js';
import { deleteMediaReview, toggleReviewLike } from './media-mutations.js';

export async function toggleStoredReviewLike({ review, userId }) {
  if (!review || !userId) {
    throw new Error('review and userId are required');
  }

  if (isListSubjectType(review.subjectType)) {
    return toggleListReviewLike({
      listId: review.subjectId,
      ownerId: review.subjectOwnerId,
      review,
      reviewUserId: review.reviewUserId,
      userId,
    });
  }

  if (!isMovieMediaType(review.subjectType)) {
    throw new Error('Only movie reviews are supported');
  }

  return toggleReviewLike({
    media: {
      entityId: review.subjectId,
      entityType: review.subjectType,
      title: review.subjectTitle || 'Untitled',
    },
    review,
    reviewUserId: review.reviewUserId,
    userId,
  });
}

export async function deleteStoredReview({ review, userId }) {
  if (!review || !userId) {
    throw new Error('review and userId are required');
  }

  if (isListSubjectType(review.subjectType)) {
    return deleteListReview({
      listId: review.subjectId,
      ownerId: review.subjectOwnerId,
      userId,
    });
  }

  if (!isMovieMediaType(review.subjectType)) {
    throw new Error('Only movie reviews are supported');
  }

  return deleteMediaReview({
    media: {
      entityId: review.subjectId,
      entityType: review.subjectType,
      title: review.subjectTitle || 'Untitled',
    },
    userId,
  });
}
