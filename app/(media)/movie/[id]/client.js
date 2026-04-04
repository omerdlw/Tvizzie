'use client';

import { useEffect, useState } from 'react';

import { getPreferredMovieBackground } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';

import MovieView from './view';

function createReviewState() {
  return {
    confirmation: null,
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

function preloadBackgroundImage(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      resolve(null);
      return;
    }

    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(source);
    image.onerror = reject;
    image.src = source;

    if (image.complete) {
      resolve(source);
    }
  });
}

export default function Client({ computed, movie, secondaryDataPromise }) {
  const fallbackBackgroundImage = movie?.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : null;

  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage);
  const [reviewState, setReviewState] = useState(createReviewState);

  useEffect(() => {
    let isActive = true;

    setBackgroundImage(fallbackBackgroundImage);

    void Promise.resolve(secondaryDataPromise)
      .then(async (secondaryMovie) => {
        if (!isActive) {
          return;
        }

        const nextBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images) || fallbackBackgroundImage;

        if (!nextBackgroundImage || nextBackgroundImage === fallbackBackgroundImage) {
          setBackgroundImage(fallbackBackgroundImage);
          return;
        }

        try {
          await preloadBackgroundImage(nextBackgroundImage);

          if (isActive) {
            setBackgroundImage(nextBackgroundImage);
          }
        } catch {
          if (isActive) {
            setBackgroundImage(fallbackBackgroundImage);
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setBackgroundImage(fallbackBackgroundImage);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fallbackBackgroundImage, secondaryDataPromise]);

  return (
    <MovieView
      backgroundImage={backgroundImage}
      computed={computed}
      movie={movie}
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
    />
  );
}
