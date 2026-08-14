'use client';

import { motion, useReducedMotion } from 'framer-motion';

const EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  ACCENT: [0.32, 0.72, 0, 1],
});

/**
 * Legal documents are long-form reading surfaces. Their shell and page rules
 * stay fixed; only authored reading units are revealed as they enter view.
 */
export const LEGAL_MOTION = Object.freeze({
  easings: EASINGS,
  stages: Object.freeze({
    title: Object.freeze({ delay: 0.08, duration: 0.7, y: 10 }),
    lead: Object.freeze({ delay: 0.22, duration: 0.64, y: 10 }),
    meta: Object.freeze({ delay: 0.4, duration: 0.5, y: 6 }),
    quickLink: Object.freeze({ delay: 0.54, duration: 0.48, y: 8, stagger: 0.06 }),
    section: Object.freeze({ delay: 0.04, duration: 0.62, y: 12, stagger: 0.06 }),
  }),
});

function getStage(stage) {
  return LEGAL_MOTION.stages[stage] || LEGAL_MOTION.stages.section;
}

export function LegalReveal({ children, className, itemIndex = 0, stage }) {
  const config = getStage(stage);
  const reduceMotion = useReducedMotion();
  const delay = config.delay + Math.min(Math.max(0, itemIndex) * (config.stagger || 0), 0.72);

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: config.y || 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: config.duration, ease: EASINGS.CINEMATIC }}
    >
      {children}
    </motion.div>
  );
}
