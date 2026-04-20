'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { ANIMATION_STAGGER } from './config';
import { ANIMATION_VIEWPORTS, createAnimationObserverOptions } from './viewport';

const AnimationSequenceContext = createContext(null);

export function AnimationSequenceGroup({
  children,
  className = '',
  delay = 0,
  staggerStep = ANIMATION_STAGGER.GROUP,
  viewport = ANIMATION_VIEWPORTS.section,
}) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setIsActive(true);
      return undefined;
    }

    if (isActive) {
      return undefined;
    }

    const target = containerRef.current;

    if (!target) {
      return undefined;
    }

    const observerOptions = createAnimationObserverOptions(viewport);
    const threshold = Number(observerOptions.threshold?.[1] ?? 0);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting || entry?.intersectionRatio >= threshold) {
        setIsActive(true);
        observer.disconnect();
      }
    }, observerOptions);

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [isActive, reduceMotion, viewport]);

  const value = useMemo(
    () => ({
      delay,
      isActive,
      staggerStep,
    }),
    [delay, isActive, staggerStep]
  );

  return (
    <AnimationSequenceContext.Provider value={value}>
      <div ref={containerRef} className={className}>
        {children}
      </div>
    </AnimationSequenceContext.Provider>
  );
}

export function useAnimationSequence() {
  return useContext(AnimationSequenceContext);
}

export function useInitialRevealEnabled() {
  const shouldAnimateRef = useRef(true);

  useEffect(() => {
    shouldAnimateRef.current = false;
  }, []);

  return shouldAnimateRef.current;
}
