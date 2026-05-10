import { parseMediaFilters } from '@/features/account/filters';

export const LIKES_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export const LIKES_ALLOWED_EYE_FLAGS = LIKES_VISIBILITY_OPTIONS.map((option) => option.key);

export function parseLikesMediaFilters(search) {
  return parseMediaFilters(search, {
    allowedEyeFlags: LIKES_ALLOWED_EYE_FLAGS,
  });
}
