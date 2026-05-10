import {
  createContentMotion,
  createFadeMotion,
  createInteractionMotion,
  createListContainerMotion,
  createListItemMotion,
  createMotionRegistry,
  createSurfaceMotion,
  defineFeatureMotion,
  freezeMotion,
  getStaggerDelay,
  MOTION_EASE,
  MOTION_SCALE,
  MOTION_STAGGER,
  MOTION_TRANSITION,
  withDelay,
} from '@/core/animation';

export const FEATURE_MOTION = defineFeatureMotion({
  id: 'features',
  transitions: {
    surface: MOTION_TRANSITION.softSpring,
    content: MOTION_TRANSITION.entrance,
    action: MOTION_TRANSITION.microSpring,
    searchReveal: freezeMotion({
      type: 'tween',
      duration: 0.38,
      ease: MOTION_EASE.entrance,
    }),
    searchExit: freezeMotion({
      type: 'tween',
      duration: 0.18,
      ease: MOTION_EASE.exit,
    }),
    navActionReveal: freezeMotion({
      type: 'tween',
      duration: 0.3,
      ease: MOTION_EASE.entrance,
    }),
    modalReveal: freezeMotion({
      type: 'tween',
      duration: 0.34,
      ease: MOTION_EASE.entrance,
    }),
    modalExit: freezeMotion({
      type: 'tween',
      duration: 0.18,
      ease: MOTION_EASE.exit,
    }),
  },
  variants: {
    fade: createFadeMotion({ transition: MOTION_TRANSITION.standard }),
    surface: createSurfaceMotion({ transition: MOTION_TRANSITION.softSpring }),
    content: createContentMotion({ transition: MOTION_TRANSITION.entrance }),
    list: createListContainerMotion(),
    listItem: createListItemMotion(),
  },
  interactions: {
    action: createInteractionMotion({ transition: MOTION_TRANSITION.microSpring }),
  },
  sequences: {
    searchResults: MOTION_STAGGER.standard,
    searchTabs: freezeMotion({
      step: 0.05,
      max: 0.15,
    }),
    navActionItems: MOTION_STAGGER.tight,
    modalItems: MOTION_STAGGER.tight,
    modalSections: freezeMotion({
      step: 0.07,
      max: 0.28,
    }),
  },
});

export const FEATURE_MOTION_REGISTRY = createMotionRegistry({
  default: FEATURE_MOTION,
});

export const SEARCH_ACTION_REVEAL_TRANSITION = FEATURE_MOTION.transition('searchReveal');
export const SEARCH_ACTION_EXIT_TRANSITION = FEATURE_MOTION.transition('searchExit');
export const SEARCH_ACTION_STAGGER = FEATURE_MOTION.stagger('searchResults');

export const SEARCH_ACTION_PANEL_MOTION = freezeMotion({
  initial: { opacity: 0, y: -8, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -8, height: 0, transition: SEARCH_ACTION_EXIT_TRANSITION },
  transition: SEARCH_ACTION_REVEAL_TRANSITION,
});

export const SEARCH_ACTION_FADE_MOTION = freezeMotion({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: SEARCH_ACTION_EXIT_TRANSITION },
  transition: SEARCH_ACTION_REVEAL_TRANSITION,
});

export const FEATURE_NAV_ACTION_ROW_MOTION = freezeMotion({
  layout: 'position',
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: FEATURE_MOTION.transition('searchExit') },
  transition: FEATURE_MOTION.transition('navActionReveal'),
});

export const FEATURE_NAV_ACTION_BUTTON_MOTION = freezeMotion({
  transition: MOTION_TRANSITION.microSpring,
});

export const FEATURE_NAV_ACTION_ITEM_MOTION = freezeMotion({
  layout: 'position',
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -6, transition: FEATURE_MOTION.transition('searchExit') },
  transition: FEATURE_MOTION.transition('navActionReveal'),
});

export const FEATURE_MODAL_CONTENT_MOTION = freezeMotion({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: FEATURE_MOTION.transition('modalExit') },
  transition: FEATURE_MOTION.transition('modalReveal'),
});

export const FEATURE_MODAL_SECTION_MOTION = freezeMotion({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: FEATURE_MOTION.transition('modalExit') },
  transition: FEATURE_MOTION.transition('modalReveal'),
});

export const FEATURE_MODAL_MEDIA_MOTION = freezeMotion({
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: FEATURE_MOTION.transition('modalExit') },
  transition: FEATURE_MOTION.transition('modalReveal'),
});

export const FEATURE_MODAL_EMPTY_MOTION = freezeMotion({
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98, transition: FEATURE_MOTION.transition('modalExit') },
  transition: FEATURE_MOTION.transition('modalReveal'),
});

export const FEATURE_MODAL_ACTION_MOTION = freezeMotion({
  transition: MOTION_TRANSITION.microSpring,
});

export function getFeatureModalSectionMotion(index = 0) {
  return freezeMotion({
    ...FEATURE_MODAL_SECTION_MOTION,
    transition: withDelay(
      FEATURE_MOTION.transition('modalReveal'),
      getStaggerDelay(index, FEATURE_MOTION.stagger('modalSections'))
    ),
  });
}

export function getFeatureModalItemMotion(index = 0) {
  return freezeMotion({
    layout: 'position',
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.98, transition: FEATURE_MOTION.transition('modalExit') },
    transition: withDelay(
      FEATURE_MOTION.transition('modalReveal'),
      getStaggerDelay(index, FEATURE_MOTION.stagger('modalItems'))
    ),
  });
}

export function getFeatureNavActionItemMotion(index = 0) {
  return freezeMotion({
    ...FEATURE_NAV_ACTION_ITEM_MOTION,
    transition: withDelay(
      FEATURE_MOTION.transition('navActionReveal'),
      getStaggerDelay(index, FEATURE_MOTION.stagger('navActionItems'))
    ),
  });
}

export function getFeatureNavSubmittingMotion(isSubmitting) {
  return freezeMotion(isSubmitting ? { scale: MOTION_SCALE.subtle } : { scale: 1 });
}

export function getSearchResultDelay(index) {
  return getStaggerDelay(index, SEARCH_ACTION_STAGGER);
}

export function getSearchActionItemMotion(index = 0, staggerKey = 'searchResults') {
  return freezeMotion({
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8, transition: SEARCH_ACTION_EXIT_TRANSITION },
    transition: withDelay(SEARCH_ACTION_REVEAL_TRANSITION, getStaggerDelay(index, FEATURE_MOTION.stagger(staggerKey))),
  });
}

export function getFeatureMotionVariant(key, overrides) {
  return FEATURE_MOTION.variant(key, overrides);
}

export function getFeatureMotionTransition(key, overrides) {
  return FEATURE_MOTION.transition(key, overrides);
}

export function getFeatureMotionInteraction(key, overrides) {
  return FEATURE_MOTION.interaction(key, overrides);
}
