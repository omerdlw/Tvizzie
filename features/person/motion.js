import { freezeMotion, getStaggerDelay, withDelay } from '@/core/animation';
import {
  MOVIE_FEATURE_ACTION_MOTION,
  MOVIE_FEATURE_SECTION_MOTION,
  MOVIE_FEATURE_VIEWPORT,
  getMovieFeatureItemMotion,
} from '@/features/movie/motion';

const PERSON_FEATURE_SCROLL_REVEAL_STAGGER = Object.freeze({
  interval: 0.12,
});

export const PERSON_FEATURE_SECTION_MOTION = MOVIE_FEATURE_SECTION_MOTION;
export const PERSON_FEATURE_ACTION_MOTION = MOVIE_FEATURE_ACTION_MOTION;

export function getPersonFeatureItemMotion(index = 0) {
  return getMovieFeatureItemMotion(index);
}

export function getPersonFeatureScrollRevealMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: 18, scale: 0.99 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: MOVIE_FEATURE_VIEWPORT,
    transition: withDelay(
      {
        type: 'tween',
        duration: 0.86,
      },
      0.08 + getStaggerDelay(index, PERSON_FEATURE_SCROLL_REVEAL_STAGGER)
    ),
  });
}
