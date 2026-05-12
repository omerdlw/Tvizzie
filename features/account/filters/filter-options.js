import { REVIEW_SORT_MODE } from '@/features/reviews/review-data';

export const REVIEW_SORT_OPTIONS = Object.freeze([
  { label: 'When Reviewed (Newest)', value: REVIEW_SORT_MODE.NEWEST },
  { label: 'When Reviewed (Oldest)', value: REVIEW_SORT_MODE.OLDEST },
  { label: 'Rating (Highest)', value: REVIEW_SORT_MODE.RATING_DESC },
  { label: 'Rating (Lowest)', value: REVIEW_SORT_MODE.RATING_ASC },
  { label: 'Likes (Most)', value: REVIEW_SORT_MODE.LIKES_DESC },
  { label: 'Likes (Least)', value: REVIEW_SORT_MODE.LIKES_ASC },
]);

export const RATING_MODE_OPTIONS = Object.freeze([
  { label: 'Any rating', value: 'any' },
  { label: 'No rating', value: 'none' },
]);

export const REVIEW_VISIBILITY_OPTIONS = Object.freeze([
  { key: 'hide_ratings_only', label: 'Hide rating-only entries' },
  { key: 'hide_text_reviews', label: 'Hide written reviews' },
]);

export const ACTIVITY_SORT_OPTIONS = Object.freeze([
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
]);
