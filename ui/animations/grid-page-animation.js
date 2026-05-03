'use client';

import { createContext, useContext, useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { ANIMATION_VIEWPORTS, buildGridLineMotion, buildGridNodeMotion } from '@/core/animation';
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
  once = true,
}) {
  const { reducedMotion } = useContext(GridPageAnimationContext);
  const resolvedDelay = useGridMotionDelay(delay);
  const motionProps = buildGridLineMotion({
    axis,
    delay: resolvedDelay,
    direction,
    duration,
  });
  const initial = reducedMotion ? false : motionProps.initial;

  if (typeof active === 'boolean') {
    return (
      <motion.span
        aria-hidden="true"
        className={cn('grid-page-line', className)}
        initial={initial}
        animate={active || reducedMotion ? motionProps.animate : motionProps.initial}
        transition={motionProps.transition}
        style={motionProps.style}
      />
    );
  }

  if (animateOnView) {
    return (
      <motion.span
        aria-hidden="true"
        className={cn('grid-page-line', className)}
        initial={initial}
        whileInView={motionProps.animate}
        viewport={{ ...ANIMATION_VIEWPORTS.section, once }}
        transition={motionProps.transition}
        style={motionProps.style}
      />
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      className={cn('grid-page-line', className)}
      initial={initial}
      animate={motionProps.animate}
      transition={motionProps.transition}
      style={motionProps.style}
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
  once = true,
}) {
  const { reducedMotion } = useContext(GridPageAnimationContext);
  const resolvedDelay = useGridMotionDelay(delay);
  const motionProps = buildGridNodeMotion({
    delay: resolvedDelay,
    duration,
  });
  const initial = reducedMotion ? false : motionProps.initial;

  if (typeof active === 'boolean') {
    return (
      <motion.span
        aria-hidden="true"
        className={className}
        initial={initial}
        animate={active || reducedMotion ? motionProps.animate : motionProps.initial}
        transition={motionProps.transition}
        style={motionProps.style}
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
        initial={initial}
        whileInView={motionProps.animate}
        viewport={{ ...ANIMATION_VIEWPORTS.section, once }}
        transition={motionProps.transition}
        style={motionProps.style}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      className={className}
      initial={initial}
      animate={motionProps.animate}
      transition={motionProps.transition}
      style={motionProps.style}
    >
      {children}
    </motion.span>
  );
}
