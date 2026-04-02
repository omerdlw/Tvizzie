'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth'
import { useAccountProfile } from '@/modules/account'
import { useAuth } from '@/modules/auth'
import { useNavHeight } from '@/modules/nav/hooks'
import { useToast } from '@/modules/notification/hooks'
import {
  deleteMediaReview,
  getReviewValidationError,
  subscribeToMediaReviews,
  toggleReviewLike,
  upsertMediaReview,
} from '@/services/media/reviews.service'

import { useReviewNavState } from './use-review-nav-state'
import { getRatingStats, sortReviews } from './utils'

function getReviewActionLabels({ ownReview, reviewText, rating }) {
  const hasText = reviewText.trim().length > 0
  const hasRating = rating !== null

  if (ownReview) {
    if (!hasText && hasRating) {
      return {
        loadingLabel: 'Updating Rating',
        submitLabel: 'Update Rating',
      }
    }

    return {
      loadingLabel: 'Updating Review',
      submitLabel: 'Update Review',
    }
  }

  if (!hasText && hasRating) {
    return {
      loadingLabel: 'Saving Rating',
      submitLabel: 'Save Rating',
    }
  }

  return {
    loadingLabel: 'Publishing Review',
    submitLabel: 'Publish Review',
  }
}

export function useMediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  onReviewStateChange,
}) {
  const { navHeight } = useNavHeight()
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()

  const [reviews, setReviews] = useState([])
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(null)
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [navConfirmation, setNavConfirmation] = useState(null)

  const formStateRef = useRef({ reviewText, rating, isSpoiler })

  const currentUserId = auth.user?.id
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams]
  )
  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: currentUserId,
  })

  useEffect(() => {
    formStateRef.current = { reviewText, rating, isSpoiler }
  }, [reviewText, rating, isSpoiler])

  const media = useMemo(
    () => ({
      backdropPath,
      entityId,
      entityType,
      posterPath,
      title,
    }),
    [backdropPath, entityId, entityType, posterPath, title]
  )

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setLoadError(null)

    let unsubscribe = () => {}

    try {
      unsubscribe = subscribeToMediaReviews(
        media,
        (nextReviews) => {
          if (!isMounted) return
          setReviews(nextReviews)
          setIsLoading(false)
        },
        {
          liveUserId: currentUserId,
          onError: (error) => {
            if (!isMounted) return
            console.error('[Reviews] Could not load reviews:', error)
            setLoadError(
              error?.message || 'Reviews are temporarily unavailable'
            )
            setIsLoading(false)
          },
        }
      )
    } catch (error) {
      console.error('[Reviews] Could not initialize reviews:', error)
      setLoadError(error?.message || 'Reviews are temporarily unavailable')
      setIsLoading(false)
    }

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [currentUserId, media])

  useEffect(() => {
    setHasHydratedDraft(false)
    setReviewText('')
    setRating(null)
    setIsSpoiler(false)
  }, [currentUserId, entityId, entityType])

  const ownReview = useMemo(() => {
    if (!currentUserId) {
      return null
    }

    return reviews.find((review) => review.user?.id === currentUserId) || null
  }, [reviews, currentUserId])

  useEffect(() => {
    if (hasHydratedDraft || !auth.isAuthenticated) {
      return
    }

    if (ownReview) {
      setReviewText(ownReview.content || '')
      setRating(ownReview.rating ?? null)
      setIsSpoiler(Boolean(ownReview.isSpoiler))
    }

    setHasHydratedDraft(true)
  }, [auth.isAuthenticated, hasHydratedDraft, ownReview])

  const ratingStats = useMemo(() => getRatingStats(reviews), [reviews])
  const sortedReviews = useMemo(
    () => sortReviews(reviews, currentUserId),
    [reviews, currentUserId]
  )

  const normalizedReviewLength = reviewText.trim().length
  const reviewValidationError = getReviewValidationError({
    content: reviewText,
    rating,
  })
  const { loadingLabel, submitLabel } = getReviewActionLabels({
    ownReview,
    rating,
    reviewText,
  })
  const mediaTypeLabel = entityType === 'movie' ? 'Movie' : 'Title'

  const handleSignInRequest = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    )
  }, [currentPath, router])

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault()

      const {
        reviewText: currentText,
        rating: currentRating,
        isSpoiler: currentIsSpoiler,
      } = formStateRef.current

      const normalizedReview = currentText.trim()
      const validationError = getReviewValidationError({
        content: normalizedReview,
        rating: currentRating,
      })
      const isRatingOnly = !normalizedReview && currentRating !== null

      if (!auth.isAuthenticated) {
        toast.warning('You need to sign in before posting a review')
        return
      }

      if (validationError) {
        toast.error(validationError)
        return
      }

      setIsSubmitting(true)

      try {
        await upsertMediaReview({
          content: normalizedReview,
          media,
          rating: currentRating,
          isSpoiler: normalizedReview ? currentIsSpoiler : false,
          user: userProfile || auth.user,
        })

        toast.success(
          ownReview
            ? isRatingOnly
              ? 'Your rating was updated'
              : 'Your review was updated'
            : isRatingOnly
              ? 'Your rating was saved'
              : 'Your review was published'
        )

        setIsEditing(false)

        if (!ownReview) {
          setReviewText('')
        }
      } catch (error) {
        toast.error(error?.message || 'Review could not be saved')
      } finally {
        setIsSubmitting(false)
      }
    },
    [auth, media, ownReview, toast, userProfile]
  )

  const handleDelete = useCallback(async () => {
    if (!auth.isAuthenticated || !ownReview) {
      return false
    }

    try {
      await deleteMediaReview({ media, userId: currentUserId })
      toast.success('Your review was deleted')
      setReviewText('')
      setRating(null)
      setIsSpoiler(false)
      setIsEditing(false)
      setNavConfirmation(null)
      return true
    } catch (error) {
      toast.error(error?.message || 'Failed to delete review')
      return false
    }
  }, [auth.isAuthenticated, currentUserId, media, ownReview, toast])

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated) {
        router.push(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            next: currentPath,
          })
        )
        return
      }

      try {
        await toggleReviewLike({
          media,
          reviewUserId: review?.reviewUserId || review?.user?.id,
          userId: currentUserId,
        })
      } catch (error) {
        toast.error(error?.message || 'Failed to like review')
      }
    },
    [auth.isAuthenticated, currentPath, currentUserId, media, router, toast]
  )

  const applyOptimisticReviewUpdate = useCallback((review, updatedReview) => {
    if (!review || !updatedReview) {
      return
    }

    const reviewIdentity = review.docPath || review.id

    setReviews((current) =>
      current.map((item) =>
        (item.docPath || item.id) === reviewIdentity
          ? { ...item, ...updatedReview }
          : item
      )
    )
  }, [])

  useReviewNavState({
    canSubmit: !reviewValidationError,
    handleSubmit,
    isEditing,
    isSpoiler,
    isSubmitting,
    loadingLabel,
    navConfirmation,
    onReviewStateChange,
    ownReview,
    rating,
    reviewText,
    submitLabel,
  })

  return {
    auth,
    applyOptimisticReviewUpdate,
    currentUserId,
    handleDelete,
    handleLike,
    handleSignInRequest,
    handleSubmit,
    isEditing,
    isLoading,
    isSpoiler,
    isSubmitting,
    loadError,
    mediaTypeLabel,
    navConfirmation,
    navHeight,
    normalizedReviewLength,
    ownReview,
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
  }
}
