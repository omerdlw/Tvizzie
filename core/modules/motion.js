import {
  createContentMotion,
  createFadeMotion,
  createInteractionMotion,
  createMotionRegistry,
  createScaleMotion,
  createSurfaceMotion,
  defineModuleMotion,
  freezeMotion,
  getStaggerDelay,
  mergeMotionConfig,
  MOTION_EASE,
  MOTION_OFFSET,
  MOTION_SCALE,
  MOTION_STAGGER,
  MOTION_TRANSITION,
  withDelay,
} from '@/core/animation';

export const MODULE_MOTION = defineModuleMotion({
  id: 'modules',
  transitions: {
    surface: MOTION_TRANSITION.softSpring,
    content: MOTION_TRANSITION.entrance,
    action: MOTION_TRANSITION.microSpring,
  },
  variants: {
    fade: createFadeMotion({ transition: MOTION_TRANSITION.standard }),
    surface: createSurfaceMotion({ transition: MOTION_TRANSITION.softSpring }),
    content: createContentMotion({ transition: MOTION_TRANSITION.entrance }),
    pop: createScaleMotion({ transition: MOTION_TRANSITION.responsiveSpring }),
  },
  interactions: {
    action: createInteractionMotion({ transition: MOTION_TRANSITION.microSpring }),
  },
});

export const NAV_MODULE_MOTION = defineModuleMotion({
  id: 'nav',
  tokens: {
    blur: {
      backdrop: 'blur(12px)',
      clear: 'blur(0px)',
      card: 'blur(8px)',
    },
    offset: {
      cardExit: 6,
      content: MOTION_OFFSET.sm,
      surface: MOTION_OFFSET.sm,
    },
  },
  transitions: {
    default: freezeMotion({
      type: 'tween',
      duration: 0.3,
      ease: MOTION_EASE.standard,
    }),
    backdrop: freezeMotion({
      type: 'tween',
      duration: 0.36,
      ease: MOTION_EASE.emphasis,
    }),
    card: freezeMotion({
      type: 'spring',
      stiffness: 300,
      damping: 34,
      mass: 0.82,
    }),
    cardWidth: freezeMotion({
      type: 'spring',
      stiffness: 360,
      damping: 32,
      mass: 0.76,
    }),
    container: freezeMotion({
      type: 'spring',
      stiffness: 310,
      damping: 32,
      mass: 0.78,
    }),
    content: freezeMotion({
      type: 'tween',
      duration: 0.24,
      ease: MOTION_EASE.standard,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.18,
      ease: MOTION_EASE.exit,
    }),
    opacity: freezeMotion({
      type: 'tween',
      duration: 0.22,
      ease: MOTION_EASE.standard,
    }),
    filter: freezeMotion({
      type: 'tween',
      duration: 0.26,
      ease: MOTION_EASE.standard,
    }),
    surface: freezeMotion({
      type: 'spring',
      stiffness: 340,
      damping: 36,
      mass: 0.82,
    }),
    surfaceItem: freezeMotion({
      type: 'spring',
      stiffness: 400,
      damping: 34,
      mass: 0.7,
    }),
    action: freezeMotion({
      type: 'spring',
      stiffness: 430,
      damping: 34,
      mass: 0.66,
    }),
    badge: freezeMotion({
      type: 'spring',
      stiffness: 520,
      damping: 32,
      mass: 0.5,
    }),
    searchReveal: freezeMotion({
      type: 'tween',
      duration: 0.38,
      ease: MOTION_EASE.entrance,
    }),
    panelReveal: freezeMotion({
      type: 'tween',
      duration: 0.3,
      ease: MOTION_EASE.entrance,
    }),
  },
  variants: {
    fade: createFadeMotion({ transition: MOTION_TRANSITION.standard }),
    surface: createSurfaceMotion({ transition: 'surface' }),
    content: createContentMotion({ transition: 'content' }),
    pop: createScaleMotion({ transition: 'action' }),
  },
  interactions: {
    action: createInteractionMotion({
      hover: { scale: 1.01 },
      tap: { scale: MOTION_SCALE.subtle },
      transition: 'action',
    }),
    press: createInteractionMotion({
      hover: {},
      tap: { scale: MOTION_SCALE.subtle },
      transition: 'action',
    }),
  },
  sequences: {
    cardStack: MOTION_STAGGER.tight,
    actionGroup: MOTION_STAGGER.tight,
    searchResults: MOTION_STAGGER.standard,
  },
});

export const MODAL_MODULE_MOTION = defineModuleMotion({
  id: 'modal',
  tokens: {
    blur: {
      backdrop: 'blur(48px)',
      clear: 'blur(0px)',
    },
    offset: {
      content: MOTION_OFFSET.sm,
    },
    scale: {
      centerInitial: 0.94,
      edgeInitial: 0.98,
      stacked: 0.985,
      verticalInitial: 0.96,
    },
  },
  transitions: {
    backdrop: freezeMotion({
      type: 'tween',
      duration: 0.32,
      ease: MOTION_EASE.standard,
    }),
    panel: freezeMotion({
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.78,
    }),
    content: freezeMotion({
      type: 'tween',
      duration: 0.28,
      ease: MOTION_EASE.entrance,
    }),
    action: freezeMotion({
      type: 'spring',
      stiffness: 430,
      damping: 34,
      mass: 0.66,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.2,
      ease: MOTION_EASE.exit,
    }),
  },
  variants: {
    fade: createFadeMotion({ transition: 'content' }),
    surface: createSurfaceMotion({ transition: 'panel' }),
    content: createContentMotion({ transition: 'content' }),
  },
  interactions: {
    action: createInteractionMotion({
      hover: { scale: 1.01 },
      tap: { scale: MOTION_SCALE.subtle },
      transition: 'action',
    }),
  },
  sequences: {
    content: MOTION_STAGGER.tight,
  },
});

export const NOTIFICATION_MODULE_MOTION = defineModuleMotion({
  id: 'notification',
  tokens: {
    offset: {
      item: MOTION_OFFSET.sm,
      content: MOTION_OFFSET.xs,
    },
    scale: {
      initial: 0.98,
    },
  },
  transitions: {
    stack: freezeMotion({
      type: 'tween',
      duration: 0.24,
      ease: MOTION_EASE.standard,
    }),
    item: freezeMotion({
      type: 'spring',
      stiffness: 360,
      damping: 34,
      mass: 0.72,
    }),
    content: freezeMotion({
      type: 'tween',
      duration: 0.22,
      ease: MOTION_EASE.standard,
    }),
    action: freezeMotion({
      type: 'spring',
      stiffness: 420,
      damping: 34,
      mass: 0.64,
    }),
    exit: freezeMotion({
      type: 'tween',
      duration: 0.18,
      ease: MOTION_EASE.exit,
    }),
  },
  variants: {
    fade: createFadeMotion({ transition: 'content' }),
    surface: createSurfaceMotion({ transition: 'item' }),
    content: createContentMotion({ transition: 'content' }),
  },
  interactions: {
    action: createInteractionMotion({
      hover: { scale: 1.01 },
      tap: { scale: MOTION_SCALE.subtle },
      transition: 'action',
    }),
  },
  sequences: {
    stack: MOTION_STAGGER.tight,
    actions: MOTION_STAGGER.tight,
  },
});

export const MODULE_MOTION_REGISTRY = createMotionRegistry({
  default: MODULE_MOTION,
  modal: MODAL_MODULE_MOTION,
  nav: NAV_MODULE_MOTION,
  notification: NOTIFICATION_MODULE_MOTION,
});

export const MODAL_MOTION = MODAL_MODULE_MOTION;

export const MODAL_BACKDROP_TRANSITION = MODAL_MOTION.transition('backdrop');
export const MODAL_PANEL_TRANSITION = MODAL_MOTION.transition('panel');
export const MODAL_CONTENT_TRANSITION = MODAL_MOTION.transition('content');
export const MODAL_ACTION_TRANSITION = MODAL_MOTION.transition('action');

export const MODAL_BACKDROP_MOTION = freezeMotion({
  initial: {
    opacity: 0,
    backdropFilter: MODAL_MOTION.tokens.blur.clear,
    WebkitBackdropFilter: MODAL_MOTION.tokens.blur.clear,
  },
  animate: {
    opacity: 1,
    backdropFilter: MODAL_MOTION.tokens.blur.backdrop,
    WebkitBackdropFilter: MODAL_MOTION.tokens.blur.backdrop,
  },
  exit: {
    opacity: 0,
    backdropFilter: MODAL_MOTION.tokens.blur.clear,
    WebkitBackdropFilter: MODAL_MOTION.tokens.blur.clear,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_BACKDROP_TRANSITION,
});

export const MODAL_LAYER_MOTION = freezeMotion({
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: MODAL_MOTION.transition('exit'),
  },
});

export const MODAL_ACTION_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: MODAL_ACTION_TRANSITION,
});

export const MODAL_HEADER_MOTION = freezeMotion({
  initial: { opacity: 0, y: -MODAL_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -MODAL_MOTION.tokens.offset.content,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_CONTENT_TRANSITION,
});

export const MODAL_BODY_MOTION = freezeMotion({
  initial: { opacity: 0, y: MODAL_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: MODAL_MOTION.tokens.offset.content,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_CONTENT_TRANSITION,
});

export const MODAL_FOOTER_MOTION = freezeMotion({
  initial: { opacity: 0, y: MODAL_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: MODAL_MOTION.tokens.offset.content,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_CONTENT_TRANSITION,
});

export const MODAL_TITLE_MOTION = freezeMotion({
  initial: { opacity: 0, y: -MODAL_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -MODAL_MOTION.tokens.offset.content,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_CONTENT_TRANSITION,
});

export const MODAL_LAYER_SWITCHER_MOTION = freezeMotion({
  initial: { opacity: 0, y: MODAL_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: MODAL_MOTION.tokens.offset.content,
    transition: MODAL_MOTION.transition('exit'),
  },
  transition: MODAL_CONTENT_TRANSITION,
});

export function getModalContentMotion(index = 0) {
  return freezeMotion({
    ...MODAL_BODY_MOTION,
    transition: withDelay(MODAL_CONTENT_TRANSITION, getStaggerDelay(index, MODAL_MOTION.stagger('content'))),
  });
}

export const NOTIFICATION_MOTION = NOTIFICATION_MODULE_MOTION;
export const NOTIFICATION_STACK_TRANSITION = NOTIFICATION_MOTION.transition('stack');
export const NOTIFICATION_ITEM_TRANSITION = NOTIFICATION_MOTION.transition('item');
export const NOTIFICATION_CONTENT_TRANSITION = NOTIFICATION_MOTION.transition('content');
export const NOTIFICATION_ACTION_TRANSITION = NOTIFICATION_MOTION.transition('action');

export const NOTIFICATION_STACK_MOTION = freezeMotion({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: NOTIFICATION_MOTION.transition('exit'),
  },
  transition: NOTIFICATION_STACK_TRANSITION,
});

export const NOTIFICATION_CONTENT_MOTION = freezeMotion({
  initial: { opacity: 0, y: NOTIFICATION_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -NOTIFICATION_MOTION.tokens.offset.content,
    transition: NOTIFICATION_MOTION.transition('exit'),
  },
  transition: NOTIFICATION_CONTENT_TRANSITION,
});

export const NOTIFICATION_ACTION_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: NOTIFICATION_ACTION_TRANSITION,
});

export function getNotificationItemMotion(index = 0) {
  void index;

  return freezeMotion({
    layout: 'position',
    initial: {
      opacity: 0,
      y: NOTIFICATION_MOTION.tokens.offset.item,
      scale: NOTIFICATION_MOTION.tokens.scale.initial,
    },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: {
      opacity: 0,
      y: -NOTIFICATION_MOTION.tokens.offset.item,
      scale: NOTIFICATION_MOTION.tokens.scale.initial,
      transition: NOTIFICATION_MOTION.transition('exit'),
    },
    transition: NOTIFICATION_ITEM_TRANSITION,
  });
}

export function getNotificationActionMotion(index = 0) {
  return freezeMotion({
    ...NOTIFICATION_ACTION_MOTION,
    transition: withDelay(
      NOTIFICATION_ACTION_TRANSITION,
      getStaggerDelay(index, NOTIFICATION_MOTION.stagger('actions'))
    ),
  });
}

function getModalPositionProfile(position) {
  if (position === 'left') {
    return {
      initial: { x: '-100%', y: 0, scale: 1, transformOrigin: 'left center' },
      exit: { x: '-100%', y: 0, scale: 1, transformOrigin: 'left center' },
    };
  }

  if (position === 'right') {
    return {
      initial: { x: '100%', y: 0, scale: 1, transformOrigin: 'right center' },
      exit: { x: '100%', y: 0, scale: 1, transformOrigin: 'right center' },
    };
  }

  if (position === 'top') {
    return {
      initial: {
        x: 0,
        y: '-100%',
        scale: MODAL_MOTION.tokens.scale.verticalInitial,
        transformOrigin: 'top center',
      },
      exit: {
        x: 0,
        y: '-100%',
        scale: MODAL_MOTION.tokens.scale.verticalInitial,
        transformOrigin: 'top center',
      },
    };
  }

  if (position === 'bottom') {
    return {
      initial: {
        x: 0,
        y: '100%',
        scale: MODAL_MOTION.tokens.scale.verticalInitial,
        transformOrigin: 'bottom center',
      },
      exit: {
        x: 0,
        y: '100%',
        scale: MODAL_MOTION.tokens.scale.verticalInitial,
        transformOrigin: 'bottom center',
      },
    };
  }

  return {
    initial: {
      x: 0,
      y: 0,
      scale: MODAL_MOTION.tokens.scale.centerInitial,
      transformOrigin: 'center center',
    },
    exit: {
      x: 0,
      y: 0,
      scale: MODAL_MOTION.tokens.scale.centerInitial,
      transformOrigin: 'center center',
    },
  };
}

export function getModalPanelMotion(position, isTopModal = true) {
  const profile = getModalPositionProfile(position);
  const inactiveState = isTopModal
    ? { opacity: 1, scale: 1, x: 0, y: 0, transformOrigin: profile.initial.transformOrigin }
    : { opacity: 0.9, scale: MODAL_MOTION.tokens.scale.stacked, x: 0, y: 0 };

  return freezeMotion({
    initial: {
      opacity: 0,
      ...profile.initial,
    },
    animate: inactiveState,
    exit: {
      opacity: 0,
      ...profile.exit,
      transition: MODAL_MOTION.transition('exit'),
    },
    transition: MODAL_PANEL_TRANSITION,
  });
}

export const NAV_MOTION = NAV_MODULE_MOTION;

export const NAV_DEFAULT_TRANSITION = NAV_MOTION.transition('default');
export const NAV_CONTAINER_SPRING = NAV_MOTION.transition('container');
export const NAV_CARD_WIDTH_SPRING = NAV_MOTION.transition('cardWidth');
export const NAV_MICRO_SPRING = NAV_MOTION.transition('action');
export const NAV_ACTION_SPRING = NAV_MOTION.transition('action');
export const NAV_BADGE_SPRING = NAV_MOTION.transition('badge');
export const NAV_CONTENT_TRANSITION = NAV_MOTION.transition('content');
export const NAV_CARD_OPACITY_TRANSITION = NAV_MOTION.transition('opacity');
export const NAV_CARD_BLUR_TRANSITION = NAV_MOTION.transition('filter');
export const NAV_BACKDROP_TRANSITION = NAV_MOTION.transition('backdrop');
export const NAV_SEARCH_REVEAL_TRANSITION = NAV_MOTION.transition('searchReveal');
export const NAV_SURFACE_SPRING = NAV_MOTION.transition('surface');
export const NAV_SURFACE_ITEM_SPRING = NAV_MOTION.transition('surfaceItem');

export const NAV_CARD_INITIAL = freezeMotion({
  opacity: 0,
  scale: 0.96,
  y: 0,
});

export const NAV_CARD_EXIT = freezeMotion({
  opacity: 0,
  scale: 0.96,
  y: NAV_MOTION.tokens.offset.cardExit,
  transition: NAV_MOTION.transition('exit'),
});

export const NAV_BACKDROP_INITIAL = freezeMotion({
  opacity: 0,
  backdropFilter: NAV_MOTION.tokens.blur.clear,
});

export const NAV_SURFACE_MOTION = freezeMotion({
  initial: { opacity: 0, y: NAV_MOTION.tokens.offset.surface },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -NAV_MOTION.tokens.offset.surface,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_SURFACE_SPRING,
});

export const NAV_BADGE_MOTION = freezeMotion({
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.6, opacity: 0 },
  transition: NAV_BADGE_SPRING,
});

export const NAV_ACTION_GROUP_MOTION = freezeMotion({
  layout: 'position',
  transition: NAV_CONTENT_TRANSITION,
});

export const NAV_ACTION_ITEM_MOTION = freezeMotion({
  layout: 'position',
  initial: { opacity: 0, scale: 0.88, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: {
    opacity: 0,
    scale: 0.88,
    y: -4,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_ACTION_SPRING,
});

export const NAV_ACTION_PANEL_MOTION = freezeMotion({
  layout: 'position',
  initial: { opacity: 0, y: NAV_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -NAV_MOTION.tokens.offset.content,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_MOTION.transition('panelReveal'),
});

export const NAV_DESCRIPTION_MOTION = freezeMotion({
  initial: { opacity: 0, y: NAV_MOTION.tokens.offset.content },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -NAV_MOTION.tokens.offset.content,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_CONTENT_TRANSITION,
});

export const NAV_VIDEO_ICON_MOTION = freezeMotion({
  initial: { opacity: 0, scale: 0.84 },
  animate: { opacity: 1, scale: 1 },
  transition: NAV_MICRO_SPRING,
});

export const NAV_SEARCH_PANEL_MOTION = freezeMotion({
  initial: { opacity: 0, y: -NAV_MOTION.tokens.offset.content, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: {
    opacity: 0,
    y: -NAV_MOTION.tokens.offset.content,
    height: 0,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_SEARCH_REVEAL_TRANSITION,
});

export const NAV_SEARCH_FADE_MOTION = freezeMotion({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: NAV_MOTION.transition('exit'),
  },
  transition: NAV_SEARCH_REVEAL_TRANSITION,
});

export const NAV_BUTTON_TAP_MOTION = freezeMotion({
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: NAV_ACTION_SPRING,
});

export const NAV_BUTTON_INTERACTION_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: NAV_ACTION_SPRING,
});

export const NAV_CARD_INTERACTION_MOTION = freezeMotion({
  whileTap: { scale: MOTION_SCALE.subtle },
});

export const NAV_ICON_OVERLAY_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: NAV_ACTION_SPRING,
});

export const NAV_MEDIA_ACTION_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: MOTION_SCALE.subtle },
  transition: NAV_ACTION_SPRING,
});

export function getNavSubmittingMotion(isSubmitting) {
  return freezeMotion(isSubmitting ? { scale: MOTION_SCALE.subtle } : { scale: 1 });
}

export function getNavDragSurfaceMotion(isActive) {
  return freezeMotion(isActive ? { scale: 1.01 } : { scale: 1 });
}

export function getNavDragIconMotion(isActive) {
  return freezeMotion(isActive ? { scale: 1.03, y: -2 } : { scale: 1, y: 0 });
}

export function getNavCardStaggerDelay(position, expanded) {
  if (!expanded) {
    return 0;
  }

  return getStaggerDelay(position, NAV_MOTION.stagger('cardStack'));
}

export function getNavCardSpring(position = 0) {
  void position;
  return NAV_MOTION.transition('card');
}

export function getNavCardTransition({ position = 0, expanded = false } = {}) {
  const delay = getNavCardStaggerDelay(position, expanded);

  return freezeMotion({
    width: withDelay(NAV_CARD_WIDTH_SPRING, delay),
    y: withDelay(getNavCardSpring(position), delay),
    scale: withDelay(getNavCardSpring(position), delay),
    opacity: withDelay(NAV_CARD_OPACITY_TRANSITION, delay),
    filter: withDelay(NAV_CARD_BLUR_TRANSITION, delay),
    zIndex: { duration: 0, delay },
  });
}

export function getNavCardInteractionMotion(isInteractive = true) {
  if (!isInteractive) {
    return freezeMotion({});
  }

  return NAV_CARD_INTERACTION_MOTION;
}

export function getNavBackdropMotion(isVisible) {
  if (isVisible) {
    return freezeMotion({
      opacity: 1,
      backdropFilter: NAV_MOTION.tokens.blur.backdrop,
      display: 'block',
    });
  }

  return freezeMotion({
    opacity: 0,
    backdropFilter: NAV_MOTION.tokens.blur.clear,
    transitionEnd: { display: 'none' },
  });
}

export function getNavContainerMotion(height) {
  return freezeMotion({ height });
}

export function getNavDescriptionAnimate(opacity) {
  return freezeMotion({
    ...NAV_DESCRIPTION_MOTION.animate,
    opacity,
  });
}

export function getNavMediaProgressMotion(progressRatio = 0) {
  return freezeMotion({
    width: `${Math.max(0, Math.min(Number(progressRatio) || 0, 1)) * 100}%`,
  });
}

export function getNavActionItemMotion(index = 0) {
  return mergeMotionConfig(NAV_ACTION_ITEM_MOTION, {
    transition: withDelay(NAV_ACTION_SPRING, getStaggerDelay(index, NAV_MOTION.stagger('actionGroup'))),
  });
}

export function getNavSearchItemMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: -NAV_MOTION.tokens.offset.content },
    animate: { opacity: 1, y: 0 },
    exit: {
      opacity: 0,
      y: -NAV_MOTION.tokens.offset.content,
      transition: NAV_MOTION.transition('exit'),
    },
    transition: withDelay(
      NAV_SEARCH_REVEAL_TRANSITION,
      getStaggerDelay(index, NAV_MOTION.stagger('searchResults'))
    ),
  });
}

export function getNavDelayedSearchTransition(index = 0) {
  return withDelay(NAV_SEARCH_REVEAL_TRANSITION, getStaggerDelay(index, NAV_MOTION.stagger('searchResults')));
}

export function getModuleMotionVariant(key, overrides) {
  return MODULE_MOTION.variant(key, overrides);
}

export function getModuleMotionTransition(key, overrides) {
  return MODULE_MOTION.transition(key, overrides);
}

export function getModuleMotionInteraction(key, overrides) {
  return MODULE_MOTION.interaction(key, overrides);
}
