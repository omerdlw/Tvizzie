'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { REVIEW_SORT_MODE } from '@/features/reviews/utils';

export const REVIEW_ITEMS_PER_PAGE = 36;

export const LIST_COMMENT_SORT_OPTIONS = Object.freeze([
  { value: REVIEW_SORT_MODE.NEWEST, label: 'Newest to oldest' },
  { value: REVIEW_SORT_MODE.OLDEST, label: 'Oldest to newest' },
  { value: REVIEW_SORT_MODE.LIKES_DESC, label: 'Most liked to least liked' },
  { value: REVIEW_SORT_MODE.LIKES_ASC, label: 'Least liked to most liked' },
]);

const LIST_COMMENT_SORT_SET = new Set(LIST_COMMENT_SORT_OPTIONS.map((option) => option.value));

export const LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS = Object.freeze([
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

export function useListDetailFilters({
  collectionRootPath,
  likes = [],
  listItems = [],
  reviews = [],
  searchParamsKey = '',
  watchedItems = [],
  watchlistItems = [],
}) {
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

  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setReviewFilters(initialReviewFilters);
  }, [initialMediaFilters, initialReviewFilters]);

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

  return {
    decadeOptions,
    filteredListItems,
    filteredReviews,
    genreOptions,
    hasMediaFilters,
    hasReviewFilters,
    mediaFilters,
    resetMediaFilters,
    resetReviewFilters,
    reviewFilters,
    reviewYearOptions,
    updateMediaFilters,
    updateReviewFilters,
  };
}
