'use client';

import { createContext, useContext, useRef } from 'react';
import { motion } from 'framer-motion';

const EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const STAGES = Object.freeze({
  'discover.controls': Object.freeze({ at: 0.12, duration: 0.72, y: 12 }),
  'discover.grid': Object.freeze({ at: 0.28, duration: 0.96, y: 20 }),
  'discover.item': Object.freeze({ at: 0.42, duration: 0.72, y: 14, scale: 0.975, stagger: 0.055 }),
  'section.heading': Object.freeze({ at: 0.88, duration: 0.68, y: 12 }),
  'section.rail': Object.freeze({ at: 1.02, duration: 0.86, y: 18 }),
  'section.item': Object.freeze({ at: 1.16, duration: 0.7, y: 14, scale: 0.975, stagger: 0.05 }),
  control: Object.freeze({ at: 0.92, duration: 0.6, y: 8 }),
});

export const HOME_ROUTE_MOTION = Object.freeze({ easings: EASINGS, stages: STAGES });

const HomeMotionContext = createContext(null);

function getNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function getStage(stage) {
  return STAGES[stage] || STAGES['section.rail'];
}

function getDelay({ config, itemIndex, startedAt }) {
  const elapsed = startedAt ? Math.max(0, (getNow() - startedAt) / 1000) : 0;
  const intendedDelay = Math.max(0, config.at - elapsed);
  const staggerDelay = Math.min(Math.max(0, itemIndex) * (config.stagger || 0), 0.72);

  return intendedDelay + staggerDelay;
}

export function HomeMotionProvider({ children, routeKey = 'home' }) {
  const routeRef = useRef(routeKey);
  const startedAtRef = useRef(0);

  if (routeRef.current !== routeKey) {
    routeRef.current = routeKey;
    startedAtRef.current = getNow();
  }
  if (!startedAtRef.current) startedAtRef.current = getNow();

  return <HomeMotionContext.Provider value={startedAtRef}>{children}</HomeMotionContext.Provider>;
}

export function HomeReveal({ children, className, itemIndex = 0, stage, style }) {
  const startedAtRef = useContext(HomeMotionContext);
  const config = getStage(stage);
  const delay = getDelay({ config, itemIndex, startedAt: startedAtRef?.current });
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
      style={style}
      initial="hidden"
      animate="visible"
      variants={{
        hidden,
        visible: {
          ...visible,
          transition: { delay, duration: config.duration, ease: EASINGS.CINEMATIC },
        },
        exit: { opacity: 0, transition: { duration: 0.28, ease: EASINGS.EXIT } },
      }}
    >
      {children}
    </motion.div>
  );
}
