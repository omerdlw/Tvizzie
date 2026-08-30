import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';

import { NAVIGATION_EVENTS, NAVIGATION_LIFECYCLE, NAV_SURFACE_RENDER_MODE } from './constants';
import { isValidComponentType, resolveComponentType, resolveRenderableContent } from './utils';
import { NAV_COMPACT_TO_SURFACE_DELAY_MS, NAV_SURFACE_EXIT_SETTLE_MS } from './motion';
import {
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_SURFACE_TRANSITION,
  slideFadeVariants,
} from './motion';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Iconify from '@/ui/primitives/icon';

/**
 * Determines whether a value can represent a structured surface descriptor.
 * @param {*} value - Candidate surface descriptor
 * @returns {boolean} Whether the value is a structured descriptor
 */
export function isSurfaceDescriptor(value) {
  return (
    value != null && typeof value === 'object' && !Array.isArray(value) && !isValidElement(value)
  );
}

function normalizeSurfaceDefinition(
  input,
  config = {},
  { allowPrimitiveContent = false, defaultShowAction = false } = {},
) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (isValidComponentType(input.component) ||
      'content' in input ||
      'node' in input ||
      'element' in input ||
      (Array.isArray(input.steps) && input.steps.length > 0))
      ? input
      : null;

  const configuredSteps = descriptor?.steps ?? config?.steps;
  const steps =
    Array.isArray(configuredSteps) && configuredSteps.length > 0 ? configuredSteps : null;
  const firstStep = steps?.[0] ?? null;
  const component = resolveComponentType(
    descriptor?.component,
    descriptor ? null : input,
    firstStep?.component,
    firstStep,
  );
  const explicitContent = resolveRenderableContent(
    descriptor?.content,
    descriptor?.node,
    descriptor?.element,
    firstStep?.content,
    firstStep?.node,
    firstStep?.element,
  );
  const fallbackContent =
    !descriptor && !component && (isValidElement(input) || (allowPrimitiveContent && input != null))
      ? input
      : null;
  const content = explicitContent ?? fallbackContent;

  if (!component && content == null && !steps) return null;

  const directComponentInput = !descriptor && isValidComponentType(input);
  return {
    renderMode: component ? NAV_SURFACE_RENDER_MODE.COMPONENT : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : (content ?? input),
    props: component
      ? descriptor?.props && typeof descriptor.props === 'object'
        ? descriptor.props
        : directComponentInput
          ? config
          : {}
      : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction: descriptor?.showAction ?? config?.showAction ?? defaultShowAction,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
    icon:
      descriptor?.icon ?? descriptor?.header?.icon ?? config?.icon ?? config?.header?.icon ?? null,
    title:
      descriptor?.title ??
      descriptor?.header?.title ??
      config?.title ??
      config?.header?.title ??
      null,
    description:
      descriptor?.description ??
      descriptor?.header?.description ??
      config?.description ??
      config?.header?.description ??
      null,
    descriptionMaxLines: descriptor?.descriptionMaxLines ?? config?.descriptionMaxLines ?? 2,
    trailing: descriptor?.trailing ?? config?.trailing ?? null,
    headerAction: descriptor?.headerAction ?? config?.headerAction ?? null,
    closeLabel: descriptor?.closeLabel ?? config?.closeLabel ?? null,
    expandHorizontal: descriptor?.expandHorizontal ?? config?.expandHorizontal ?? false,
    width: descriptor?.width ?? config?.width ?? null,
    allowSwipeDismiss: descriptor?.allowSwipeDismiss ?? config?.allowSwipeDismiss ?? true,
    steps,
    currentStepIndex: descriptor?.currentStepIndex ?? config?.currentStepIndex ?? 0,
    syncWithUrl: descriptor?.syncWithUrl ?? config?.syncWithUrl ?? false,
    urlKey: descriptor?.urlKey ?? config?.urlKey ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
  };
}

/**
 * Normalizes component, node, or step input into a surface definition.
 * @param {*} input - Component, node, or descriptor
 * @param {object} [config] - Fallback surface configuration
 * @returns {object|null} Normalized surface definition
 */
export function createSurfaceEntryDefinition(input, config = {}) {
  return normalizeSurfaceDefinition(input, config);
}

/**
 * Normalizes an inline route surface while preserving inherited action behavior.
 * @param {*} surface - Inline route surface value
 * @returns {object|null} Normalized inline surface
 */
export function createInlineSurfaceEntry(surface) {
  return normalizeSurfaceDefinition(
    surface,
    {},
    { allowPrimitiveContent: true, defaultShowAction: null },
  );
}

/**
 * Resolves surface action precedence against the owning route item.
 * @param {object} item - Owning navigation item
 * @param {object} surfaceEntry - Resolved surface definition
 * @returns {*} Resolved action or null
 */
export function resolveSurfaceAction(item, surfaceEntry) {
  if (surfaceEntry?.action != null) return surfaceEntry.action;
  if (surfaceEntry?.showAction === true) return item.action ?? null;
  if (surfaceEntry?.showAction === false) return null;
  return item.action ?? null;
}

/**
 * Resolves the active step and merged metadata for a multi-step surface.
 * @param {object} surfaceEntry - Surface definition and current step index
 * @returns {object|null} Resolved surface step
 */
export function resolveActiveStepDefinition(surfaceEntry) {
  if (!surfaceEntry) return null;

  const steps = surfaceEntry.steps;
  if (!Array.isArray(steps) || steps.length === 0) return surfaceEntry;

  const requestedIndex = Number(surfaceEntry.currentStepIndex);
  const currentIndex = Math.max(
    0,
    Math.min(Number.isInteger(requestedIndex) ? requestedIndex : 0, steps.length - 1),
  );
  const step = steps[currentIndex];
  if (!step) return surfaceEntry;

  const stepComponent = resolveComponentType(step?.component, step, surfaceEntry.component);
  const stepContent = resolveRenderableContent(
    step?.content,
    step?.node,
    step?.element,
    surfaceEntry.content,
  );
  return {
    ...surfaceEntry,
    component: stepComponent,
    content: stepContent,
    props: {
      ...(surfaceEntry.props || {}),
      ...(step.props && typeof step.props === 'object' ? step.props : {}),
    },
    icon: step.icon ?? step.header?.icon ?? surfaceEntry.icon,
    title: step.title ?? step.header?.title ?? surfaceEntry.title,
    description: step.description ?? step.header?.description ?? surfaceEntry.description,
    descriptionMaxLines: step.descriptionMaxLines ?? surfaceEntry.descriptionMaxLines ?? 2,
    trailing: step.trailing ?? surfaceEntry.trailing,
    headerAction: step.headerAction ?? surfaceEntry.headerAction,
    action: step.action ?? surfaceEntry.action,
    showAction: step.showAction ?? surfaceEntry.showAction,
    closeLabel: step.closeLabel ?? surfaceEntry.closeLabel,
    stepIndex: currentIndex,
    totalSteps: steps.length,
    canGoBack: currentIndex > 0,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
  };
}

/**
 * Creates a cancellable scheduler for delayed surface openings.
 * @param {object} [options] - Injectable timer functions
 * @returns {object} Pending-surface scheduler
 */
export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduleTimer = setTimeout,
} = {}) {
  const timers = new Map();

  const cancel = (surfaceId) => {
    if (!timers.has(surfaceId)) return false;
    clearTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };

  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId, callback, delayMs) {
      cancel(surfaceId);
      const timerId = scheduleTimer(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}

/** Creates the shared navigation/surface lifecycle state. */
export function createNavigationMachineState() {
  return {
    expanded: false,
    isCompact: false,
    surfaceIds: [],
    surfaceLifecycle: NAVIGATION_LIFECYCLE.IDLE,
  };
}

/** Applies a navigation or surface lifecycle transition. */
export function navigationStateReducer(state, action) {
  switch (action?.type) {
    case NAVIGATION_EVENTS.COLLAPSE:
      return state.expanded ? { ...state, expanded: false } : state;
    case NAVIGATION_EVENTS.EXPAND:
      return state.expanded ? state : { ...state, expanded: true };
    case NAVIGATION_EVENTS.SET_EXPANDED: {
      const value =
        typeof action.value === 'function' ? action.value(state.expanded) : action.value;
      return state.expanded === Boolean(value) ? state : { ...state, expanded: Boolean(value) };
    }
    case NAVIGATION_EVENTS.TOGGLE:
      return { ...state, expanded: !state.expanded };
    case NAVIGATION_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(action.value)
        ? state
        : { ...state, isCompact: Boolean(action.value) };
    case NAVIGATION_EVENTS.OPEN_SURFACE:
      if (action.surfaceId == null || state.surfaceIds.includes(action.surfaceId)) return state;
      return {
        ...state,
        expanded: false,
        surfaceIds: [...state.surfaceIds, action.surfaceId],
        surfaceLifecycle: NAVIGATION_LIFECYCLE.OPENING,
      };
    case NAVIGATION_EVENTS.SURFACE_MOUNTED:
      return state.surfaceLifecycle === NAVIGATION_LIFECYCLE.OPENING
        ? { ...state, surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN }
        : state;
    case NAVIGATION_EVENTS.CLOSE_SURFACE: {
      const surfaceIds = state.surfaceIds.filter((id) => id !== action.surfaceId);
      if (surfaceIds.length === state.surfaceIds.length) return state;
      return {
        ...state,
        surfaceIds,
        surfaceLifecycle: surfaceIds.length
          ? NAVIGATION_LIFECYCLE.OPEN
          : NAVIGATION_LIFECYCLE.CLOSING,
      };
    }
    case NAVIGATION_EVENTS.CLOSE_ALL_SURFACES:
      return state.surfaceIds.length
        ? { ...state, surfaceIds: [], surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING }
        : state;
    default:
      return state;
  }
}

function resolveSurfaceEntry(entry, payloadMap) {
  if (!entry) return null;
  return { ...(payloadMap?.get(entry.payloadId) || {}), ...entry };
}

function createSurfaceState(surfaceStack = [], payloadMap = null) {
  const activeSurface = resolveSurfaceEntry(surfaceStack[surfaceStack.length - 1], payloadMap);
  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: surfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack,
  };
}

function createSurfaceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getSurfaceUrlValue(surfaceEntry) {
  return typeof surfaceEntry?.syncWithUrl === 'string'
    ? surfaceEntry.syncWithUrl
    : surfaceEntry?.urlKey || 'open';
}

function syncSurfaceUrl(surfaceEntry, isOpening, urlState = null) {
  if (typeof window === 'undefined' || (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey))
    return;
  try {
    const url = new URL(window.location.href);
    if (isOpening) {
      const value = getSurfaceUrlValue(surfaceEntry);
      if (urlState) urlState.previousValue = url.searchParams.get('surface');
      url.searchParams.set('surface', value);
      window.history.pushState(
        { ...window.history.state, navSurface: { value } },
        '',
        url.toString(),
      );
      return;
    }
    if (urlState?.value && url.searchParams.get('surface') !== urlState.value) return;
    if (urlState?.previousValue) url.searchParams.set('surface', urlState.previousValue);
    else url.searchParams.delete('surface');
    const state = { ...window.history.state };
    if (state.navSurface?.value === urlState?.value) delete state.navSurface;
    window.history.replaceState(state, '', url.toString());
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')
      console.warn('[Navigation] Surface URL synchronization failed:', error);
  }
}

function getTargetSurfaceId(surfaceStack, targetSurfaceId = null) {
  return targetSurfaceId || surfaceStack[surfaceStack.length - 1]?.id || null;
}

function findSurfaceEntry(surfaceStack, surfaceId) {
  return surfaceStack.find((entry) => entry.id === surfaceId) || null;
}

function updateSurfaceStackEntry(surfaceStack, surfaceId, updateEntry) {
  return surfaceStack.map((entry) => (entry.id === surfaceId ? updateEntry(entry) : entry));
}

function createSurfaceRuntimeEntry(surfaceId, definition) {
  const {
    onClose,
    component,
    content,
    props,
    action,
    showAction,
    steps,
    trailing,
    headerAction,
    title,
    description,
    icon,
    closeLabel,
    ...surfaceMetadata
  } = definition;
  const payloadId = `surface-payload-${surfaceId}`;
  return {
    payload: {
      component,
      content,
      props,
      action,
      showAction,
      steps,
      trailing,
      headerAction,
      title,
      description,
      icon,
      closeLabel,
      onClose,
    },
    surfaceEntry: { id: surfaceId, payloadId, ...surfaceMetadata },
  };
}

function releaseSurfaceResources({
  result,
  surfaceEntryMap,
  surfaceId,
  surfaceOnCloseMap,
  surfacePayloadMap,
  surfaceResolveMap,
  surfaceUrlStateMap,
}) {
  const targetEntry = surfaceEntryMap.get(surfaceId);
  if (targetEntry) {
    syncSurfaceUrl(targetEntry, false, surfaceUrlStateMap.get(surfaceId));
    surfacePayloadMap.delete(targetEntry.payloadId);
  }
  surfaceEntryMap.delete(surfaceId);
  surfaceUrlStateMap.delete(surfaceId);
  const onClose = surfaceOnCloseMap.get(surfaceId);
  if (typeof onClose === 'function') {
    try {
      onClose(result);
    } catch (error) {
      console.error('Nav surface onClose handler failed:', error);
    }
  }
  surfaceOnCloseMap.delete(surfaceId);
  const resolve = surfaceResolveMap.get(surfaceId);
  if (typeof resolve === 'function') resolve(result);
  surfaceResolveMap.delete(surfaceId);
}
const initialSurfaceState = createSurfaceState([]);

export function useSurfaceStack({ setCompactLock, setExpanded, setSearchQuery }) {
  const [surfaceState, setSurfaceState] = useState(initialSurfaceState);
  const [navigationMachine, dispatchNavigation] = useReducer(
    navigationStateReducer,
    undefined,
    createNavigationMachineState,
  );

  const surfaceStackRef = useRef([]);
  const surfacePayloadMapRef = useRef(new Map());
  const surfaceEntryMapRef = useRef(new Map());
  const surfaceResolveMapRef = useRef(new Map());
  const surfaceOnCloseMapRef = useRef(new Map());
  const surfaceUrlStateMapRef = useRef(new Map());
  const surfaceIdRef = useRef(0);
  const isCompactRef = useRef(false);
  const wasCompactRef = useRef(false);
  const compactUnlockTimerRef = useRef(null);
  const pendingSurfaceSchedulerRef = useRef(null);

  if (pendingSurfaceSchedulerRef.current === null) {
    pendingSurfaceSchedulerRef.current = createPendingSurfaceScheduler();
  }

  const setIsCompact = useCallback((compactVal) => {
    isCompactRef.current = compactVal;
    dispatchNavigation({ type: NAVIGATION_EVENTS.SET_COMPACT, value: compactVal });
  }, []);

  const syncSurfaceStack = useCallback((nextStack) => {
    surfaceStackRef.current = nextStack;
    setSurfaceState(createSurfaceState(nextStack, surfacePayloadMapRef.current));
  }, []);

  const finalizeSurfaceClose = useCallback((surfaceId, result) => {
    releaseSurfaceResources({
      result,
      surfaceEntryMap: surfaceEntryMapRef.current,
      surfaceId,
      surfaceOnCloseMap: surfaceOnCloseMapRef.current,
      surfacePayloadMap: surfacePayloadMapRef.current,
      surfaceResolveMap: surfaceResolveMapRef.current,
      surfaceUrlStateMap: surfaceUrlStateMapRef.current,
    });
    dispatchNavigation({ type: NAVIGATION_EVENTS.CLOSE_SURFACE, surfaceId });
  }, []);

  const unlockCompactAfterSurfaceClose = useCallback(() => {
    if (!wasCompactRef.current) {
      return;
    }

    if (compactUnlockTimerRef.current !== null) {
      clearTimeout(compactUnlockTimerRef.current);
    }

    compactUnlockTimerRef.current = setTimeout(() => {
      compactUnlockTimerRef.current = null;
      wasCompactRef.current = false;
      setCompactLock('surface-opening', false);
    }, NAV_SURFACE_EXIT_SETTLE_MS);
  }, [setCompactLock]);

  const handleSurfaceAnimationComplete = useCallback(
    (definition) => {
      if (definition !== 'exit' || !wasCompactRef.current) return;
      if (compactUnlockTimerRef.current !== null) {
        clearTimeout(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      wasCompactRef.current = false;
      setCompactLock('surface-opening', false);
    },
    [setCompactLock],
  );

  const pushStep = useCallback(
    (stepInput, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const nextStack = updateSurfaceStackEntry(currentStack, activeSurfaceId, (entry) => {
        const resolvedEntry = resolveSurfaceEntry(entry, surfacePayloadMapRef.current);
        const initialStep = {
          component: resolvedEntry.component,
          content: resolvedEntry.content,
          props: resolvedEntry.props,
          title: resolvedEntry.title,
          description: resolvedEntry.description,
          icon: resolvedEntry.icon,
          trailing: resolvedEntry.trailing,
          headerAction: resolvedEntry.headerAction,
          action: resolvedEntry.action,
          showAction: resolvedEntry.showAction,
          closeLabel: resolvedEntry.closeLabel,
        };
        const currentSteps =
          Array.isArray(resolvedEntry.steps) && resolvedEntry.steps.length > 0
            ? [...resolvedEntry.steps]
            : [initialStep];
        const nextSteps = [...currentSteps, stepInput];
        const nextIndex = nextSteps.length - 1;
        surfacePayloadMapRef.current.set(entry.payloadId, {
          ...surfacePayloadMapRef.current.get(entry.payloadId),
          steps: nextSteps,
        });
        return {
          ...entry,
          currentStepIndex: nextIndex,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const popStep = useCallback(
    (targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const targetEntry = findSurfaceEntry(currentStack, activeSurfaceId);
      const resolvedTargetEntry = resolveSurfaceEntry(targetEntry, surfacePayloadMapRef.current);
      if (!resolvedTargetEntry?.steps || (resolvedTargetEntry.currentStepIndex || 0) <= 0) {
        return;
      }

      const nextStack = updateSurfaceStackEntry(currentStack, activeSurfaceId, (entry) => {
        return {
          ...entry,
          currentStepIndex: (entry.currentStepIndex || 0) - 1,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const goToStep = useCallback(
    (index, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const targetEntry = findSurfaceEntry(currentStack, activeSurfaceId);
      const resolvedTargetEntry = resolveSurfaceEntry(targetEntry, surfacePayloadMapRef.current);
      const stepIndex = Number(index);
      if (
        !resolvedTargetEntry?.steps ||
        !Number.isInteger(stepIndex) ||
        stepIndex < 0 ||
        stepIndex >= resolvedTargetEntry.steps.length
      ) {
        return;
      }

      const nextStack = updateSurfaceStackEntry(currentStack, activeSurfaceId, (entry) => {
        return {
          ...entry,
          currentStepIndex: stepIndex,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const pendingScheduler = pendingSurfaceSchedulerRef.current;
      const pendingSurfaceId = pendingScheduler.getLatestId();
      const activeSurfaceId = currentStack[currentStack.length - 1]?.id || null;
      const latestSurfaceId =
        pendingSurfaceId && (!activeSurfaceId || pendingSurfaceId > activeSurfaceId)
          ? pendingSurfaceId
          : activeSurfaceId;
      const surfaceId = targetSurfaceId || latestSurfaceId;

      if (!surfaceId) {
        return;
      }

      if (pendingScheduler.cancel(surfaceId)) {
        finalizeSurfaceClose(surfaceId, result);

        if (currentStack.length === 0 && pendingScheduler.size === 0) {
          unlockCompactAfterSurfaceClose();
        }
        return;
      }

      const surfaceToClose = findSurfaceEntry(currentStack, surfaceId);

      if (!surfaceToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== surfaceId);
      finalizeSurfaceClose(surfaceId, result);
      syncSurfaceStack(nextStack);

      if (nextStack.length === 0 && pendingScheduler.size === 0) {
        unlockCompactAfterSurfaceClose();
      }
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const goBackSurface = useCallback(() => {
    const currentStack = surfaceStackRef.current;
    const activeEntry = currentStack[currentStack.length - 1];

    if (!activeEntry) return;

    if ((activeEntry.currentStepIndex || 0) > 0) {
      popStep(activeEntry.id);
      return;
    }

    if (currentStack.length > 1) {
      closeSurface(null, activeEntry.id);
    }
  }, [closeSurface, popStep]);

  const closeAllSurfaces = useCallback(
    (result = null) => {
      const currentStack = [...surfaceStackRef.current];
      const pendingSurfaceIds = pendingSurfaceSchedulerRef.current.cancelAll();

      if (currentStack.length === 0 && pendingSurfaceIds.length === 0) {
        return;
      }

      currentStack.forEach((entry) => {
        finalizeSurfaceClose(entry.id, result);
      });
      pendingSurfaceIds.forEach((surfaceId) => {
        finalizeSurfaceClose(surfaceId, result);
      });

      dispatchNavigation({ type: NAVIGATION_EVENTS.CLOSE_ALL_SURFACES });

      if (currentStack.length > 0) {
        syncSurfaceStack([]);
      }

      unlockCompactAfterSurfaceClose();
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const openSurface = useCallback(
    (input, config = {}) => {
      const definition = createSurfaceEntryDefinition(input, config);

      if (!definition) {
        const error = createSurfaceError(
          'NAV_SURFACE_INVALID_COMPONENT',
          'Nav surface input is invalid',
        );
        console.error(error);
        return Promise.resolve({
          success: false,
          error,
        });
      }

      const surfaceId = ++surfaceIdRef.current;
      const { payload, surfaceEntry } = createSurfaceRuntimeEntry(surfaceId, definition);
      surfacePayloadMapRef.current.set(surfaceEntry.payloadId, payload);
      surfaceEntryMapRef.current.set(surfaceId, surfaceEntry);

      setExpanded(false);
      setSearchQuery('');

      const runOpen = () => {
        const urlState = { value: getSurfaceUrlValue(surfaceEntry), previousValue: null };
        surfaceUrlStateMapRef.current.set(surfaceId, urlState);
        syncSurfaceUrl(surfaceEntry, true, urlState);
        dispatchNavigation({ type: NAVIGATION_EVENTS.OPEN_SURFACE, surfaceId });
        syncSurfaceStack([...surfaceStackRef.current, surfaceEntry]);
        dispatchNavigation({ type: NAVIGATION_EVENTS.SURFACE_MOUNTED });
      };

      const resultPromise = new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, payload.onClose || null);
      });

      if (isCompactRef.current) {
        if (compactUnlockTimerRef.current !== null) {
          clearTimeout(compactUnlockTimerRef.current);
          compactUnlockTimerRef.current = null;
        }

        wasCompactRef.current = true;
        setCompactLock('surface-opening', true);
        pendingSurfaceSchedulerRef.current.schedule(
          surfaceId,
          runOpen,
          NAV_COMPACT_TO_SURFACE_DELAY_MS,
        );
      } else {
        runOpen();
      }

      return resultPromise;
    },
    [setCompactLock, setExpanded, setSearchQuery, syncSurfaceStack],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = () => {
      const activeEntry = surfaceStackRef.current[surfaceStackRef.current.length - 1];
      if (!activeEntry?.syncWithUrl && !activeEntry?.urlKey) return;
      const expectedValue = getSurfaceUrlValue(activeEntry);
      if (new URL(window.location.href).searchParams.get('surface') === expectedValue) return;

      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: 'browser-back',
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeAllSurfaces]);

  useEffect(() => {
    const pendingScheduler = pendingSurfaceSchedulerRef.current;
    const resolveMap = surfaceResolveMapRef.current;
    const payloadMap = surfacePayloadMapRef.current;
    const entryMap = surfaceEntryMapRef.current;
    const onCloseMap = surfaceOnCloseMapRef.current;
    const urlStateMap = surfaceUrlStateMapRef.current;

    return () => {
      if (compactUnlockTimerRef.current !== null) {
        clearTimeout(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }

      const surfaceIds = [
        ...surfaceStackRef.current.map((entry) => entry.id),
        ...pendingScheduler.cancelAll(),
      ];
      const result = {
        cancelled: true,
        reason: 'unmount',
        success: false,
      };

      surfaceIds.forEach((surfaceId) => {
        releaseSurfaceResources({
          result,
          surfaceEntryMap: entryMap,
          surfaceId,
          surfaceOnCloseMap: onCloseMap,
          surfacePayloadMap: payloadMap,
          surfaceResolveMap: resolveMap,
          surfaceUrlStateMap: urlStateMap,
        });
      });

      surfaceStackRef.current = [];
      payloadMap.clear();
      entryMap.clear();
    };
  }, []);

  return {
    closeAllSurfaces,
    closeSurface,
    goBackSurface,
    goToStep,
    handleSurfaceAnimationComplete,
    isCompact: navigationMachine.isCompact,
    openSurface,
    popStep,
    pushStep,
    setIsCompact,
    surfaceState: {
      ...surfaceState,
      surfaceLifecycle: navigationMachine.surfaceLifecycle,
    },
  };
}
const SurfaceHeaderContext = createContext(null);

/**
 * Returns the current surface header updater when rendered inside a surface.
 * @returns {Function|null} Surface header updater
 */
export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}

/**
 * Renders a standardized control for surface headers.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export function NavSurfaceHeaderButton({
  children,
  className = '',
  disabled = false,
  onClick,
  ariaLabel,
}) {
  return (
    <Button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'center relative h-8 shrink-0 cursor-pointer gap-1 rounded-xl bg-white/5 px-2.5 text-xs font-bold whitespace-nowrap text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </Button>
  );
}

/**
 * Renders surface title, metadata, actions, back, and close controls.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export function NavSurfaceHeader({
  icon = null,
  title = '',
  description = '',
  trailing = null,
  headerAction = null,
  onClose = null,
  onBack = null,
  stepIndex = 0,
  totalSteps = 1,
  badge = null,
  closeLabel = 'Close surface',
  backLabel = 'Previous step',
  descriptionMaxLines = 2,
  className = '',
}) {
  const hasHeaderAction = Boolean(headerAction);
  const hasClose = typeof onClose === 'function';
  const hasBack = typeof onBack === 'function';
  const controlCount = [hasHeaderAction, hasBack, hasClose].filter(Boolean).length;

  const renderedHeaderAction = useMemo(() => {
    if (!hasHeaderAction) return null;
    if (isValidElement(headerAction)) {
      return cloneElement(headerAction, {
        className: cn(
          headerAction.props?.className,
          hasClose ? 'rounded-l-[20px] rounded-r-none' : 'rounded-[20px]',
        ),
      });
    }
    return headerAction;
  }, [hasClose, hasHeaderAction, headerAction]);

  const stepIndicatorText = totalSteps > 1 ? `Step ${stepIndex + 1} of ${totalSteps}` : null;

  return (
    <div
      className={cn('relative flex w-full min-w-0 items-start justify-between gap-2.5', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        {icon ? (
          <div className="center relative size-12 shrink-0">
            {typeof icon === 'string' ? <Iconify icon={icon} size={24} /> : icon}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <h3 className="truncate text-base font-bold text-white">{title}</h3>
              {badge ? (
                <span className="center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {badge}
                </span>
              ) : stepIndicatorText ? (
                <span className="text-xs font-semibold text-white/40">• {stepIndicatorText}</span>
              ) : null}
            </div>
            {description ? (
              <p
                className="text-sm leading-snug text-white/70"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: descriptionMaxLines,
                  overflow: 'hidden',
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
      </div>

      {controlCount ? (
        <div
          className={cn(
            'flex shrink-0 items-center self-start',
            controlCount > 1 ? 'gap-[1px]' : 'gap-1',
          )}
        >
          {renderedHeaderAction}
          {hasBack ? (
            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBack();
              }}
              className={cn(
                'center relative size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10',
                hasClose ? 'rounded-l-[20px] rounded-r-none' : 'rounded-[20px]',
                hasHeaderAction ? 'rounded-l-none' : '',
              )}
              aria-label={backLabel}
            >
              <Iconify icon="solar:alt-arrow-left-bold" size={16} />
            </Button>
          ) : null}
          {hasClose ? (
            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className={cn(
                'center relative size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10',
                controlCount > 1 ? 'rounded-l-none rounded-r-[20px]' : 'rounded-[20px]',
              )}
              aria-label={closeLabel}
            >
              <Iconify icon="material-symbols:close-rounded" size={16} />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Provides surface header state, swipe dismissal, and entry or exit motion.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavSurfaceShell = forwardRef(function NavSurfaceShell(
  {
    icon = null,
    title = '',
    description = '',
    trailing = null,
    headerAction = null,
    onClose = null,
    onBack = null,
    stepIndex = 0,
    totalSteps = 1,
    badge = null,
    allowSwipeDismiss = true,
    closeLabel = 'Close surface',
    backLabel = 'Previous step',
    descriptionMaxLines = 2,
    className = '',
    contentClassName = '',
    children,
    onAnimationComplete = null,
  },
  ref,
) {
  const [headerState, setHeaderState] = useState({
    icon,
    title,
    description,
    trailing,
    headerAction,
    onBack,
    stepIndex,
    totalSteps,
    badge,
  });

  useEffect(() => {
    setHeaderState((previousState) => ({
      ...previousState,
      icon,
      title,
      description,
      trailing,
      headerAction,
      onBack,
      stepIndex,
      totalSteps,
      badge,
    }));
  }, [badge, description, headerAction, icon, onBack, stepIndex, title, totalSteps, trailing]);

  const handleDragEnd = (_event, info) => {
    if (!allowSwipeDismiss || typeof onClose !== 'function') return;
    if (info.offset.y > 65 || info.velocity.y > 400) {
      onClose();
    }
  };

  return (
    <SurfaceHeaderContext.Provider value={setHeaderState}>
      <motion.section
        ref={ref}
        className={cn('relative flex flex-col gap-2.5 overflow-visible', className)}
        variants={slideFadeVariants}
        initial={false}
        animate="visible"
        exit="exit"
        transition={NAV_SURFACE_TRANSITION}
        drag={allowSwipeDismiss && typeof onClose === 'function' ? 'y' : false}
        dragConstraints={NAV_SURFACE_DRAG_CONSTRAINTS}
        dragElastic={NAV_SURFACE_DRAG_ELASTIC}
        onDragEnd={handleDragEnd}
        onAnimationComplete={onAnimationComplete}
      >
        <div className="w-full">
          <NavSurfaceHeader
            descriptionMaxLines={descriptionMaxLines}
            description={headerState.description}
            trailing={headerState.trailing}
            headerAction={headerState.headerAction}
            title={headerState.title}
            icon={headerState.icon}
            onBack={headerState.onBack || onBack}
            stepIndex={headerState.stepIndex ?? stepIndex}
            totalSteps={headerState.totalSteps ?? totalSteps}
            badge={headerState.badge ?? badge}
            closeLabel={closeLabel}
            backLabel={backLabel}
            onClose={onClose}
          />
        </div>
        <div className={cn('w-full overflow-visible', contentClassName)}>{children}</div>
      </motion.section>
    </SurfaceHeaderContext.Provider>
  );
});
