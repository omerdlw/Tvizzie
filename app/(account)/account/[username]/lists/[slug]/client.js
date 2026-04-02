'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAccountSectionPage } from '@/features/account/section-client-hooks'
import { isPermissionDeniedError } from '@/lib/data/errors'
import { getRatingStats } from '@/features/reviews/utils'
import { useAccountProfile } from '@/modules/account'
import { useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useToast } from '@/modules/notification/hooks'
import {
  buildPollingSubscriptionKey,
  primePollingSubscription,
} from '@/services/core/polling-subscription.service'
import {
  subscribeToUserListBySlug,
  subscribeToUserListItems,
  toggleListLike,
} from '@/services/media/lists.service'
import {
  deleteListReview,
  getReviewValidationError,
  subscribeToListReviews,
  toggleStoredReviewLike,
  upsertListReview,
} from '@/services/media/reviews.service'
import { useReviewNavState } from '@/features/reviews/use-review-nav-state'
import ListView from './view'

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

export default function Client({
  initialCollections = null,
  initialList = null,
  initialListItems = [],
  initialListReviews = [],
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  slug,
  username,
}) {
  const auth = useAuth()
  const { openModal } = useModal()
  const toast = useToast()
  const [list, setList] = useState(initialList)
  const [listItems, setListItems] = useState(
    Array.isArray(initialListItems) ? initialListItems : []
  )
  const [reviews, setReviews] = useState(
    Array.isArray(initialListReviews) ? initialListReviews : []
  )
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(null)
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [reviewState, setReviewState] = useState({
    confirmation: null,
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  })

  const formStateRef = useRef({ reviewText: '', rating: null, isSpoiler: false })
  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: auth.user?.id || null,
  })

  useEffect(() => {
    formStateRef.current = { reviewText, rating, isSpoiler }
  }, [reviewText, rating, isSpoiler])

  const {
    canViewProfileCollections,
    canViewPrivateContent,
    followerCount,
    followingCount,
    followState,
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioMaskOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    itemRemoveConfirmation,
    likeCount,
    listCount,
    listDeleteConfirmation,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioMaskOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeListId: list?.id || '',
    activeTab: 'lists',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    selectedList: list,
    username,
  })
  const hasSeededList = Boolean(initialList?.id) && initialList.slug === slug
  const hasSeededListItems =
    hasSeededList && Array.isArray(initialListItems)
  const hasSeededListReviews =
    hasSeededList && Array.isArray(initialListReviews)

  useEffect(() => {
    setList(hasSeededList ? initialList : null)
  }, [hasSeededList, initialList])

  useEffect(() => {
    setListItems(hasSeededListItems ? initialListItems : [])
  }, [hasSeededListItems, initialListItems])

  useEffect(() => {
    setReviews(hasSeededListReviews ? initialListReviews : [])
  }, [hasSeededListReviews, initialListReviews])

  useEffect(() => {
    setIsEditingReview(false)
    setReviewText('')
    setRating(null)
    setIsSpoiler(false)
  }, [list?.id])

  useEffect(() => {
    if (!resolvedUserId || !hasSeededList) {
      return
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('lists:slug', {
        hiddenIntervalMs: null,
        intervalMs: null,
        slug,
        userId: resolvedUserId,
      }),
      initialList,
      { emit: false }
    )
  }, [hasSeededList, initialList, resolvedUserId, slug])

  useEffect(() => {
    if (!resolvedUserId || !initialList?.id || !hasSeededListItems) {
      return
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('lists:items', {
        hiddenIntervalMs: null,
        intervalMs: null,
        listId: initialList.id,
        userId: resolvedUserId,
      }),
      initialListItems,
      { emit: false }
    )
  }, [hasSeededListItems, initialList?.id, initialListItems, resolvedUserId])

  useEffect(() => {
    if (!resolvedUserId || !initialList?.id || !hasSeededListReviews) {
      return
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('reviews:list', {
        listId: initialList.id,
        ownerId: resolvedUserId,
      }),
      initialListReviews,
      { emit: false }
    )
  }, [hasSeededListReviews, initialList?.id, initialListReviews, resolvedUserId])

  useEffect(() => {
    if (!resolvedUserId || !canViewProfileCollections) {
      setList(null)
      return undefined
    }

    return subscribeToUserListBySlug(
      resolvedUserId,
      slug,
      (nextList) => {
        setList(nextList)
      },
      {
        fetchOnSubscribe: !hasSeededList,
        onError: (error) => {
          if (!hasSeededList) {
            setList(null)
          }

          if (!isPermissionDeniedError(error)) {
            toast.error(error?.message || 'List could not be loaded')
          }
        },
      }
    )
  }, [canViewProfileCollections, hasSeededList, resolvedUserId, slug, toast])

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      setListItems([])
      return undefined
    }

    return subscribeToUserListItems(
      resolvedUserId,
      list.id,
      setListItems,
      {
        fetchOnSubscribe: !hasSeededListItems,
        onError: (error) => {
          if (!hasSeededListItems) {
            setListItems([])
          }

          if (!isPermissionDeniedError(error)) {
            toast.error(error?.message || 'List items could not be loaded')
          }
        },
      }
    )
  }, [canViewProfileCollections, hasSeededListItems, list?.id, resolvedUserId, toast])

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      setReviews([])
      return undefined
    }

    return subscribeToListReviews(
      { list, ownerId: resolvedUserId, listId: list.id },
      setReviews,
      {
        fetchOnSubscribe: !hasSeededListReviews,
        liveUserId: auth.user?.id || null,
        onError: (error) => {
          if (!hasSeededListReviews) {
            setReviews([])
          }

          if (!isPermissionDeniedError(error)) {
            toast.error(error?.message || 'List reviews could not be loaded')
          }
        },
      }
    )
  }, [
    auth.user?.id,
    canViewProfileCollections,
    hasSeededListReviews,
    list,
    resolvedUserId,
    toast,
  ])

  const ownReview = useMemo(() => {
    if (!auth.user?.id) {
      return null
    }

    return reviews.find((review) => review.user?.id === auth.user.id) || null
  }, [auth.user?.id, reviews])

  useEffect(() => {
    if (!ownReview) {
      return
    }

    setReviewText(ownReview.content || '')
    setRating(ownReview.rating ?? null)
    setIsSpoiler(Boolean(ownReview.isSpoiler))
  }, [ownReview])

  const handleToggleLike = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id || !list?.id || !resolvedUserId) {
      handleSignInRequest()
      return
    }

    setIsLikeLoading(true)

    try {
      await toggleListLike({
        listId: list.id,
        ownerId: resolvedUserId,
        userId: auth.user.id,
      })
    } catch (error) {
      toast.error(error?.message || 'List could not be updated')
    } finally {
      setIsLikeLoading(false)
    }
  }, [auth.isAuthenticated, auth.user?.id, handleSignInRequest, list?.id, resolvedUserId, toast])

  const handleSubmitReview = useCallback(
    async (event) => {
      event?.preventDefault()

      if (!auth.isAuthenticated) {
        handleSignInRequest()
        return
      }

      if (!list?.id || !resolvedUserId) {
        return
      }

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

      if (validationError) {
        toast.error(validationError)
        return
      }

      try {
        setIsSubmitting(true)
        await upsertListReview({
          content: normalizedReview,
          isSpoiler: normalizedReview ? currentIsSpoiler : false,
          list,
          listId: list.id,
          ownerId: resolvedUserId,
          rating: currentRating,
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
        setIsEditingReview(false)
      } catch (error) {
        toast.error(error?.message || 'Review could not be saved')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      auth.isAuthenticated,
      auth.user,
      handleSignInRequest,
      list,
      ownReview,
      resolvedUserId,
      toast,
      userProfile,
    ]
  )

  const handleDeleteReview = useCallback(async () => {
    if (!ownReview || !resolvedUserId || !list?.id || !auth.user?.id) {
      return false
    }

    try {
      await deleteListReview({
        listId: list.id,
        ownerId: resolvedUserId,
        userId: auth.user.id,
      })
      toast.success('Your review was deleted')
      setReviewText('')
      setRating(null)
      setIsSpoiler(false)
      setIsEditingReview(false)
      return true
    } catch (error) {
      toast.error(error?.message || 'Review could not be deleted')
      return false
    }
  }, [auth.user?.id, list?.id, ownReview, resolvedUserId, toast])

  const handleLikeReview = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest()
        return
      }

      try {
        const nextLikedState = await toggleStoredReviewLike({
          review,
          userId: auth.user.id,
        })

        setReviews((current) =>
          current.map((item) => {
            if ((item.docPath || item.id) !== (review.docPath || review.id)) {
              return item
            }

            const currentLikes = Array.isArray(item.likes) ? item.likes : []
            const nextLikes = nextLikedState
              ? Array.from(new Set([...currentLikes, auth.user.id]))
              : currentLikes.filter((likeUserId) => likeUserId !== auth.user.id)

            return {
              ...item,
              likes: nextLikes,
            }
          })
        )
      } catch (error) {
        toast.error(error?.message || 'Review could not be updated')
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, toast]
  )

  const handleDeleteRequest = useCallback(() => {
    handleDeleteReview()
  }, [handleDeleteReview])

  const handleEditReview = useCallback(
    (review) => {
      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          onSuccess: (updatedReview) => {
            setReviews((current) =>
              current.map((item) =>
                (item.docPath || item.id) === (review.docPath || review.id)
                  ? { ...item, ...updatedReview }
                  : item
              )
            )
          },
          review,
          user: auth.user?.id
            ? {
                ...(review.user || {}),
                ...(userProfile || {}),
                id: auth.user.id,
              }
            : null,
        },
      })
    },
    [auth.user?.id, openModal, userProfile]
  )

  const reviewValidationError = getReviewValidationError({
    content: reviewText,
    rating,
  })
  const { loadingLabel, submitLabel } = getReviewActionLabels({
    ownReview,
    rating,
    reviewText,
  })

  useReviewNavState({
    canSubmit: !reviewValidationError,
    handleSubmit: handleSubmitReview,
    isEditing: isEditingReview,
    isSpoiler,
    isSubmitting,
    loadingLabel,
    navConfirmation: null,
    onReviewStateChange: setReviewState,
    ownReview,
    rating,
    reviewText,
    submitLabel,
  })

  const isLiked = auth.user?.id ? list?.likes?.includes(auth.user.id) : false
  const requiresFollowForProfileInteractions =
    !isOwner && isPrivateProfile && !canViewPrivateContent
  const ratingStats = getRatingStats(reviews)

  return (
    <ListView
      auth={auth}
      canShowList={canViewProfileCollections}
      requiresFollowForProfileInteractions={requiresFollowForProfileInteractions}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleDeleteRequest={handleDeleteRequest}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleLikeReview={handleLikeReview}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleSubmitReview={handleSubmitReview}
      handleToggleLike={handleToggleLike}
      isBioMaskOpen={isBioMaskOpen}
      isEditingReview={isEditingReview}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      isSpoiler={isSpoiler}
      itemRemoveConfirmation={itemRemoveConfirmation}
      likeCount={likeCount}
      list={list}
      listDeleteConfirmation={listDeleteConfirmation}
      listCount={listCount}
      listItems={listItems}
      ownReview={ownReview}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      rating={rating}
      ratingStats={ratingStats}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      reviews={reviews}
      reviewState={reviewState}
      reviewText={reviewText}
      handleEditReview={handleEditReview}
      setIsBioMaskOpen={setIsBioMaskOpen}
      setIsEditingReview={setIsEditingReview}
      setIsSpoiler={setIsSpoiler}
      setRating={setRating}
      setReviewText={setReviewText}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      userProfile={userProfile}
      watchlistCount={watchlistCount}
    />
  )
}
