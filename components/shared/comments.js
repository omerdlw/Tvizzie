'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { cn, formatDate } from '@/lib/utils'
import { AuthGate, useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useNavHeight } from '@/modules/nav/hooks'
import { useToast } from '@/modules/notification/hooks'
import {
  deleteMediaComment,
  getCommentMinLength,
  subscribeToMediaComments,
  toggleCommentLike,
  upsertMediaComment,
} from '@/services/comments.service'
import { subscribeToUserProfile } from '@/services/profile.service'
import { Button, Textarea } from '@/ui/elements'
import Icon from '@/ui/icon'

const COMMENT_MIN_LENGTH = getCommentMinLength()

function RatingSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:star-bold" size={15} className="text-yellow-400" />
          <span className="text-[11px] font-semibold tracking-[0.22em] text-white/45 uppercase">
            Your Score
          </span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] font-semibold tracking-[0.22em] text-white/35 uppercase transition hover:text-white/70"
          >
            Clear
          </button>
        ) : (
          <span className="text-[11px] font-semibold tracking-[0.22em] text-white/28 uppercase">
            Optional
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, index) => {
          const score = index + 1
          const isSelected = value === score

          return (
            <button
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center rounded-[20px] border text-sm font-semibold transition',
                isSelected
                  ? 'border-yellow-400 bg-yellow-400/70 text-white ring-1 ring-yellow-400/20'
                  : 'border-white/5 bg-white/5 text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white'
              )}
              key={score}
            >
              {score}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CommentCard({
  comment,
  isOwnComment = false,
  onEdit,
  onDelete,
  onLike,
  currentUserId,
}) {
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false)
  const isSpoiler = !!comment.isSpoiler
  const likesCount = comment.likes?.length || 0
  const hasLiked = currentUserId
    ? comment.likes?.includes(currentUserId)
    : false
  const displayName =
    comment.user?.displayName ||
    comment.user?.name ||
    comment.user?.email ||
    'Anonymous User'
  const username = comment.user?.username
  const avatarSeed = comment.user?.id || comment.id
  const timestamp = comment.updatedAt || comment.createdAt

  const { openModal } = useModal()

  return (
    <div
      className={cn(
        'flex w-full items-center gap-4 border-b border-white/10 py-4 last:border-b-0'
      )}
    >
      <div className="relative flex w-full gap-4">
        <div
          className={cn(
            'flex w-full items-center gap-4 transition-all duration-300 sm:gap-5',
            isSpoiler && !isSpoilerVisible
              ? 'pointer-events-none blur-sm select-none'
              : ''
          )}
        >
          <Link
            href={`/profile/${username || comment.user?.id || comment.id}`}
            className="group/avatar relative size-12 shrink-0 self-center overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-white/10 transition-transform active:scale-95 sm:size-14"
          >
            <Image
              src={
                comment.user?.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`
              }
              className="object-cover transition-transform duration-500 group-hover/avatar:scale-110"
              alt={displayName}
              unoptimized
              fill
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4 py-1">
            <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href={`/profile/${username || comment.user?.id || comment.id}`}
                  className="group/name"
                >
                  <h3 className="text-sm font-semibold transition-colors group-hover/name:text-white sm:text-base">
                    {displayName}
                  </h3>
                </Link>

                {isOwnComment && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={onEdit}
                      title="Edit Review"
                      disabled={isSpoiler && !isSpoilerVisible}
                      className="text-[11px] font-semibold tracking-[0.14em] text-blue-400 uppercase transition hover:text-blue-200 disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openModal('CONFIRMATION_MODAL', 'bottom', {
                          title: 'Delete Review?',
                          description:
                            'Are you sure you want to delete this review? This action cannot be undone',
                          confirmText: 'Delete',
                          isDestructive: true,
                          onConfirm: onDelete,
                        })
                      }}
                      title="Delete Review"
                      disabled={isSpoiler && !isSpoilerVisible}
                      className="text-[11px] font-semibold tracking-[0.14em] text-red-400 uppercase transition hover:text-red-200 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm leading-6 whitespace-pre-wrap text-white/70 sm:text-base">
                {comment.content}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4 self-center">
              <div className="flex flex-col items-end gap-1">
                {comment.rating ? (
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-yellow-400 uppercase">
                    {comment.rating}/10
                  </span>
                ) : null}
                <span className="text-right text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase">
                  {timestamp ? formatDate(timestamp) : 'Just now'}
                </span>
              </div>

              <div className="flex h-full">
                <button
                  onClick={onLike}
                  disabled={isSpoiler && !isSpoilerVisible}
                  className={cn(
                    'flex h-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-[14px] bg-white/5 px-2.5 py-2 text-[10px] font-bold transition hover:bg-white/10',
                    hasLiked ? 'text-error' : 'text-white/50'
                  )}
                >
                  <Icon
                    icon={hasLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
                    size={20}
                  />
                  <span>{likesCount > 0 ? likesCount : 'Like'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {isSpoiler && !isSpoilerVisible && (
          <div className="center absolute inset-0 z-10">
            <button
              onClick={() => setIsSpoilerVisible(true)}
              className="flex cursor-pointer items-center gap-2 rounded-[20px] border border-white/10 bg-white px-6 py-3 text-xs font-semibold tracking-wide text-black transition hover:bg-black hover:text-white"
            >
              <Icon icon="solar:eye-bold" size={16} />
              Spoiler alert
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MediaComments({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  onReviewStateChange,
}) {
  const { navHeight } = useNavHeight()
  const auth = useAuth()
  const { openModal } = useModal()
  const toast = useToast()
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [rating, setRating] = useState(null)
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const lastStateRef = useRef(null)
  const formStateRef = useRef({ commentText, rating, isSpoiler })

  useEffect(() => {
    if (!auth.user?.id) {
      setUserProfile(null)
      return undefined
    }

    return subscribeToUserProfile(auth.user.id, (profile) => {
      setUserProfile(profile)
    })
  }, [auth.user?.id])

  useEffect(() => {
    formStateRef.current = { commentText, rating, isSpoiler }
  }, [commentText, rating, isSpoiler])

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
      unsubscribe = subscribeToMediaComments(
        media,
        (nextComments) => {
          if (!isMounted) return

          setComments(nextComments)
          setIsLoading(false)
        },
        {
          onError: (error) => {
            if (!isMounted) return

            console.error('[Comments] Could not load comments:', error)
            setLoadError(
              error?.message || 'Comments are temporarily unavailable'
            )
            setIsLoading(false)
          },
        }
      )
    } catch (error) {
      console.error('[Comments] Could not initialize comments:', error)
      setLoadError(error?.message || 'Comments are temporarily unavailable')
      setIsLoading(false)
    }

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [media])

  useEffect(() => {
    setHasHydratedDraft(false)
    setCommentText('')
    setRating(null)
    setIsSpoiler(false)
  }, [auth.user?.id, entityId, entityType])

  const ownComment = useMemo(() => {
    if (!auth.user?.id) return null

    return comments.find((comment) => comment.user?.id === auth.user.id) || null
  }, [auth.user?.id, comments])

  useEffect(() => {
    if (hasHydratedDraft || !auth.isAuthenticated) return

    if (ownComment) {
      setCommentText(ownComment.content || '')
      setRating(ownComment.rating ?? null)
      setIsSpoiler(!!ownComment.isSpoiler)
    }

    setHasHydratedDraft(true)
  }, [auth.isAuthenticated, hasHydratedDraft, ownComment])

  const ratingStats = useMemo(() => {
    const ratedComments = comments.filter((comment) =>
      Number.isFinite(comment.rating)
    )

    if (ratedComments.length === 0) {
      return { average: null, count: 0 }
    }

    const total = ratedComments.reduce(
      (sum, comment) => sum + Number(comment.rating),
      0
    )

    return {
      average: (total / ratedComments.length).toFixed(1),
      count: ratedComments.length,
    }
  }, [comments])

  const sortedComments = useMemo(() => {
    return [...comments].sort((first, second) => {
      if (first.user?.id === auth.user?.id) return -1
      if (second.user?.id === auth.user?.id) return 1

      const firstLikes = first.likes?.length || 0
      const secondLikes = second.likes?.length || 0

      if (firstLikes !== secondLikes) {
        return secondLikes - firstLikes
      }

      const firstTime = new Date(
        first.updatedAt || first.createdAt || 0
      ).getTime()
      const secondTime = new Date(
        second.updatedAt || second.createdAt || 0
      ).getTime()

      return secondTime - firstTime
    })
  }, [auth.user?.id, comments])

  const normalizedCommentLength = commentText.trim().length
  const mediaTypeLabel =
    entityType === 'tv' ? 'Series' : entityType === 'movie' ? 'Movie' : 'Title'

  async function handleSignInRequest() {
    await openModal('AUTH_MODAL', 'bottom', {
      data: {
        mode: 'sign-in',
      },
    })
  }

  const handleSubmit = useCallback(
    async (event) => {
      if (event) event.preventDefault()

      const {
        commentText: currentText,
        rating: currentRating,
        isSpoiler: currentIsSpoiler,
      } = formStateRef.current
      const normalizedComment = currentText.trim()

      if (!auth.isAuthenticated) {
        toast.warning('You need to sign in before posting a comment')
        return
      }

      if (normalizedComment.length < COMMENT_MIN_LENGTH) {
        toast.error(
          `Comment must be at least ${COMMENT_MIN_LENGTH} characters long`
        )
        return
      }

      setIsSubmitting(true)
      const activeUser = userProfile || auth.user

      try {
        await upsertMediaComment({
          content: normalizedComment,
          media,
          rating: currentRating,
          isSpoiler: currentIsSpoiler,
          user: activeUser,
        })

        toast.success(
          ownComment ? 'Your review was updated' : 'Your review was published'
        )
        setIsEditing(false)
        if (!ownComment) {
          setCommentText('')
        }
      } catch (error) {
        toast.error(error?.message || 'Comment could not be saved')
      } finally {
        setIsSubmitting(false)
      }
    },
    [auth, media, ownComment, toast, userProfile]
  )

  async function handleDelete() {
    if (!auth.isAuthenticated || !ownComment) return

    try {
      await deleteMediaComment({ media, userId: auth.user.id })
      toast.success('Your review was deleted')
      setCommentText('')
      setRating(null)
      setIsSpoiler(false)
      setIsEditing(false)
    } catch (error) {
      toast.error(error?.message || 'Failed to delete comment')
    }
  }

  async function handleLike(commentId) {
    if (!auth.isAuthenticated) {
      toast.warning('You need to sign in to like comments')
      return
    }

    try {
      await toggleCommentLike({
        media,
        commentUserId: commentId,
        userId: auth.user.id,
      })
    } catch (error) {
      toast.error(error?.message || 'Failed to like comment')
    }
  }

  useEffect(() => {
    if (onReviewStateChange) {
      const isChanged = ownComment
        ? commentText.trim() !== (ownComment.content || '') ||
          rating !== (ownComment.rating ?? null) ||
          isSpoiler !== !!ownComment.isSpoiler
        : commentText.trim().length > 0 || rating !== null || isSpoiler

      const isActive = isChanged && (!ownComment || isEditing)
      const hasOwnComment = !!ownComment

      const currentState = {
        isActive,
        isSubmitting,
        ownComment: hasOwnComment,
      }

      const prevState = lastStateRef.current
      const isStateModified =
        !prevState ||
        prevState.isActive !== currentState.isActive ||
        prevState.isSubmitting !== currentState.isSubmitting ||
        prevState.ownComment !== currentState.ownComment

      if (isStateModified) {
        lastStateRef.current = currentState
        onReviewStateChange({
          ...currentState,
          submitReview: handleSubmit,
        })
      }
    }
  }, [
    commentText,
    rating,
    isSpoiler,
    isEditing,
    isSubmitting,
    ownComment,
    onReviewStateChange,
    handleSubmit,
  ])

  return (
    <section className="relative mx-auto mt-12 flex w-full flex-col gap-6 pt-12 md:mt-16 md:pt-20 lg:pt-24">
      <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-black" />
      <div className="pointer-events-none absolute bottom-full left-1/2 -z-10 h-150 w-screen -translate-x-1/2 bg-linear-to-t from-black to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <Icon
            icon="solar:face-scan-circle-bold"
            className="text-white/70"
            size={24}
          />
          <h2 className="text-base font-semibold tracking-[0.24em] text-white/70 uppercase">
            Community Reviews
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase ring ring-white/10">
            <span className="font-bold">{comments.length}</span> review
            {comments.length === 1 ? '' : 's'}
          </div>
          {ratingStats.average ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase ring ring-white/10">
              <Icon
                icon="solar:star-bold"
                className="text-yellow-400"
                size={14}
              />
              <span>
                {ratingStats.average}/10 avg
                {ratingStats.count ? ` • ${ratingStats.count} rated` : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <AuthGate
        fallback={
          <div className="flex w-full items-center gap-4">
            <div className="center center relative size-12 shrink-0 overflow-hidden rounded-[20px] bg-white/5 ring ring-white/10 sm:size-12">
              <Icon
                className="text-white/50"
                icon="solar:user-bold"
                size={24}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="-space-y-0.5">
                <h3 className="text-sm font-semibold text-white sm:text-base">
                  Join the conversation
                </h3>
                <p className="text-xs leading-relaxed text-white/50 sm:text-sm">
                  Sign in to leave a review and score for {title}.
                </p>
              </div>

              <Button
                className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white px-5 text-xs font-semibold text-black transition hover:bg-white/5 hover:text-white"
                onClick={handleSignInRequest}
              >
                <Icon icon="solar:user-circle-bold" size={14} />
                Sign in
              </Button>
            </div>
          </div>
        }
      >
        {(!ownComment || isEditing) && (
          <form id="review-form" onSubmit={handleSubmit}>
            <div className="grid items-stretch gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex h-full flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-semibold tracking-[0.22em] text-white/70 uppercase">
                      {ownComment ? 'Update Your Review' : 'Write a Review'}
                    </h3>
                    {ownComment && isEditing && (
                      <button
                        className="cursor-pointer text-[11px] font-semibold tracking-[0.2em] text-red-400 uppercase transition hover:text-red-200"
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          setCommentText(ownComment.content || '')
                          setRating(ownComment.rating ?? null)
                          setIsSpoiler(!!ownComment.isSpoiler)
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">
                      <span className="size-1 rounded-full bg-white/30" />
                      <span>Public</span>
                      <span className="size-1 rounded-full bg-white/30" />
                      <span>One per {mediaTypeLabel}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase">
                    {normalizedCommentLength}/{COMMENT_MIN_LENGTH}+ chars
                  </div>
                </div>
                <div>
                  <Textarea
                    className="min-h-[190px] w-full resize-none rounded-[20px] border border-white/5 bg-white/5 px-5 py-4 leading-normal transition outline-none placeholder:text-white/50 hover:bg-white/10 focus:border-white/10 focus:bg-white/10 focus:ring-4 focus:ring-white/5"
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder={`What did you think about ${title}?`}
                    minLength={COMMENT_MIN_LENGTH}
                    value={commentText}
                    maxLength={800}
                  />
                </div>
              </div>

              <aside className="flex flex-col justify-between space-y-6">
                <RatingSelector value={rating} onChange={setRating} />
                <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-white/5 bg-white/5 p-4 transition hover:bg-white/10">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isSpoiler}
                      onChange={(e) => setIsSpoiler(e.target.checked)}
                      className="peer size-5 cursor-pointer appearance-none rounded-[8px] border border-white/10 bg-white/5 transition-all checked:border-white checked:bg-white hover:border-white/15"
                    />
                    <Icon
                      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 transition-opacity peer-checked:opacity-100"
                      icon="material-symbols:check-rounded"
                      size={15}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      Contains Spoilers
                    </span>
                    <span className="text-[11px] text-white/50">
                      Hide parts of your review
                    </span>
                  </div>
                </label>
              </aside>
            </div>
          </form>
        )}
      </AuthGate>

      <div className="border-t border-white/10">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-white/50">
            Loading reviews...
          </div>
        ) : loadError ? (
          <div className="py-10 text-center text-sm leading-relaxed text-white/50">
            {loadError}
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="py-10 text-center text-sm leading-relaxed text-white/50">
            No reviews yet. Be the first person to leave one.
          </div>
        ) : (
          <div className="flex flex-col">
            {sortedComments.map((comment) => {
              const isOwnComment = comment.user?.id === auth.user?.id
              const mergedComment =
                isOwnComment && userProfile
                  ? {
                      ...comment,
                      user: {
                        ...comment.user,
                        displayName:
                          userProfile.displayName ||
                          comment.user?.displayName ||
                          comment.user?.name,
                        username:
                          userProfile.username || comment.user?.username,
                        avatarUrl:
                          userProfile.avatarUrl || comment.user?.avatarUrl,
                      },
                    }
                  : comment

              return (
                <CommentCard
                  comment={mergedComment}
                  currentUserId={auth.user?.id}
                  isOwnComment={isOwnComment}
                  onEdit={() => {
                    setCommentText(comment.content || '')
                    setRating(comment.rating ?? null)
                    setIsSpoiler(!!comment.isSpoiler)
                    setIsEditing(true)
                    setTimeout(() => {
                      document.getElementById('review-form')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      })
                    }, 50)
                  }}
                  onDelete={handleDelete}
                  onLike={() => handleLike(comment.id)}
                  key={comment.id}
                />
              )
            })}
          </div>
        )}
      </div>
      <div className="shrink-0" style={{ height: navHeight }} />
    </section>
  )
}
