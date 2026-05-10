import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

export const MOVIE_REVIEWS_ROUTE_MOTION = Object.freeze({
  frameBaseDelay: 0.18,
  sections: Object.freeze({
    baseDelay: 0.14,
    step: 0.1,
  }),
  transitions: Object.freeze({
    section: freezeMotion({
      type: 'tween',
      duration: 0.9,
      ease: MOTION_EASE.emphasis,
    }),
  }),
  viewport: Object.freeze({
    once: true,
    amount: 0.2,
    margin: '0px 0px -8% 0px',
  }),
});

export const MOVIE_REVIEWS_ROUTE_SECTION_MOTION = freezeMotion({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: MOVIE_REVIEWS_ROUTE_MOTION.viewport,
  transition: MOVIE_REVIEWS_ROUTE_MOTION.transitions.section,
});

export function getMovieReviewsRouteSectionMotion(index = 0) {
  return freezeMotion({
    ...MOVIE_REVIEWS_ROUTE_SECTION_MOTION,
    transition: withDelay(
      MOVIE_REVIEWS_ROUTE_MOTION.transitions.section,
      MOVIE_REVIEWS_ROUTE_MOTION.sections.baseDelay +
        getStaggerDelay(index, {
          interval: MOVIE_REVIEWS_ROUTE_MOTION.sections.step,
        })
    ),
  });
}
