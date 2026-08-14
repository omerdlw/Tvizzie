'use client';

import { createContext, useContext, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

/**
 * Account data arrives in independently cached/server-rendered groups. The
 * authored map records hierarchy, then `getStage` compresses it into a short
 * arrival window; `lateDelay` keeps later streamed content from popping in.
 */
const STAGES = Object.freeze({
  nav: Object.freeze({ at: 0.14, duration: 0.66, y: 8, stagger: 0.05 }),
  'hero.avatar': Object.freeze({ at: 0.28, duration: 1.08, y: 16, scale: 0.95 }),
  'hero.title': Object.freeze({ at: 0.5, duration: 1.02, y: 12 }),
  'hero.metric': Object.freeze({ at: 0.98, duration: 0.68, y: 8, stagger: 0.075 }),
  'hero.bio': Object.freeze({ at: 1.38, duration: 0.92, y: 14 }),
  'section.heading': Object.freeze({
    at: 1.88,
    duration: 0.76,
    y: 12,
    stagger: 0.1,
    lateDelay: 0.12,
  }),
  'section.content': Object.freeze({
    at: 2.14,
    duration: 0.9,
    y: 16,
    stagger: 0.13,
    lateDelay: 0.16,
  }),
  'item.media': Object.freeze({
    at: 2.42,
    duration: 0.76,
    y: 14,
    scale: 0.975,
    stagger: 0.075,
    lateDelay: 0.12,
  }),
  'item.list': Object.freeze({
    at: 2.42,
    duration: 0.8,
    y: 14,
    scale: 0.98,
    stagger: 0.09,
    lateDelay: 0.12,
  }),
  'item.feed': Object.freeze({ at: 2.42, duration: 0.76, y: 12, stagger: 0.075, lateDelay: 0.1 }),
  control: Object.freeze({ at: 2.16, duration: 0.62, y: 8, stagger: 0.06, lateDelay: 0.1 }),
});

export const ACCOUNT_ROUTE_MOTION = Object.freeze({ easings: EASINGS, stages: STAGES });

export const ACCOUNT_INTERACTIONS = Object.freeze({
  card: Object.freeze({
    whileHover: Object.freeze({
      scale: 1.018,
      transition: { duration: 0.3, ease: EASINGS.ACCENT },
    }),
    whileTap: Object.freeze({ scale: 0.985, transition: { duration: 0.16, ease: EASINGS.ACCENT } }),
  }),
  control: Object.freeze({
    whileHover: Object.freeze({
      scale: 1.02,
      transition: { duration: 0.26, ease: EASINGS.ACCENT },
    }),
    whileTap: Object.freeze({ scale: 0.97, transition: { duration: 0.16, ease: EASINGS.ACCENT } }),
  }),
});

const AccountMotionContext = createContext(null);

function getNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function getStage(stage) {
  const config = STAGES[stage] || STAGES['section.content'];

  return {
    ...config,
    at: Math.min(config.at * 0.36, 0.9),
    duration: Math.min(config.duration, 0.74),
  };
}

function getDelay({ config, deferred, itemIndex, startedAt }) {
  const elapsed = startedAt ? Math.max(0, (getNow() - startedAt) / 1000) : 0;
  const intendedDelay = Math.max(0, config.at - elapsed);
  const arrivalDelay = deferred ? Math.max(config.lateDelay || 0, intendedDelay) : intendedDelay;
  const staggerDelay = Math.min(
    Math.max(0, itemIndex) * (config.stagger || 0),
    config.maxStaggerDelay || 0.72,
  );
  return arrivalDelay + staggerDelay;
}

export function AccountMotionProvider({ children, routeKey }) {
  const routeRef = useRef(routeKey);
  const startedAtRef = useRef(0);

  if (routeRef.current !== routeKey) {
    routeRef.current = routeKey;
    startedAtRef.current = getNow();
  }
  if (!startedAtRef.current) startedAtRef.current = getNow();

  return (
    <AccountMotionContext.Provider value={startedAtRef}>{children}</AccountMotionContext.Provider>
  );
}

/** Only authored content is wrapped. AccountGridFrame and structural rules stay static. */
export function AccountReveal({
  children,
  className,
  deferred = false,
  interaction = 'card',
  interactive = false,
  itemIndex = 0,
  stage,
  style,
}) {
  const startedAtRef = useContext(AccountMotionContext);
  const reduceMotion = useReducedMotion();
  const config = getStage(stage);
  const delay = getDelay({ config, deferred, itemIndex, startedAt: startedAtRef?.current });
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
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      {...(!reduceMotion && interactive
        ? ACCOUNT_INTERACTIONS[interaction] || ACCOUNT_INTERACTIONS.card
        : {})}
      variants={{
        hidden,
        visible: {
          ...visible,
          transition: { delay, duration: config.duration, ease: EASINGS.CINEMATIC },
        },
        exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: EASINGS.EXIT } },
      }}
    >
      {children}
    </motion.div>
  );
}
