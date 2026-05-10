import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

export const MOVIE_ROUTE_MOTION = Object.freeze({
  gridFrameBaseDelay: 0.24,
  sections: Object.freeze({
    baseDelay: 0.18,
    step: 0.12,
  }),
  transitions: Object.freeze({
    section: freezeMotion({
      type: 'tween',
      duration: 0.96,
      ease: MOTION_EASE.emphasis,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.2,
      ease: MOTION_EASE.exit,
    }),
  }),
  viewport: Object.freeze({
    once: true,
    amount: 0.2,
    margin: '0px 0px -8% 0px',
  }),
});

export const MOVIE_ROUTE_SECTION_MOTION = freezeMotion({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: MOVIE_ROUTE_MOTION.viewport,
  exit: {
    opacity: 0,
    y: -10,
    transition: MOVIE_ROUTE_MOTION.transitions.exit,
  },
  transition: MOVIE_ROUTE_MOTION.transitions.section,
});

export function getMovieRouteSectionMotion(index = 0) {
  return freezeMotion({
    ...MOVIE_ROUTE_SECTION_MOTION,
    transition: withDelay(
      MOVIE_ROUTE_MOTION.transitions.section,
      MOVIE_ROUTE_MOTION.sections.baseDelay +
        getStaggerDelay(index, {
          interval: MOVIE_ROUTE_MOTION.sections.step,
        })
    ),
  });
}
