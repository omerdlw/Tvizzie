'use client';

import { useState } from 'react';

import View from './view';

function createReviewState() {
  return {
    confirmation: null,
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

export default function Client({ computed, movie }) {
  const [reviewState, setReviewState] = useState(createReviewState);

  return <View computed={computed} movie={movie} reviewState={reviewState} setReviewState={setReviewState} />;
}
