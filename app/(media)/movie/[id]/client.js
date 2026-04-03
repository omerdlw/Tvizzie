'use client'

import { useEffect, useState } from 'react'

import { getPreferredMovieBackground } from '@/features/movie/utils'
import { TMDB_IMG } from '@/core/constants'

import MovieView from './view'

function createReviewState() {
  return {
    confirmation: null,
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  }
}

export default function Client({
  computed,
  movie,
  secondaryDataPromise,
}) {
  const fallbackBackgroundImage = movie?.backdrop_path
    ? `${TMDB_IMG}/w1280${movie.backdrop_path}`
    : null

  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage)
  const [reviewState, setReviewState] = useState(createReviewState)

  useEffect(() => {
    let isActive = true

    setBackgroundImage(fallbackBackgroundImage)

    void Promise.resolve(secondaryDataPromise)
      .then((secondaryMovie) => {
        if (!isActive) {
          return
        }

        setBackgroundImage(
          getPreferredMovieBackground(secondaryMovie?.images) ||
            fallbackBackgroundImage
        )
      })
      .catch(() => {
        if (isActive) {
          setBackgroundImage(fallbackBackgroundImage)
        }
      })

    return () => {
      isActive = false
    }
  }, [fallbackBackgroundImage, secondaryDataPromise])

  return (
    <MovieView
      backgroundImage={backgroundImage}
      computed={computed}
      movie={movie}
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
    />
  )
}
