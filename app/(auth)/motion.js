'use client';

import { AnimatePresence, motion } from 'framer-motion';

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
    brand: Object.freeze({ at: 0.14, duration: 0.9, y: 14, scale: 0.96 }),
    heading: Object.freeze({ at: 0.42, duration: 0.88, y: 12 }),
    field: Object.freeze({ at: 0.82, duration: 0.72, y: 12, stagger: 0.12 }),
    requirement: Object.freeze({ at: 1.06, duration: 0.56, y: 8, stagger: 0.07 }),
    submit: Object.freeze({ at: 1.22, duration: 0.68, y: 10 }),
    divider: Object.freeze({ at: 1.5, duration: 0.62 }),
    oauth: Object.freeze({ at: 1.72, duration: 0.72, y: 10, stagger: 0.1 }),
    footer: Object.freeze({ at: 2.06, duration: 0.66, y: 8 }),
  }),
});

function getStage(stage) {
  return AUTH_MOTION.stages[stage] || AUTH_MOTION.stages.field;
}

export function AuthScene({ children, sceneKey }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={sceneKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.34, ease: EASINGS.CINEMATIC } }}
        exit={{ opacity: 0, transition: { duration: 0.22, ease: EASINGS.EXIT } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AuthReveal({ children, className, itemIndex = 0, stage }) {
  const config = getStage(stage);
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
      initial={hidden}
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
