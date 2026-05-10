'use client';

import { motion } from 'framer-motion';

import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

export const ACCOUNT_ROUTE_MOTION = Object.freeze({
  frameBaseDelay: 0.24,
  heroDelay: 0.1,
  navDelay: 0.3,
  sections: Object.freeze({
    baseDelay: 0.16,
    step: 0.12,
  }),
  items: Object.freeze({
    step: 0.05,
    max: 0.3,
  }),
  transitions: Object.freeze({
    hero: freezeMotion({
      type: 'tween',
      duration: 1.04,
      ease: MOTION_EASE.emphasis,
    }),
    section: freezeMotion({
      type: 'tween',
      duration: 0.96,
      ease: MOTION_EASE.emphasis,
    }),
    item: freezeMotion({
      type: 'tween',
      duration: 0.74,
      ease: MOTION_EASE.entrance,
    }),
    nav: freezeMotion({
      type: 'tween',
      duration: 0.72,
      ease: MOTION_EASE.emphasis,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.22,
      ease: MOTION_EASE.exit,
    }),
  }),
});

export const ACCOUNT_HERO_MOTION = freezeMotion({
  initial: { opacity: 0, y: 24, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.996,
    transition: ACCOUNT_ROUTE_MOTION.transitions.exit,
  },
  transition: withDelay(ACCOUNT_ROUTE_MOTION.transitions.hero, ACCOUNT_ROUTE_MOTION.heroDelay),
});

export const ACCOUNT_NAV_MOTION = freezeMotion({
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -8,
    transition: ACCOUNT_ROUTE_MOTION.transitions.exit,
  },
  transition: withDelay(ACCOUNT_ROUTE_MOTION.transitions.nav, ACCOUNT_ROUTE_MOTION.navDelay),
});

export const ACCOUNT_ROUTE_ITEM_MOTION = freezeMotion({
  variants: freezeMotion({
    hidden: { opacity: 0, y: 18, scale: 0.988 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: ACCOUNT_ROUTE_MOTION.transitions.item,
    },
  }),
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.992,
    transition: ACCOUNT_ROUTE_MOTION.transitions.exit,
  },
});

export const ACCOUNT_ROUTE_SECTION_MOTION = freezeMotion({
  initial: 'hidden',
  animate: 'visible',
  variants: freezeMotion({
    hidden: { opacity: 0, y: 24, scale: 0.992 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: freezeMotion({
        ...ACCOUNT_ROUTE_MOTION.transitions.section,
        delayChildren: 0.16,
        staggerChildren: ACCOUNT_ROUTE_MOTION.items.step,
      }),
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.996,
    transition: ACCOUNT_ROUTE_MOTION.transitions.exit,
  },
});

const ACCOUNT_MOTION_COMPONENTS = Object.freeze({
  article: motion.article,
  div: motion.div,
  li: motion.li,
});

function getAccountSectionDelay(index = 0) {
  return (
    ACCOUNT_ROUTE_MOTION.sections.baseDelay +
    getStaggerDelay(index, {
      step: ACCOUNT_ROUTE_MOTION.sections.step,
      max: 0.48,
    })
  );
}

export function getAccountRouteSectionMotion(index = 0) {
  return freezeMotion({
    ...ACCOUNT_ROUTE_SECTION_MOTION,
    variants: freezeMotion({
      ...ACCOUNT_ROUTE_SECTION_MOTION.variants,
      visible: {
        ...ACCOUNT_ROUTE_SECTION_MOTION.variants.visible,
        transition: withDelay(
          ACCOUNT_ROUTE_SECTION_MOTION.variants.visible.transition,
          getAccountSectionDelay(index)
        ),
      },
    }),
  });
}

export function getAccountRouteItemMotion(index = 0) {
  return freezeMotion({
    ...ACCOUNT_ROUTE_ITEM_MOTION,
    variants: freezeMotion({
      ...ACCOUNT_ROUTE_ITEM_MOTION.variants,
      visible: {
        ...ACCOUNT_ROUTE_ITEM_MOTION.variants.visible,
        transition: withDelay(
          ACCOUNT_ROUTE_MOTION.transitions.item,
          getStaggerDelay(index, ACCOUNT_ROUTE_MOTION.items)
        ),
      },
    }),
  });
}

export function AccountHeroReveal({ children, className = '' }) {
  return (
    <motion.div className={className} {...ACCOUNT_HERO_MOTION}>
      {children}
    </motion.div>
  );
}

export function AccountNavReveal({ children, className = '' }) {
  return (
    <motion.div className={className} {...ACCOUNT_NAV_MOTION}>
      {children}
    </motion.div>
  );
}

export function AccountSectionReveal({ children, className = '', index = 0 }) {
  return (
    <motion.div className={className} {...getAccountRouteSectionMotion(index)}>
      {children}
    </motion.div>
  );
}

export function AccountMotionItem({ as = 'div', children, className = '', index = 0 }) {
  const Component = ACCOUNT_MOTION_COMPONENTS[as] || motion.div;

  return (
    <Component className={className} {...getAccountRouteItemMotion(index)}>
      {children}
    </Component>
  );
}
