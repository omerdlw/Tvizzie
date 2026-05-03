'use client';

import { createContext, useContext, useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { ANIMATION_DURATIONS, ANIMATION_VIEWPORTS, buildGridLineMotion, buildGridNodeMotion } from '@/core/animation';
import { cn } from '@/ui/elements/utils';

const GridPageAnimationContext = createContext({
  baseDelay: 0,
  reducedMotion: false,
});

export function GridPageAnimationRoot({ baseDelay = 0, children, routeKey = null }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const animationKey = routeKey ?? pathname ?? 'grid-page';
  const value = useMemo(
    () => ({
      baseDelay,
      reducedMotion,
    }),
    [baseDelay, reducedMotion]
  );

  return (
    <GridPageAnimationContext.Provider key={animationKey} value={value}>
      {children}
    </GridPageAnimationContext.Provider>
  );
}

function useGridMotionDelay(delay) {
  const { baseDelay } = useContext(GridPageAnimationContext);

  return baseDelay + delay;
}

export function GridPageLine({
  active = null,
  animateOnView = false,
  axis = 'x',
  className = '',
  delay = 0,
  direction = 'forward',
  duration,
  ease,
  once = true,
  opacityDurationFactor,
  reducedMotionDuration = ANIMATION_DURATIONS.NORMAL,
  reducedMotionOpacity = 1,
}) {
  const { reducedMotion } = useContext(GridPageAnimationContext);
  const resolvedDelay = useGridMotionDelay(delay);
  const motionProps = buildGridLineMotion({
    axis,
    delay: resolvedDelay,
    direction,
    duration,
    ease,
    opacityDurationFactor,
  });
  const reducedMotionProps = {
    initial: { opacity: reducedMotionOpacity },
    animate: {
      opacity: 1,
      transitionEnd: motionProps.animate?.transitionEnd,
    },
    transition: {
      opacity: {
        duration: reducedMotionDuration,
        delay: 0,
        ease: motionProps.transition?.opacity?.ease,
      },
    },
    style: undefined,
  };
  const resolvedMotionProps = reducedMotion ? reducedMotionProps : motionProps;

  if (typeof active === 'boolean') {
    return (
      <motion.span
        aria-hidden="true"
        className={cn('grid-page-line', className)}
        initial={resolvedMotionProps.initial}
        animate={active || reducedMotion ? resolvedMotionProps.animate : resolvedMotionProps.initial}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      />
    );
  }

  if (animateOnView) {
    return (
      <motion.span
        aria-hidden="true"
        className={cn('grid-page-line', className)}
        initial={resolvedMotionProps.initial}
        whileInView={resolvedMotionProps.animate}
        viewport={{ ...ANIMATION_VIEWPORTS.section, once }}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      />
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      className={cn('grid-page-line', className)}
      initial={resolvedMotionProps.initial}
      animate={resolvedMotionProps.animate}
      transition={resolvedMotionProps.transition}
      style={resolvedMotionProps.style}
    />
  );
}

export function GridPageNode({
  active = null,
  animateOnView = false,
  children,
  className = '',
  delay = 0,
  duration,
  ease,
  once = true,
}) {
  const { reducedMotion } = useContext(GridPageAnimationContext);
  const resolvedDelay = useGridMotionDelay(delay);
  const motionProps = buildGridNodeMotion({
    delay: resolvedDelay,
    duration,
    ease,
  });
  const reducedMotionProps = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transitionEnd: motionProps.animate?.transitionEnd,
    },
    transition: {
      opacity: {
        duration: ANIMATION_DURATIONS.NORMAL,
        delay: 0,
        ease: motionProps.transition?.opacity?.ease,
      },
    },
    style: undefined,
  };
  const resolvedMotionProps = reducedMotion ? reducedMotionProps : motionProps;

  if (typeof active === 'boolean') {
    return (
      <motion.span
        aria-hidden="true"
        className={className}
        initial={resolvedMotionProps.initial}
        animate={active || reducedMotion ? resolvedMotionProps.animate : resolvedMotionProps.initial}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      >
        {children}
      </motion.span>
    );
  }

  if (animateOnView) {
    return (
      <motion.span
        aria-hidden="true"
        className={className}
        initial={resolvedMotionProps.initial}
        whileInView={resolvedMotionProps.animate}
        viewport={{ ...ANIMATION_VIEWPORTS.section, once }}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      className={className}
      initial={resolvedMotionProps.initial}
      animate={resolvedMotionProps.animate}
      transition={resolvedMotionProps.transition}
      style={resolvedMotionProps.style}
    >
      {children}
    </motion.span>
  );
}
