'use client';

import { motion } from 'framer-motion';

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
    title: Object.freeze({ delay: 0.18, duration: 1.02, y: 16 }),
    lead: Object.freeze({ delay: 0.62, duration: 0.94, y: 14 }),
    meta: Object.freeze({ delay: 1.02, duration: 0.72, y: 8 }),
    quickLink: Object.freeze({ delay: 1.28, duration: 0.64, y: 10, stagger: 0.09 }),
    section: Object.freeze({ delay: 0.08, duration: 0.86, y: 18, stagger: 0.09 }),
  }),
});

function getStage(stage) {
  return LEGAL_MOTION.stages[stage] || LEGAL_MOTION.stages.section;
}

export function LegalReveal({ children, className, inView = false, itemIndex = 0, stage }) {
  const config = getStage(stage);
  const delay = config.delay + Math.min(Math.max(0, itemIndex) * (config.stagger || 0), 0.72);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: config.y || 0 }}
      {...(inView
        ? {
            viewport: { amount: 0.16, once: true },
            whileInView: { opacity: 1, y: 0 },
          }
        : { animate: { opacity: 1, y: 0 } })}
      transition={{ delay, duration: config.duration, ease: EASINGS.CINEMATIC }}
    >
      {children}
    </motion.div>
  );
}
