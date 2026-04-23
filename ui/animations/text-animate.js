'use client';

import { useMemo, useRef } from 'react';

import { motion, useInView } from 'framer-motion';
import { ANIMATION_EASINGS, ANIMATION_PROFILES } from '@/core/animation';
import { cn } from '@/core/utils';

const STAGGER_BY = Object.freeze({
  character: 0.02,
  word: 0.042,
  text: 0,
});

const SOFT_TEXT_PROFILE = ANIMATION_PROFILES.SOFT;

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
  const resolvedDuration = duration;
  const resolvedStagger =
    animation === 'cinematicSoft' && by === 'word'
      ? SOFT_TEXT_PROFILE.stagger.textByWord
      : STAGGER_BY[by] || STAGGER_BY.word;
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
      hidden: { opacity: 0, filter: 'blur(6px)' },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration: resolvedDuration },
      },
    },
    blurInUp: {
      hidden: { opacity: 0, filter: 'blur(6px)', y: 14 },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: { duration: resolvedDuration },
      },
    },
    blurInDown: {
      hidden: { opacity: 0, filter: 'blur(6px)', y: -14 },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: { duration: resolvedDuration },
      },
    },
    slideUp: {
      hidden: { y: 14, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideDown: {
      hidden: { y: -14, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideLeft: {
      hidden: { x: 14, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    slideRight: {
      hidden: { x: -14, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    cinematicUp: {
      hidden: { opacity: 0, y: 18, scale: 0.965, filter: 'blur(8px)' },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
          duration: resolvedDuration,
          ease: ANIMATION_EASINGS.EMPHASIZED,
        },
      },
    },
    cinematicSoft: {
      hidden: {
        opacity: 0,
        y: SOFT_TEXT_PROFILE.offsets.textY,
        scale: SOFT_TEXT_PROFILE.scales.text,
        filter: 'blur(8px)',
      },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
          duration: resolvedDuration,
          ease: SOFT_TEXT_PROFILE.easings.emphasis,
        },
      },
    },
    scaleUp: {
      hidden: { scale: 0.92, opacity: 0 },
      show: {
        scale: 1,
        opacity: 1,
        transition: { duration: resolvedDuration },
      },
    },
    scaleDown: {
      hidden: { scale: 1.08, opacity: 0 },
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
