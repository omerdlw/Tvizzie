'use client';

import { motion } from 'framer-motion';

import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

export const APP_ROUTE_MOTION = Object.freeze({
  shellDelay: 0.08,
  sections: Object.freeze({
    baseDelay: 0.12,
    step: 0.09,
    max: 0.42,
  }),
  items: Object.freeze({
    step: 0.045,
    max: 0.36,
  }),
  transitions: Object.freeze({
    shell: freezeMotion({
      type: 'tween',
      duration: 0.72,
      ease: MOTION_EASE.emphasis,
    }),
    section: freezeMotion({
      type: 'tween',
      duration: 0.68,
      ease: MOTION_EASE.emphasis,
    }),
    item: freezeMotion({
      type: 'tween',
      duration: 0.5,
      ease: MOTION_EASE.entrance,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.2,
      ease: MOTION_EASE.exit,
    }),
  }),
});

export const APP_ROUTE_SHELL_MOTION = freezeMotion({
  initial: 'hidden',
  animate: 'visible',
  exit: 'exit',
  variants: freezeMotion({
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: freezeMotion({
        ...APP_ROUTE_MOTION.transitions.shell,
        delay: APP_ROUTE_MOTION.shellDelay,
        delayChildren: 0.08,
        staggerChildren: APP_ROUTE_MOTION.items.step,
      }),
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: APP_ROUTE_MOTION.transitions.exit,
    },
  }),
});

export const APP_ROUTE_SECTION_MOTION = freezeMotion({
  initial: 'hidden',
  animate: 'visible',
  exit: 'exit',
  variants: freezeMotion({
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: freezeMotion({
        ...APP_ROUTE_MOTION.transitions.section,
        delayChildren: 0.1,
        staggerChildren: APP_ROUTE_MOTION.items.step,
      }),
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: APP_ROUTE_MOTION.transitions.exit,
    },
  }),
});

export const APP_ROUTE_ITEM_MOTION = freezeMotion({
  variants: freezeMotion({
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: APP_ROUTE_MOTION.transitions.item,
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: APP_ROUTE_MOTION.transitions.exit,
    },
  }),
});

const APP_ROUTE_MOTION_COMPONENTS = Object.freeze({
  article: motion.article,
  aside: motion.aside,
  div: motion.div,
  form: motion.form,
  header: motion.header,
  li: motion.li,
  main: motion.main,
  section: motion.section,
  span: motion.span,
});

function getAppRouteSectionDelay(index = 0) {
  return (
    APP_ROUTE_MOTION.sections.baseDelay +
    getStaggerDelay(index, {
      step: APP_ROUTE_MOTION.sections.step,
      max: APP_ROUTE_MOTION.sections.max,
    })
  );
}

export function getAppRouteSectionMotion(index = 0) {
  return freezeMotion({
    ...APP_ROUTE_SECTION_MOTION,
    variants: freezeMotion({
      ...APP_ROUTE_SECTION_MOTION.variants,
      visible: {
        ...APP_ROUTE_SECTION_MOTION.variants.visible,
        transition: withDelay(
          APP_ROUTE_SECTION_MOTION.variants.visible.transition,
          getAppRouteSectionDelay(index)
        ),
      },
    }),
  });
}

export function getAppRouteItemMotion(index = 0) {
  return freezeMotion({
    ...APP_ROUTE_ITEM_MOTION,
    variants: freezeMotion({
      ...APP_ROUTE_ITEM_MOTION.variants,
      visible: {
        ...APP_ROUTE_ITEM_MOTION.variants.visible,
        transition: withDelay(
          APP_ROUTE_MOTION.transitions.item,
          getStaggerDelay(index, APP_ROUTE_MOTION.items)
        ),
      },
    }),
  });
}

export function AppRouteShell({ as = 'div', children, className = '', ...props }) {
  const Component = APP_ROUTE_MOTION_COMPONENTS[as] || motion.div;

  return (
    <Component className={className} {...props} {...APP_ROUTE_SHELL_MOTION}>
      {children}
    </Component>
  );
}

export function AppRouteSection({ as = 'section', children, className = '', index = 0, ...props }) {
  const Component = APP_ROUTE_MOTION_COMPONENTS[as] || motion.section;

  return (
    <Component className={className} {...props} {...getAppRouteSectionMotion(index)}>
      {children}
    </Component>
  );
}

export function AppRouteItem({ as = 'div', children, className = '', index = 0, ...props }) {
  const Component = APP_ROUTE_MOTION_COMPONENTS[as] || motion.div;

  return (
    <Component className={className} {...props} {...getAppRouteItemMotion(index)}>
      {children}
    </Component>
  );
}
