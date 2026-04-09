'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearMovieBackgroundPreference,
  clearMoviePosterPreference,
  getMovieBackgroundPreferenceFilePath,
  getMoviePosterPreferenceFilePath,
  setMovieBackgroundPreference,
  setMoviePosterPreference,
} from '@/features/movie/background-preferences';
import {
  createMovieBackdropImageUrl,
  createMoviePosterImageUrl,
  getPreferredMovieBackground,
} from '@/features/movie/utils';

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

function createUniqueImageCandidates(candidates = []) {
  return [...new Set(candidates.filter((candidate) => typeof candidate === 'string' && candidate.trim()))];
}

async function resolveFirstLoadableImage(candidates = []) {
  const resolvedCandidates = createUniqueImageCandidates(candidates);

  for (const candidate of resolvedCandidates) {
    try {
      await preloadBackgroundImage(candidate);
      return candidate;
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

async function resolveFirstLoadablePosterFilePath(candidates = []) {
  const resolvedCandidates = createUniqueImageCandidates(candidates);

  for (const filePath of resolvedCandidates) {
    try {
      await preloadBackgroundImage(createMoviePosterImageUrl(filePath));
      return filePath;
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

export default function Client({ computed, movie, secondaryDataPromise }) {
  const movieId = movie?.id;
  const fallbackPosterFilePath = movie?.poster_path || null;
  const fallbackBackgroundImage = createMovieBackdropImageUrl(movie?.backdrop_path);

  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage);
  const [posterFilePath, setPosterFilePath] = useState(fallbackPosterFilePath);
  const [canResetMovieBackground, setCanResetMovieBackground] = useState(false);
  const [canResetMoviePoster, setCanResetMoviePoster] = useState(false);
  const [reviewState, setReviewState] = useState(createReviewState);

  const resolvedMovie = useMemo(
    () => ({
      ...movie,
      poster_path: posterFilePath || movie?.poster_path || null,
    }),
    [movie, posterFilePath]
  );

  const handleSetMovieBackground = useCallback(
    ({ filePath }) => {
      if (!movieId || typeof filePath !== 'string' || !filePath.trim()) {
        return;
      }

      const nextBackgroundImage = createMovieBackdropImageUrl(filePath);
      if (!nextBackgroundImage) {
        return;
      }

      setMovieBackgroundPreference(movieId, filePath);
      setCanResetMovieBackground(true);
      setBackgroundImage(nextBackgroundImage);
    },
    [movieId]
  );

  const handleSetMoviePoster = useCallback(
    ({ filePath }) => {
      if (!movieId || typeof filePath !== 'string' || !filePath.trim()) {
        return;
      }

      setMoviePosterPreference(movieId, filePath);
      setCanResetMoviePoster(true);
      setPosterFilePath(filePath);
    },
    [movieId]
  );

  const handleResetMovieBackground = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMovieBackgroundPreference(movieId);
    setCanResetMovieBackground(false);
    setBackgroundImage(fallbackBackgroundImage || null);

    void Promise.resolve(secondaryDataPromise)
      .then(async (secondaryMovie) => {
        const autoBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images);
        const nextBackgroundImage = await resolveFirstLoadableImage([autoBackgroundImage, fallbackBackgroundImage]);
        setBackgroundImage(nextBackgroundImage || null);
      })
      .catch(async () => {
        const nextBackgroundImage = await resolveFirstLoadableImage([fallbackBackgroundImage]);
        setBackgroundImage(nextBackgroundImage || null);
      });
  }, [fallbackBackgroundImage, movieId, secondaryDataPromise]);

  const handleResetMoviePoster = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMoviePosterPreference(movieId);
    setCanResetMoviePoster(false);
    setPosterFilePath(fallbackPosterFilePath || null);
  }, [fallbackPosterFilePath, movieId]);

  useEffect(() => {
    let isActive = true;

    const preferredPosterFilePath = getMoviePosterPreferenceFilePath(movieId);
    setCanResetMoviePoster(Boolean(preferredPosterFilePath));
    setPosterFilePath(preferredPosterFilePath || fallbackPosterFilePath || null);

    void resolveFirstLoadablePosterFilePath([preferredPosterFilePath, fallbackPosterFilePath]).then((filePath) => {
      if (isActive) {
        setPosterFilePath(filePath || fallbackPosterFilePath || null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [fallbackPosterFilePath, movieId]);

  useEffect(() => {
    let isActive = true;
    const preferredFilePath = getMovieBackgroundPreferenceFilePath(movieId);
    setCanResetMovieBackground(Boolean(preferredFilePath));
    const preferredBackgroundImage = createMovieBackdropImageUrl(preferredFilePath);

    setBackgroundImage(preferredBackgroundImage || fallbackBackgroundImage || null);

    void Promise.resolve(secondaryDataPromise)
      .then(async (secondaryMovie) => {
        if (!isActive) {
          return;
        }

        const autoBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images);
        const nextBackgroundImage = await resolveFirstLoadableImage([
          preferredBackgroundImage,
          autoBackgroundImage,
          fallbackBackgroundImage,
        ]);

        if (isActive) {
          setBackgroundImage(nextBackgroundImage || null);
        }
      })
      .catch(async () => {
        const nextBackgroundImage = await resolveFirstLoadableImage([preferredBackgroundImage, fallbackBackgroundImage]);

        if (isActive) {
          setBackgroundImage(nextBackgroundImage || null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fallbackBackgroundImage, movieId, secondaryDataPromise]);

  return (
    <MovieView
      onSetMoviePoster={handleSetMoviePoster}
      onSetMovieBackground={handleSetMovieBackground}
      onResetMoviePoster={handleResetMoviePoster}
      onResetMovieBackground={handleResetMovieBackground}
      canResetMoviePoster={canResetMoviePoster}
      canResetMovieBackground={canResetMovieBackground}
      backgroundImage={backgroundImage}
      computed={computed}
      movie={resolvedMovie}
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
    />
  );
}
