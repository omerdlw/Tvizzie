'use client';

import { Children, cloneElement, isValidElement, useMemo, useRef } from 'react';

// ── Config stabilization and instance scoping ─────────────────────────────────

export function useStableDiff(value, compareFn) {
  const ref = useRef(value);

  if (!compareFn(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

function createStableFunctionEntry(fn) {
  const entry = {
    current: fn,
    stable(...args) {
      return entry.current?.apply(this, args);
    },
  };

  return entry;
}

function isDirectRegistryComponentPath(path) {
  return /^config\.(modal|modals)\.[^.[]+$/.test(path);
}

function isReactNodeLike(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    isValidElement(value)
  );
}

function isStabilizableObject(value) {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !isValidElement(value)
  );
}

function hasSameObjectKeys(previousValue, nextValue) {
  if (!isStabilizableObject(previousValue) || !isStabilizableObject(nextValue)) {
    return false;
  }

  const previousKeys = Object.keys(previousValue);
  const nextKeys = Object.keys(nextValue);
  if (previousKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => Object.prototype.hasOwnProperty.call(previousValue, key));
}

function stabilizeRegistryValue(value, path, functionEntries, usedPaths, previousValue) {
  if (typeof value === 'function') {
    const isComponent = value.name && /^[A-Z]/.test(value.name);

    if (isComponent || isDirectRegistryComponentPath(path)) {
      return value;
    }

    usedPaths.add(path);

    let entry = functionEntries.get(path);

    if (!entry) {
      entry = createStableFunctionEntry(value);
      functionEntries.set(path, entry);
    } else {
      entry.current = value;
    }

    return entry.stable;
  }

  if (isValidElement(value)) {
    const nextProps = stabilizeRegistryValue(
      value.props,
      `${path}.props`,
      functionEntries,
      usedPaths,
      isValidElement(previousValue) ? previousValue.props : undefined,
    );

    if (
      isValidElement(previousValue) &&
      previousValue.type === value.type &&
      previousValue.key === value.key &&
      previousValue.props === nextProps
    ) {
      return previousValue;
    }

    return cloneElement(value, nextProps);
  }

  if (Array.isArray(value)) {
    const nextValue = value.every(isReactNodeLike) ? Children.toArray(value) : value;
    const previousArray = Array.isArray(previousValue) ? previousValue : null;
    let hasChanged = !previousArray || previousArray.length !== nextValue.length;

    const stabilizedValue = nextValue.map((item, index) => {
      const nextItem = stabilizeRegistryValue(
        item,
        `${path}[${index}]`,
        functionEntries,
        usedPaths,
        previousArray?.[index],
      );
      if (!previousArray || nextItem !== previousArray[index]) {
        hasChanged = true;
      }
      return nextItem;
    });

    return !hasChanged ? previousArray : stabilizedValue;
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const stabilizedValue = {};
  const canReusePrevious = hasSameObjectKeys(previousValue, value);
  let hasChanged = !canReusePrevious;

  Object.keys(value).forEach((key) => {
    const nextValue = stabilizeRegistryValue(
      value[key],
      `${path}.${key}`,
      functionEntries,
      usedPaths,
      previousValue?.[key],
    );
    stabilizedValue[key] = nextValue;

    if (!canReusePrevious || nextValue !== previousValue[key]) {
      hasChanged = true;
    }
  });

  return !hasChanged ? previousValue : stabilizedValue;
}

export function useStabilizedRegistryConfig(config) {
  const functionEntriesRef = useRef(new Map());
  const stabilizedConfigRef = useRef();

  return useMemo(() => {
    const usedPaths = new Set();
    const stabilizedConfig = stabilizeRegistryValue(
      config,
      'config',
      functionEntriesRef.current,
      usedPaths,
      stabilizedConfigRef.current,
    );

    functionEntriesRef.current.forEach((_entry, path) => {
      if (!usedPaths.has(path)) {
        functionEntriesRef.current.delete(path);
      }
    });

    stabilizedConfigRef.current = stabilizedConfig;
    return stabilizedConfig;
  }, [config]);
}

export const deepCompare = (prev, next) => {
  if (Object.is(prev, next)) return true;

  if (typeof prev !== 'object' || prev === null || typeof next !== 'object' || next === null) {
    return false;
  }

  if (isValidElement(prev) && isValidElement(next)) {
    return prev.type === next.type && prev.key === next.key && deepCompare(prev.props, next.props);
  }

  if (Array.isArray(prev) !== Array.isArray(next)) return false;

  const keys1 = Object.keys(prev);
  const keys2 = Object.keys(next);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(next, key) || !deepCompare(prev[key], next[key])) {
      return false;
    }
  }

  return true;
};
