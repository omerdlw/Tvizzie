'use client';

import { useState } from 'react';

import View from './view';

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

export default function Client({ computed, mediaType = 'movie', movie }) {
  const [reviewState, setReviewState] = useState(createReviewState);

  return (
    <View
      computed={computed}
      mediaType={mediaType}
      movie={movie}
      reviewState={reviewState}
      setReviewState={setReviewState}
    />
  );
}
