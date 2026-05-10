import { MOTION_SCOPE, MOTION_STAGGER, MOTION_TRANSITION, MOTION_VIEWPORT } from './tokens';
import { freezeMotion, getNamedMotionEntry, mergeMotionConfig, withDelay, withStaggerDelay } from './utils';

function normalizeProfileDefinition(definition = {}, scope = MOTION_SCOPE.shared) {
  return {
    id: definition.id || scope,
    scope,
    route: definition.route || null,
    defaults: mergeMotionConfig(
      {
        transition: MOTION_TRANSITION.standard,
        exitTransition: MOTION_TRANSITION.exit,
        viewport: MOTION_VIEWPORT,
        stagger: MOTION_STAGGER.standard,
      },
      definition.defaults
    ),
    tokens: freezeMotion(definition.tokens || {}),
    transitions: mergeMotionConfig(MOTION_TRANSITION, definition.transitions),
    variants: freezeMotion(definition.variants || {}),
    interactions: freezeMotion(definition.interactions || {}),
    sequences: mergeMotionConfig(
      {
        none: MOTION_STAGGER.none,
        tight: MOTION_STAGGER.tight,
        standard: MOTION_STAGGER.standard,
        spacious: MOTION_STAGGER.spacious,
      },
      definition.sequences
    ),
  };
}

function resolveTransition(profile, key, overrides) {
  return mergeMotionConfig(getNamedMotionEntry(profile.transitions, key), overrides);
}

function resolveVariantTransition(profile, motion) {
  const {
    exitTransition,
    exitTransitionKey,
    exitTransitionName,
    transition,
    transitionKey,
    transitionName,
    transitionOverrides,
    ...motionProps
  } = motion;
  const resolvedTransition = typeof transition === 'string' ? profile.transition(transition) : transition;
  const resolvedExitTransition = typeof exitTransition === 'string' ? profile.transition(exitTransition) : exitTransition;
  const fallbackExitTransition = exitTransitionKey || exitTransitionName ? profile.transition(exitTransitionKey || exitTransitionName) : null;
  const exit = motionProps.exit
    ? mergeMotionConfig(motionProps.exit, {
        transition: resolvedExitTransition || fallbackExitTransition || motionProps.exit.transition,
      })
    : motionProps.exit;

  return mergeMotionConfig(motionProps, {
    exit,
    transition: resolvedTransition || profile.transition(transitionKey || transitionName, transitionOverrides),
  });
}

function resolveMotionEntry(collection, profile, key, overrides) {
  return mergeMotionConfig(resolveVariantTransition(profile, getNamedMotionEntry(collection, key)), overrides);
}

export function createMotionProfile(definition = {}) {
  const normalized = normalizeProfileDefinition(definition, definition.scope);
  const data = freezeMotion(normalized);

  const profile = {
    ...data,
    transition: (key, overrides) => resolveTransition(profile, key, overrides),
    transitionWithDelay: (key, delay = 0, overrides) => withDelay(resolveTransition(profile, key, overrides), delay),
    variant: (key, overrides) => resolveMotionEntry(profile.variants, profile, key, overrides),
    interaction: (key, overrides) => resolveMotionEntry(profile.interactions, profile, key, overrides),
    stagger: (key = 'standard') => getNamedMotionEntry(profile.sequences, key),
    staggerDelay: (index = 0, key = 'standard', transitionKey = 'standard', overrides) =>
      withStaggerDelay(resolveTransition(profile, transitionKey, overrides), index, profile.stagger(key)),
  };

  return freezeMotion(profile);
}

export function defineRouteMotion(definition = {}) {
  return createMotionProfile({
    ...definition,
    scope: MOTION_SCOPE.route,
  });
}

export function defineModuleMotion(definition = {}) {
  return createMotionProfile({
    ...definition,
    scope: MOTION_SCOPE.module,
  });
}

export function defineFeatureMotion(definition = {}) {
  return createMotionProfile({
    ...definition,
    scope: MOTION_SCOPE.feature,
  });
}

export function createMotionRegistry(entries = {}) {
  const registry = freezeMotion(entries);

  return freezeMotion({
    entries: registry,
    get: (key) => registry[key] || null,
    require: (key) => {
      const entry = registry[key];

      if (!entry) {
        throw new Error(`Motion profile "${key}" is not registered.`);
      }

      return entry;
    },
  });
}
