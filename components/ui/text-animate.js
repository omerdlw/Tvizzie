'use client';

import { cn } from '@/core/utils';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useMemo, useRef } from 'react';

const STAGGER_BY = Object.freeze({
  character: 0.02,
  word: 0.05,
  text: 0,
});

function splitSegments(value, by) {
  if (!value) {
    return [];
  }

  if (by === 'character') {
    return value.split('');
  }

  if (by === 'word') {
    return value.split(' ');
  }

  return [value];
}

export function TextAnimate({
  children,
  delay = 0,
  duration = 0.3,
  className,
  segmentClassName,
  as: Component = 'p',
  startOnView = true,
  once = true,
  by = 'word',
  animation = 'fadeIn',
  ...props
}) {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(ref, {
    once,
    amount: 0.35,
    margin: '0px 0px -10% 0px',
  });
  const resolvedText = useMemo(() => {
    if (typeof children === 'string') {
      return children;
    }

    if (typeof children === 'number') {
      return String(children);
    }

    return '';
  }, [children]);
  const segments = useMemo(() => splitSegments(resolvedText, by), [resolvedText, by]);
  const resolvedDuration = shouldReduceMotion ? 0.08 : duration;
  const resolvedStagger = shouldReduceMotion ? 0 : STAGGER_BY[by] || STAGGER_BY.word;
  const shouldAnimate = startOnView ? isInView : true;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: resolvedStagger,
        delayChildren: delay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    fadeIn: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    blurIn: {
      hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' },
      show: {
        opacity: 1,
        ...(shouldReduceMotion ? {} : { filter: 'blur(0px)' }),
        transition: { duration: resolvedDuration },
      },
    },
    blurInUp: {
      hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)', y: 14 },
      show: {
        opacity: 1,
        ...(shouldReduceMotion ? {} : { filter: 'blur(0px)' }),
        y: 0,
        transition: { duration: resolvedDuration },
      },
    },
    blurInDown: {
      hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)', y: -14 },
      show: {
        opacity: 1,
        ...(shouldReduceMotion ? {} : { filter: 'blur(0px)' }),
        y: 0,
        transition: { duration: resolvedDuration },
      },
    },
    slideUp: {
      hidden: { y: shouldReduceMotion ? 0 : 14, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideDown: {
      hidden: { y: shouldReduceMotion ? 0 : -14, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideLeft: {
      hidden: { x: shouldReduceMotion ? 0 : 14, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideRight: {
      hidden: { x: shouldReduceMotion ? 0 : -14, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    scaleUp: {
      hidden: { scale: shouldReduceMotion ? 1 : 0.92, opacity: 0 },
      show: {
        scale: 1,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    scaleDown: {
      hidden: { scale: shouldReduceMotion ? 1 : 1.08, opacity: 0 },
      show: {
        scale: 1,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
  };

  const finalVariants = itemVariants[animation] || itemVariants.fadeIn;

  const MotionComponent = useMemo(() => motion.create(Component), [Component]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <MotionComponent
      ref={ref}
      className={cn('whitespace-pre-wrap', className)}
      initial="hidden"
      animate={shouldAnimate ? 'show' : 'hidden'}
      exit="exit"
      variants={containerVariants}
      {...props}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${by}-${i}-${segment}`}
          className={cn('inline-block', segmentClassName)}
          variants={finalVariants}
        >
          {segment}
          {by === 'word' && i < segments.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
