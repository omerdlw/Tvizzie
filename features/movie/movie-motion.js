'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { EASING } from '@/core/constants';
import { cn } from '@/core/utils';

const SECTION_VIEWPORT = {
  once: true,
  amount: 0.2,
  margin: '0px 0px -12% 0px',
};

const REVEAL_TIMING = Object.freeze({
  reducedDuration: 0.18,
  defaultDuration: 0.64,
  sidebarDuration: 0.72,
  heroDuration: 0.66,
  sectionDuration: 0.68,
});

const REVEAL_BLUR = 7;

function buildAxisOffset(axis, distance) {
  if (axis === 'x') {
    return { x: distance };
  }

  return { y: distance };
}

function buildRevealTransition({ delay, duration, reduceMotion }) {
  return {
    duration: reduceMotion ? REVEAL_TIMING.reducedDuration : duration,
    delay: reduceMotion ? 0 : delay,
    ease: EASING.SMOOTH,
  };
}

function MovieReveal({
  animateOnView = false,
  axis = 'y',
  children,
  className = '',
  delay = 0,
  direction = 1,
  distance = 30,
  duration = REVEAL_TIMING.defaultDuration,
  once = true,
}) {
  const reduceMotion = useReducedMotion();
  const motionDistance = direction * distance;
  const initial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, filter: `blur(${REVEAL_BLUR}px)`, ...buildAxisOffset(axis, motionDistance) };
  const target = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        filter: 'blur(0px)',
        ...buildAxisOffset(axis, 0),
        transitionEnd: {
          filter: 'none',
          transform: 'none',
          willChange: 'auto',
        },
      };
  const transition = buildRevealTransition({ delay, duration, reduceMotion });
  const style = reduceMotion ? undefined : { willChange: 'transform, opacity, filter' };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={{ ...SECTION_VIEWPORT, once }}
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} initial={initial} animate={target} transition={transition} style={style}>
      {children}
    </motion.div>
  );
}

export function MovieSidebarReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal
      className={className}
      axis="x"
      direction={-1}
      distance={34}
      delay={delay}
      duration={REVEAL_TIMING.sidebarDuration}
    >
      {children}
    </MovieReveal>
  );
}

export function MovieHeroReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal className={className} axis="y" distance={28} delay={delay} duration={REVEAL_TIMING.heroDuration}>
      {children}
    </MovieReveal>
  );
}

export function MovieSectionReveal({ children, className = '', delay = 0, once = true }) {
  return (
    <MovieReveal
      className={className}
      animateOnView={false}
      axis="y"
      distance={30}
      delay={delay}
      duration={REVEAL_TIMING.sectionDuration}
      once={once}
    >
      {children}
    </MovieReveal>
  );
}

export function MovieSectionSkeleton({ className = '' }) {
  return (
    <div className={cn('mt-20 flex w-full flex-col space-y-3 p-4', className)}>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
      <div className="h-4 w-full animate-pulse rounded-[12px] bg-black/5"></div>
    </div>
  );
}
