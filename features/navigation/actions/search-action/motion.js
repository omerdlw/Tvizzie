export const SEARCH_ACTION_REVEAL_TRANSITION = Object.freeze({
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
  type: 'tween',
});

export const SEARCH_ACTION_EXIT_TRANSITION = Object.freeze({
  duration: 0.18,
  ease: [0.4, 0, 1, 1],
  type: 'tween',
});

export const SEARCH_ACTION_STAGGER = Object.freeze({
  delayStep: 0.06,
  maxDelay: 0.24,
});

export function getSearchResultDelay(index) {
  return Math.min(index * SEARCH_ACTION_STAGGER.delayStep, SEARCH_ACTION_STAGGER.maxDelay);
}
