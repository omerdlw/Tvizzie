'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { AccountPageShell, AccountSectionReveal } from '@/features/account/shared/layout';
import {
  MEDIA_FILTER_QUERY_KEYS,
  REVIEW_FILTER_QUERY_KEYS,
  applyMediaFilters,
  applyReviewFilters,
  buildManagedQueryString,
  buildMediaKeySet,
  collectMediaGenreOptions,
  collectReviewYears,
  getDecadeOptions,
  hasActiveMediaFilters,
  hasActiveReviewFilters,
  parseMediaFilters,
  parseReviewFilters,
  toMediaQueryValues,
  toReviewQueryValues,
} from '@/features/account/filtering';
import { AccountMediaFilterBar, AccountReviewFilterBar } from '@/features/account/shared/content-filters';
import { ProfileMediaActions } from '@/features/account/shared/media-grid';
import AccountPagination from '@/features/account/shared/pagination';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import AccountInlineSectionState from '@/features/account/shared/section-state';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback';
import ReviewHeader from '@/features/reviews/parts/review-header';
import ReviewList from '@/features/reviews/parts/review-list';
import { REVIEW_SORT_MODE } from '@/features/reviews/utils';
import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { AuthGate } from '@/core/modules/auth';
import { Button } from '@/ui/elements';

const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6 px-4 sm:px-8`;
const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const MAX_ROWS_PER_PAGE = 8;
const MOBILE_ITEMS_PER_PAGE = 3 * MAX_ROWS_PER_PAGE;
const DESKTOP_ITEMS_PER_PAGE = 6 * MAX_ROWS_PER_PAGE;
const REVIEW_ITEMS_PER_PAGE = 36;
const LIST_COMMENT_SORT_OPTIONS = Object.freeze([
  { value: REVIEW_SORT_MODE.NEWEST, label: 'Newest to oldest' },
  { value: REVIEW_SORT_MODE.OLDEST, label: 'Oldest to newest' },
  { value: REVIEW_SORT_MODE.LIKES_DESC, label: 'Most liked to least liked' },
  { value: REVIEW_SORT_MODE.LIKES_ASC, label: 'Least liked to most liked' },
]);
const LIST_COMMENT_SORT_SET = new Set(LIST_COMMENT_SORT_OPTIONS.map((option) => option.value));
const LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_watched', label: 'Hide watched films' }),
  Object.freeze({ key: 'hide_liked', label: 'Hide liked films' }),
  Object.freeze({ key: 'hide_watchlist', label: 'Hide films in watchlist' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);
const LIST_DETAIL_ALLOWED_EYE_FLAGS = LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS.map((option) => option.key);

function parseListDetailMediaFilters(search) {
  return parseMediaFilters(search, {
    allowedEyeFlags: LIST_DETAIL_ALLOWED_EYE_FLAGS,
  });
}

function sanitizeListCommentFilters(filters = {}) {
  return {
    ...filters,
    eyeFlags: new Set(),
    maxRating: 5,
    minRating: 0.5,
    ratingMode: 'any',
    sort: LIST_COMMENT_SORT_SET.has(filters?.sort) ? filters.sort : REVIEW_SORT_MODE.NEWEST,
  };
}

function useResponsivePageSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;
}

function getPosterUrl(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

function ListDetailMediaGrid({
  emptyMessage = 'No titles in this list yet.',
  isOwner = false,
  items = [],
  onRemoveItem = null,
  toolbar = null,
}) {
  const itemsPerPage = useResponsivePageSize();
  const reduceMotion = useReducedMotion();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = items.length ? Math.ceil(items.length / itemsPerPage) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * itemsPerPage;
  const visibleItems = useMemo(
    () => items.slice(pageStart, pageStart + itemsPerPage),
    [items, pageStart, itemsPerPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {toolbar}
        <AccountInlineSectionState className="px-4 py-5">{emptyMessage}</AccountInlineSectionState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {toolbar}

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {visibleItems.map((item, index) => {
          const mediaType = item?.entityType || item?.media_type;
          const mediaId = item?.entityId || item?.id;
          const title = item?.title || item?.name || 'Untitled';

          return (
            <motion.div
              key={`${item.mediaKey || `${mediaType}-${mediaId}`}-${pageStart + index}`}
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.986 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
              transition={{
                delay: reduceMotion ? 0 : index < 6 ? index * 0.018 : 0,
                duration: reduceMotion ? 0.16 : 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <MediaCard
                href={`/${mediaType}/${mediaId}`}
                className="w-full"
                imageSrc={getPosterUrl(item)}
                imageAlt={title}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                topOverlay={
                  isOwner && typeof onRemoveItem === 'function' ? (
                    <ProfileMediaActions
                      media={item}
                      onRemoveItem={onRemoveItem}
                      removeLabel={`Remove ${title} from this list`}
                    />
                  ) : null
                }
                tooltipText={title}
              />
            </motion.div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <AccountPagination
          className="w-full"
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : null}
    </div>
  );
}

export default function AccountListDetailFeed({ model = null, RegistryComponent = null }) {
  const {
    auth,
    canShowList,
    followerCount,
    followingCount,
    followState,
    handleDeleteList,
    handleDeleteRequest,
    handleEditReview,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleOpenReviewComposer,
    handleRemoveListItem,
    handleSignInRequest,
    handleToggleLike,
    isBioSurfaceOpen,
    isFollowLoading,
    isLiked,
    isLikeLoading,
    isOwner,
    isPageLoading,
    isResolvingProfile,
    itemRemoveConfirmation,
    likeCount,
    list,
    listDeleteConfirmation,
    listCount,
    listItems = [],
    likes = [],
    ownReview,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    reviews = [],
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    username,
    userProfile,
    watchedItems = [],
    watchlistCount = 0,
    watchlistItems = [],
  } = model || {};

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const collectionRootPath = useMemo(() => String(pathname || ''), [pathname]);
  const initialMediaFilters = useMemo(
    () => parseListDetailMediaFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const initialReviewFilters = useMemo(
    () => sanitizeListCommentFilters(parseReviewFilters(new URLSearchParams(searchParamsKey))),
    [searchParamsKey]
  );
  const [mediaFilters, setMediaFilters] = useState(initialMediaFilters);
  const [reviewFilters, setReviewFilters] = useState(initialReviewFilters);
  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const genreOptions = useMemo(() => collectMediaGenreOptions(listItems), [listItems]);
  const reviewYearOptions = useMemo(() => collectReviewYears(reviews), [reviews]);
  const watchedKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const likedKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const watchlistKeys = useMemo(() => buildMediaKeySet(watchlistItems), [watchlistItems]);
  const filteredListItems = useMemo(
    () =>
      applyMediaFilters(listItems, mediaFilters, {
        likedKeys,
        watchedKeys,
        watchlistKeys,
      }),
    [likedKeys, listItems, mediaFilters, watchedKeys, watchlistKeys]
  );
  const filteredReviews = useMemo(() => applyReviewFilters(reviews, reviewFilters), [reviewFilters, reviews]);
  const hasMediaFilters = hasActiveMediaFilters(mediaFilters);
  const hasReviewFilters = hasActiveReviewFilters(reviewFilters);
  const hasListItems = listItems.length > 0;
  const hasListReviews = reviews.length > 0;

  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setReviewFilters(initialReviewFilters);
  }, [initialMediaFilters, initialReviewFilters]);

  const updateUrl = useCallback(
    ({ nextMediaFilters = mediaFilters, nextReviewFilters = reviewFilters } = {}) => {
      if (typeof window === 'undefined') {
        return;
      }

      let params = new URLSearchParams(window.location.search);
      const mediaQueryString = buildManagedQueryString(params, {
        managedKeys: MEDIA_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toMediaQueryValues(nextMediaFilters),
      });
      params = new URLSearchParams(mediaQueryString);

      const reviewQueryString = buildManagedQueryString(params, {
        managedKeys: REVIEW_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toReviewQueryValues(nextReviewFilters),
      });

      window.history.replaceState(
        {},
        '',
        reviewQueryString ? `${collectionRootPath}?${reviewQueryString}` : collectionRootPath
      );
    },
    [collectionRootPath, mediaFilters, reviewFilters]
  );

  const updateMediaFilters = useCallback(
    (updates = {}) => {
      const nextFilters = {
        ...mediaFilters,
        ...updates,
      };
      setMediaFilters(nextFilters);
      updateUrl({
        nextMediaFilters: nextFilters,
        nextReviewFilters: reviewFilters,
      });
    },
    [mediaFilters, reviewFilters, updateUrl]
  );

  const resetMediaFilters = useCallback(() => {
    const defaultFilters = parseListDetailMediaFilters(new URLSearchParams());

    setMediaFilters(defaultFilters);
    updateUrl({
      nextMediaFilters: defaultFilters,
      nextReviewFilters: reviewFilters,
    });
  }, [reviewFilters, updateUrl]);

  const updateReviewFilters = useCallback(
    (updates = {}) => {
      const nextFilters = sanitizeListCommentFilters({
        ...reviewFilters,
        ...updates,
      });
      setReviewFilters(nextFilters);
      updateUrl({
        nextMediaFilters: mediaFilters,
        nextReviewFilters: nextFilters,
      });
    },
    [mediaFilters, reviewFilters, updateUrl]
  );

  const resetReviewFilters = useCallback(() => {
    const defaultFilters = sanitizeListCommentFilters(parseReviewFilters(new URLSearchParams()));

    setReviewFilters(defaultFilters);
    updateUrl({
      nextMediaFilters: mediaFilters,
      nextReviewFilters: defaultFilters,
    });
  }, [mediaFilters, updateUrl]);

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
      auth={auth}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleToggleLike={handleToggleLike}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      list={list}
      listItemsCount={listItems.length}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const totalReviewPages = filteredReviews.length ? Math.ceil(filteredReviews.length / REVIEW_ITEMS_PER_PAGE) : 1;
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);
  const reviewPageStart = (safeCurrentReviewPage - 1) * REVIEW_ITEMS_PER_PAGE;
  const visibleReviews = useMemo(
    () => filteredReviews.slice(reviewPageStart, reviewPageStart + REVIEW_ITEMS_PER_PAGE),
    [filteredReviews, reviewPageStart]
  );

  useEffect(() => {
    setCurrentReviewPage(1);
  }, [list?.id, reviewFilters]);

  useEffect(() => {
    if (currentReviewPage > totalReviewPages) {
      setCurrentReviewPage(totalReviewPages);
    }
  }, [currentReviewPage, totalReviewPages]);

  return (
    <AccountPageShell
      activeSection="lists"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      onReadMore={() => setIsBioSurfaceOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowList && list ? (
        <>
          <AccountSectionReveal>
            <header className="relative">
              <div className={`${LIST_SECTION_SHELL_CLASS} pt-10 pb-8`}>
                <div className="flex w-full flex-col gap-3">
                  <h1 className="w-full text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
                  <p className="w-full text-sm leading-6 text-black/70">
                    {String(list?.description || '').trim() || 'No description provided.'}
                  </p>
                </div>
              </div>
            </header>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.06}>
            <div className={`${LIST_SECTION_SHELL_CLASS} pb-12`}>
              <ListDetailMediaGrid
                emptyMessage={
                  hasMediaFilters && listItems.length > 0 ? 'No titles match the current filters.' : undefined
                }
                isOwner={isOwner}
                items={filteredListItems}
                onRemoveItem={handleRemoveListItem}
                toolbar={
                  hasListItems ? (
                    <>
                      <AccountMediaFilterBar
                        filters={mediaFilters}
                        decadeOptions={decadeOptions}
                        genreOptions={genreOptions}
                        visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                        onChange={updateMediaFilters}
                        onReset={hasMediaFilters ? resetMediaFilters : null}
                      />

                      {hasMediaFilters ? (
                        <p className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                          {filteredListItems.length} of {listItems.length} titles shown
                        </p>
                      ) : null}
                    </>
                  ) : null
                }
              />
            </div>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.1}>
            <div className={`${LIST_SECTION_SHELL_CLASS} pt-4 pb-20`}>
              <ReviewHeader
                itemLabel="comment"
                showRatingSummary={false}
                title="Comments"
                totalReviews={reviews.length}
              />

              {hasListReviews ? (
                <AccountReviewFilterBar
                  className="mb-2"
                  filters={reviewFilters}
                  showRatingFilter={false}
                  sortOptions={LIST_COMMENT_SORT_OPTIONS}
                  visibilityOptions={[]}
                  yearOptions={reviewYearOptions}
                  onChange={updateReviewFilters}
                  onReset={hasReviewFilters ? resetReviewFilters : null}
                />
              ) : null}

              {hasListReviews && hasReviewFilters ? (
                <p className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                  {filteredReviews.length} of {reviews.length} comments shown
                </p>
              ) : null}

              {!isOwner && (
                <AuthGate
                  fallback={<ReviewAuthFallback mode="comment" onSignIn={handleSignInRequest} title={list.title} />}
                >
                  <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ownReview ? 'Update your comment' : 'Write a comment'}</p>
                      <p className="text-xs text-black/70">
                        {ownReview
                          ? 'Open the comment composer to edit your text.'
                          : 'Share your thoughts from the comment composer.'}
                      </p>
                    </div>
                    <Button
                      className="bg-primary/30 inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white sm:w-auto sm:justify-between"
                      type="button"
                      onClick={handleOpenReviewComposer}
                    >
                      {ownReview ? 'Edit Comment' : 'Add Comment'}
                    </Button>
                  </div>
                </AuthGate>
              )}
              {visibleReviews.length === 0 ? (
                <AccountInlineSectionState className="px-4 py-5">
                  {hasReviewFilters && reviews.length > 0
                    ? 'No comments match the current filters.'
                    : 'No comments yet'}
                </AccountInlineSectionState>
              ) : (
                <ReviewList
                  currentUserId={auth.user?.id || null}
                  isLoading={false}
                  loadError={null}
                  onDeleteRequest={handleDeleteRequest}
                  onEdit={handleEditReview}
                  onLike={handleLikeReview}
                  sortedReviews={visibleReviews}
                  userProfile={userProfile}
                />
              )}

              {totalReviewPages > 1 ? (
                <div className="mt-4">
                  <AccountPagination
                    className="w-full"
                    currentPage={safeCurrentReviewPage}
                    totalPages={totalReviewPages}
                    onPageChange={setCurrentReviewPage}
                    prevAriaLabel="Go to previous review page"
                    nextAriaLabel="Go to next review page"
                  />
                </div>
              ) : null}
            </div>
          </AccountSectionReveal>
        </>
      ) : canShowList ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
