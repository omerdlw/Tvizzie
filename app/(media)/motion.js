'use client';

import { createContext, useContext, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  TEXT: [0.22, 1, 0.36, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

/**
 * Movie and TV share one coordinated, top-to-bottom sequence. The authored
 * map keeps the semantic order legible; `getStage` normalizes it into the
 * first second so streamed chapters never leave the page waiting for a long
 * waterfall of entrances.
 */
const STAGES = Object.freeze({
  'sidebar.poster': Object.freeze({ at: 0.18, duration: 1.45, y: 24, scale: 0.94 }),
  'hero.title': Object.freeze({ at: 0.5, duration: 1.02 }),
  'hero.tagline': Object.freeze({ at: 1.12, duration: 0.88 }),
  'hero.overview': Object.freeze({ at: 1.42, duration: 1.08 }),
  'sidebar.actions': Object.freeze({ at: 1.08, duration: 0.78, y: 12 }),
  'items.actions': Object.freeze({
    at: 1.34,
    duration: 0.68,
    y: 10,
    stagger: 0.11,
    lateDelay: 0.12,
  }),
  'sidebar.taxonomy': Object.freeze({ at: 1.58, duration: 0.78, y: 10 }),
  'sidebar.rows': Object.freeze({ at: 1.98, duration: 0.76, x: -14, stagger: 0.09 }),
  'sections.cast': Object.freeze({ at: 2.48, duration: 1.04, y: 20 }),
  'sections.seasons': Object.freeze({ at: 3.18, duration: 1.02, y: 20, lateDelay: 0.18 }),
  'sections.gallery': Object.freeze({ at: 3.82, duration: 1.04, y: 22, lateDelay: 0.2 }),
  'sections.images': Object.freeze({ at: 4.46, duration: 1.02, y: 20, lateDelay: 0.22 }),
  'sections.discovery': Object.freeze({ at: 5.12, duration: 1.08, y: 24, lateDelay: 0.24 }),
  'sections.reviews': Object.freeze({ at: 5.82, duration: 1.08, y: 22, lateDelay: 0.2 }),
  'items.cast': Object.freeze({ at: 2.82, duration: 0.82, y: 16, scale: 0.975, stagger: 0.1 }),
  'items.seasons': Object.freeze({
    at: 3.46,
    duration: 0.8,
    y: 16,
    scale: 0.975,
    stagger: 0.08,
    lateDelay: 0.12,
  }),
  'items.gallery': Object.freeze({
    at: 4.12,
    duration: 0.84,
    y: 18,
    scale: 0.97,
    stagger: 0.085,
    lateDelay: 0.12,
  }),
  'items.images': Object.freeze({
    at: 4.76,
    duration: 0.82,
    y: 18,
    scale: 0.97,
    stagger: 0.08,
    lateDelay: 0.12,
  }),
  'items.videos': Object.freeze({
    at: 5.42,
    duration: 0.84,
    y: 18,
    scale: 0.975,
    stagger: 0.08,
    lateDelay: 0.12,
  }),
  'items.discovery': Object.freeze({
    at: 5.5,
    duration: 0.84,
    y: 18,
    scale: 0.97,
    stagger: 0.085,
    lateDelay: 0.12,
  }),
  'items.reviews': Object.freeze({ at: 6.08, duration: 0.8, y: 14, stagger: 0.1, lateDelay: 0.14 }),
  'person.hero.portrait': Object.freeze({ at: 0.16, duration: 1.22, y: 18, scale: 0.94 }),
  'person.hero.title': Object.freeze({ at: 0.42, duration: 1.04 }),
  'person.hero.bio': Object.freeze({ at: 1.14, duration: 1.02, y: 14 }),
  'person.sections.gallery': Object.freeze({ at: 2.08, duration: 1.02, y: 20, lateDelay: 0.18 }),
  'person.sections.filmography': Object.freeze({
    at: 2.76,
    duration: 1.06,
    y: 22,
    lateDelay: 0.22,
  }),
  'person.items.gallery': Object.freeze({
    at: 2.42,
    duration: 0.8,
    y: 16,
    scale: 0.97,
    stagger: 0.09,
    lateDelay: 0.12,
  }),
  'person.items.filmography': Object.freeze({
    at: 3.14,
    duration: 0.82,
    y: 16,
    scale: 0.97,
    stagger: 0.075,
    lateDelay: 0.12,
  }),
  'person.sections.timeline': Object.freeze({ at: 0.28, duration: 1.04, y: 20, lateDelay: 0.18 }),
  'person.timeline.year': Object.freeze({
    at: 0.64,
    duration: 0.72,
    y: 10,
    stagger: 0.11,
    lateDelay: 0.12,
  }),
  'person.timeline.item': Object.freeze({
    at: 0.82,
    duration: 0.8,
    y: 14,
    scale: 0.98,
    stagger: 0.065,
    lateDelay: 0.1,
  }),
  'person.sections.awards': Object.freeze({ at: 0.26, duration: 1.04, y: 20, lateDelay: 0.18 }),
  'person.awards.stat': Object.freeze({
    at: 0.52,
    duration: 0.78,
    y: 14,
    scale: 0.97,
    stagger: 0.1,
    lateDelay: 0.12,
  }),
  'person.awards.filters': Object.freeze({
    at: 1.12,
    duration: 0.68,
    y: 10,
    stagger: 0.06,
    lateDelay: 0.12,
  }),
  'person.awards.item': Object.freeze({
    at: 1.5,
    duration: 0.82,
    y: 16,
    scale: 0.98,
    stagger: 0.075,
    lateDelay: 0.12,
  }),
});

export const MOVIE_TV_ROUTE_MOTION = Object.freeze({ easings: EASINGS, stages: STAGES });

export const MEDIA_ROUTE_INTERACTIONS = Object.freeze({
  card: Object.freeze({
    whileHover: Object.freeze({
      transition: { duration: 0.3, ease: EASINGS.ACCENT },
    }),
    whileTap: Object.freeze({ scale: 0.985, transition: { duration: 0.18, ease: EASINGS.ACCENT } }),
  }),
  control: Object.freeze({
    whileHover: Object.freeze({
      scale: 1.025,
      transition: { duration: 0.28, ease: EASINGS.ACCENT },
    }),
    whileTap: Object.freeze({ scale: 0.965, transition: { duration: 0.18, ease: EASINGS.ACCENT } }),
  }),
});

const MediaRouteMotionContext = createContext(null);

function getNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function getStage(stage) {
  const config = STAGES[stage] || STAGES['items.discovery'];

  return {
    ...config,
    at: Math.min(config.at * 0.16, 0.94),
    duration: Math.min(config.duration, 0.78),
  };
}

function getDelay({ config, deferred, itemIndex, startedAt }) {
  const elapsed = startedAt ? Math.max(0, (getNow() - startedAt) / 1000) : 0;
  const intendedDelay = Math.max(0, config.at - elapsed);
  const protectedDelay = deferred ? Math.max(config.lateDelay || 0, intendedDelay) : intendedDelay;
  const staggerDelay = Math.min(
    Math.max(0, itemIndex) * (config.stagger || 0),
    config.maxStaggerDelay || 0.72,
  );
  return protectedDelay + staggerDelay;
}

export function MediaRouteMotionProvider({ routeKey, children }) {
  const routeRef = useRef(routeKey);
  const startedAtRef = useRef(0);

  if (routeRef.current !== routeKey) {
    routeRef.current = routeKey;
    startedAtRef.current = getNow();
  }

  if (!startedAtRef.current) startedAtRef.current = getNow();

  return (
    <MediaRouteMotionContext.Provider value={startedAtRef}>
      {children}
    </MediaRouteMotionContext.Provider>
  );
}

/**
 * This wrapper is limited to authored content. Grid frames deliberately sit
 * outside it, keeping the page's architectural lines static at all times.
 */
export function MediaRouteReveal({
  children,
  className,
  deferred = false,
  interaction = 'card',
  interactive = false,
  itemIndex = 0,
  stage,
  style,
}) {
  const startedAtRef = useContext(MediaRouteMotionContext);
  const reduceMotion = useReducedMotion();
  const config = getStage(stage);
  const delay = getDelay({
    config,
    deferred,
    itemIndex,
    startedAt: startedAtRef?.current,
  });

  const hidden = { opacity: 0 };
  const visible = { opacity: 1 };
  if (config.x) {
    hidden.x = config.x;
    visible.x = 0;
  }
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
        ? MEDIA_ROUTE_INTERACTIONS[interaction] || MEDIA_ROUTE_INTERACTIONS.card
        : {})}
      variants={{
        hidden,
        visible: {
          ...visible,
          transition: { delay, duration: config.duration, ease: EASINGS.CINEMATIC },
        },
        exit: {
          opacity: 0,
          y: -8,
          transition: { duration: 0.18, ease: EASINGS.EXIT },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
