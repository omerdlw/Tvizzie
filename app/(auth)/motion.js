'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

/**
 * Auth is intentionally composed in calm, discrete beats. Inputs are revealed
 * as form controls, never individually translated while the user types.
 */
export const AUTH_MOTION = Object.freeze({
  easings: EASINGS,
  stages: Object.freeze({
    brand: Object.freeze({ at: 0.06, duration: 0.68, y: 10, scale: 0.98 }),
    heading: Object.freeze({ at: 0.16, duration: 0.62, y: 8 }),
    field: Object.freeze({ at: 0.3, duration: 0.52, y: 8, stagger: 0.08 }),
    requirement: Object.freeze({ at: 0.44, duration: 0.42, y: 6, stagger: 0.05 }),
    submit: Object.freeze({ at: 0.56, duration: 0.5, y: 8 }),
    divider: Object.freeze({ at: 0.7, duration: 0.44 }),
    oauth: Object.freeze({ at: 0.8, duration: 0.5, y: 8, stagger: 0.07 }),
    footer: Object.freeze({ at: 0.96, duration: 0.46, y: 6 }),
  }),
});

function getStage(stage) {
  return AUTH_MOTION.stages[stage] || AUTH_MOTION.stages.field;
}

export function AuthScene({ children, sceneKey }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={sceneKey}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, transition: { duration: 0.34, ease: EASINGS.CINEMATIC } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.18, ease: EASINGS.EXIT } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AuthReveal({ children, className, itemIndex = 0, stage }) {
  const config = getStage(stage);
  const reduceMotion = useReducedMotion();
  const hidden = { opacity: 0 };
  const visible = { opacity: 1 };

  if (config.y) {
    hidden.y = config.y;
    visible.y = 0;
  }
  if (config.scale) {
    hidden.scale = config.scale;
    visible.scale = 1;
  }

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : hidden}
      animate={visible}
      transition={{
        delay: config.at + Math.min(Math.max(0, itemIndex) * (config.stagger || 0), 0.48),
        duration: config.duration,
        ease: EASINGS.CINEMATIC,
      }}
    >
      {children}
    </motion.div>
  );
}
